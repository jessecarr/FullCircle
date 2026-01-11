// FFL Contact Types for ATF Database Integration

export interface FFLContact {
  id?: string
  license_number: string
  license_name: string
  trade_name: string
  premise_address: string
  premise_city: string
  premise_state: string
  premise_zip: string
  phone: string
  license_type: string
  license_expires: string | null
  business_type: string
  last_synced_at?: string
  created_at?: string
  updated_at?: string
}

export interface ATFRawRecord {
  // ATF Excel columns (may vary slightly between file versions)
  'Lic Regn'?: string
  'Lic Dist'?: string
  'Lic Cnty'?: string
  'Lic Type'?: string
  'Lic Xprdte'?: string
  'Lic Seqn'?: string
  'License Name'?: string
  'Business Name'?: string
  'Premise Street'?: string
  'Premise City'?: string
  'Premise State'?: string
  'Premise Zip Code'?: string
  'Mail Street'?: string
  'Mail City'?: string
  'Mail State'?: string
  'Mail Zip Code'?: string
  'Voice Phone'?: string
}

export interface FFLSyncResult {
  success: boolean
  added: number
  updated: number
  unchanged: number
  errors: string[]
  totalProcessed: number
  syncedAt: string
}

export interface FFLSearchParams {
  query: string
  searchType: 'ffl' | 'name' | 'both'
  limit?: number
  state?: string
}

export interface FFLSearchResult {
  results: FFLContact[]
  total: number
  query: string
}

// Format FFL number from ATF raw data
// ATF format: Region (1) + District (2) + County (3) + Type (2) + Expiration (2) + Sequence (5)
// Display format: X-XX-XXXXX (Region-District+County-Sequence)
export function formatFFLNumber(raw: ATFRawRecord): string {
  const region = raw['Lic Regn'] || ''
  const district = raw['Lic Dist'] || ''
  const county = raw['Lic Cnty'] || ''
  const type = raw['Lic Type'] || ''
  const sequence = raw['Lic Seqn'] || ''
  
  // Full FFL format: X-XX-XXX-XX-XX-XXXXX
  // Simplified display: Region-DistrictCounty-Sequence
  return `${region}-${district}${county}-${sequence}`.trim()
}

// Parse expiration date from ATF format (YYYYMM or similar)
export function parseExpirationDate(expDate: string | undefined): string | null {
  if (!expDate) return null
  
  // ATF typically uses YYYYMM or YYMM format
  const cleaned = expDate.toString().replace(/\D/g, '')
  
  if (cleaned.length === 6) {
    // YYYYMM format
    const year = cleaned.substring(0, 4)
    const month = cleaned.substring(4, 6)
    return `${year}-${month}-01`
  } else if (cleaned.length === 4) {
    // YYMM format
    const year = parseInt(cleaned.substring(0, 2))
    const fullYear = year > 50 ? 1900 + year : 2000 + year
    const month = cleaned.substring(2, 4)
    return `${fullYear}-${month}-01`
  }
  
  return null
}

// Convert ATF raw record to FFLContact
export function convertATFToFFLContact(raw: ATFRawRecord): FFLContact {
  return {
    license_number: formatFFLNumber(raw),
    license_name: (raw['License Name'] || '').toUpperCase().trim(),
    trade_name: (raw['Business Name'] || '').toUpperCase().trim(),
    premise_address: (raw['Premise Street'] || '').toUpperCase().trim(),
    premise_city: (raw['Premise City'] || '').toUpperCase().trim(),
    premise_state: (raw['Premise State'] || '').toUpperCase().trim(),
    premise_zip: (raw['Premise Zip Code'] || '').trim(),
    phone: (raw['Voice Phone'] || '').replace(/\D/g, ''),
    license_type: (raw['Lic Type'] || '').trim(),
    license_expires: parseExpirationDate(raw['Lic Xprdte']),
    business_type: getLicenseTypeDescription(raw['Lic Type'] || '')
  }
}

// Get human-readable license type description
export function getLicenseTypeDescription(typeCode: string): string {
  const types: Record<string, string> = {
    '01': 'Dealer in Firearms',
    '02': 'Pawnbroker in Firearms',
    '03': 'Collector of Curios and Relics',
    '06': 'Manufacturer of Ammunition',
    '07': 'Manufacturer of Firearms',
    '08': 'Importer of Firearms',
    '09': 'Dealer in Destructive Devices',
    '10': 'Manufacturer of Destructive Devices',
    '11': 'Importer of Destructive Devices'
  }
  return types[typeCode] || `Type ${typeCode}`
}
