'use server'

import { createApiClient, createAdminClient } from '@/lib/supabase/api'
import { FFLSyncService } from '@/lib/fflSyncService'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv']

export interface FFLUploadResult {
  success: boolean
  totalProcessed: number
  syncedAt: string
  added: number
  updated: number
  unchanged: number
  errors: string[]
}

export async function uploadFFLFile(formData: FormData): Promise<FFLUploadResult> {
  // Auth check
  const supabase = await createApiClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      totalProcessed: 0,
      syncedAt: new Date().toISOString(),
      added: 0,
      updated: 0,
      unchanged: 0,
      errors: ['Unauthorized'],
    }
  }

  const file = formData.get('file') as File
  if (!file) {
    return {
      success: false,
      totalProcessed: 0,
      syncedAt: new Date().toISOString(),
      added: 0,
      updated: 0,
      unchanged: 0,
      errors: ['No file provided'],
    }
  }

  // Server-side file validation
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      totalProcessed: 0,
      syncedAt: new Date().toISOString(),
      added: 0,
      updated: 0,
      unchanged: 0,
      errors: ['File size exceeds 50MB limit'],
    }
  }

  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      success: false,
      totalProcessed: 0,
      syncedAt: new Date().toISOString(),
      added: 0,
      updated: 0,
      unchanged: 0,
      errors: [`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`],
    }
  }

  try {
    const buffer = await file.arrayBuffer()
    const syncService = new FFLSyncService()
    const result = await syncService.syncFromUploadedFile(buffer)

    // Log audit event
    try {
      const supabaseAdmin = createAdminClient()
      await supabaseAdmin.from('audit_logs').insert({
        action: 'ffl_upload_success',
        resource_type: 'ffl_contacts',
        details: {
          file_name: file.name,
          file_size: file.size,
          records_processed: result.totalProcessed,
          added: result.added,
          updated: result.updated,
          user_id: user.id,
        },
        ip_address: 'server-action',
        user_agent: 'server-action',
      })
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError)
    }

    return result
  } catch (error) {
    console.error('FFL upload error:', error)
    return {
      success: false,
      totalProcessed: 0,
      syncedAt: new Date().toISOString(),
      added: 0,
      updated: 0,
      unchanged: 0,
      errors: [(error as Error).message],
    }
  }
}
