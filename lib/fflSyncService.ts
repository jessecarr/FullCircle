import { supabase, supabaseAdmin } from './supabase'
import { FFLContact, FFLSyncResult } from './fflTypes'
import { downloadAndParseATFDatabase, parseATFExcelBuffer } from './atfParser'

const BATCH_SIZE = 500 // Number of records to upsert at once

export class FFLSyncService {
  private onProgress?: (message: string, progress: number) => void

  constructor(onProgress?: (message: string, progress: number) => void) {
    this.onProgress = onProgress
  }

  private reportProgress(message: string, progress: number) {
    console.log(`[FFL Sync] ${message} (${progress}%)`)
    this.onProgress?.(message, progress)
  }

  // Sync from ATF website download
  async syncFromATFWebsite(): Promise<FFLSyncResult> {
    this.reportProgress('Downloading ATF FFL database...', 5)
    
    const parseResult = await downloadAndParseATFDatabase()
    
    if (!parseResult.success) {
      return {
        success: false,
        added: 0,
        updated: 0,
        unchanged: 0,
        errors: parseResult.errors,
        totalProcessed: 0,
        syncedAt: new Date().toISOString()
      }
    }

    return this.syncContacts(parseResult.contacts)
  }

  // Sync from uploaded file buffer
  async syncFromUploadedFile(buffer: ArrayBuffer): Promise<FFLSyncResult> {
    this.reportProgress('Parsing uploaded FFL file...', 5)
    
    const parseResult = parseATFExcelBuffer(buffer)
    
    if (!parseResult.success) {
      return {
        success: false,
        added: 0,
        updated: 0,
        unchanged: 0,
        errors: parseResult.errors,
        totalProcessed: 0,
        syncedAt: new Date().toISOString()
      }
    }

    return this.syncContacts(parseResult.contacts)
  }

  // Core sync logic - upsert contacts to Supabase
  private async syncContacts(contacts: FFLContact[]): Promise<FFLSyncResult> {
    const errors: string[] = []
    let added = 0
    let updated = 0
    let unchanged = 0
    const totalContacts = contacts.length

    this.reportProgress(`Processing ${totalContacts} FFL contacts...`, 10)

    // Process in batches
    for (let i = 0; i < totalContacts; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE)
      const progress = Math.round(10 + (i / totalContacts) * 85)
      
      this.reportProgress(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}...`, progress)

      try {
        // Prepare records for upsert
        const records = batch.map(contact => ({
          license_number: contact.license_number,
          license_name: contact.license_name,
          trade_name: contact.trade_name,
          premise_address: contact.premise_address,
          premise_city: contact.premise_city,
          premise_state: contact.premise_state,
          premise_zip: contact.premise_zip,
          phone: contact.phone,
          license_type: contact.license_type,
          license_expires: contact.license_expires,
          business_type: contact.business_type,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))

        // Upsert batch - update on conflict with license_number
        // Use supabaseAdmin to bypass RLS for bulk import
        const { data, error } = await supabaseAdmin
          .from('ffl_contacts')
          .upsert(records, {
            onConflict: 'license_number',
            ignoreDuplicates: false
          })
          .select()

        if (error) {
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
        } else {
          // Count results (upsert doesn't distinguish between insert/update)
          added += batch.length
        }

      } catch (batchError) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${(batchError as Error).message}`)
      }
    }

    this.reportProgress('Sync completed!', 100)

    return {
      success: errors.length === 0,
      added,
      updated,
      unchanged,
      errors,
      totalProcessed: totalContacts,
      syncedAt: new Date().toISOString()
    }
  }

  // Get sync statistics
  async getSyncStats(): Promise<{
    totalRecords: number
    lastSyncedAt: string | null
    oldestRecord: string | null
    newestRecord: string | null
  }> {
    const { count } = await supabase
      .from('ffl_contacts')
      .select('*', { count: 'exact', head: true })

    const { data: lastSynced } = await supabase
      .from('ffl_contacts')
      .select('last_synced_at')
      .order('last_synced_at', { ascending: false })
      .limit(1)
      .single()

    const { data: oldest } = await supabase
      .from('ffl_contacts')
      .select('created_at')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    const { data: newest } = await supabase
      .from('ffl_contacts')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return {
      totalRecords: count || 0,
      lastSyncedAt: lastSynced?.last_synced_at || null,
      oldestRecord: oldest?.created_at || null,
      newestRecord: newest?.created_at || null
    }
  }
}

// Search FFL contacts in database
export async function searchFFLContacts(
  query: string,
  options: {
    searchType?: 'ffl' | 'name' | 'both'
    limit?: number
    state?: string
  } = {}
): Promise<FFLContact[]> {
  const { searchType = 'both', limit = 20, state } = options
  const trimmedQuery = query.trim().toUpperCase()

  if (!trimmedQuery) {
    return []
  }

  // Use supabaseAdmin to bypass RLS for searches
  let queryBuilder = supabaseAdmin
    .from('ffl_contacts')
    .select('*')

  // Determine search type based on query format
  // FFL format: X-XX-XXX-XX-XX-XXXXX (contains dashes and numbers)
  const looksLikeFFL = trimmedQuery.includes('-') && /\d/.test(trimmedQuery)

  if (searchType === 'ffl' || (searchType === 'both' && looksLikeFFL)) {
    // Check if it's the shortened X-XX-XXXXX format (3 parts)
    const parts = trimmedQuery.split('-')
    
    if (parts.length === 3) {
      // Shortened format: X-XX-XXXXX (region-district-sequence)
      // Full format is: X-XX-XXX-XX-XX-XXXXX (region-district-county-type-exp-sequence)
      // Search where first part matches region, second matches district, last matches sequence
      const [region, district, sequence] = parts
      
      // Build pattern: region-district%-%-%-%-sequence
      // This matches: 1-59-???-??-??-32325 when searching for 1-59-32325
      const pattern = `${region}-${district}%-%-%-${sequence}`
      queryBuilder = queryBuilder.ilike('license_number', pattern)
    } else {
      // Full or partial FFL number match using ilike
      queryBuilder = queryBuilder.ilike('license_number', `%${trimmedQuery}%`)
    }
  } else if (searchType === 'name' || (searchType === 'both' && !looksLikeFFL)) {
    // Name search - check both license_name and trade_name
    queryBuilder = queryBuilder.or(
      `license_name.ilike.%${trimmedQuery}%,trade_name.ilike.%${trimmedQuery}%`
    )
  }

  // Filter by state if provided
  if (state) {
    queryBuilder = queryBuilder.eq('premise_state', state.toUpperCase())
  }

  // Order by name and limit results
  queryBuilder = queryBuilder
    .order('license_name', { ascending: true })
    .limit(limit)

  const { data, error } = await queryBuilder

  if (error) {
    console.error('FFL search error:', error)
    return []
  }

  return data || []
}

// Get a single FFL by license number
export async function getFFLByLicenseNumber(licenseNumber: string): Promise<FFLContact | null> {
  // Use supabaseAdmin to bypass RLS
  const { data, error } = await supabaseAdmin
    .from('ffl_contacts')
    .select('*')
    .eq('license_number', licenseNumber.toUpperCase().trim())
    .single()

  if (error || !data) {
    return null
  }

  return data
}
