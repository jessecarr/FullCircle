import * as XLSX from 'xlsx'
import { FFLContact, getLicenseTypeDescription } from './fflTypes'

export interface ParseResult {
  success: boolean
  contacts: FFLContact[]
  totalRecords: number
  errors: string[]
}

// ATF blocks automated downloads - manual download is required
// Direct the user to: https://www.atf.gov/firearms/listing-federal-firearms-licensees
export async function downloadATFDatabase(): Promise<ArrayBuffer> {
  throw new Error(
    'ATF website blocks automated downloads. Please download the FFL list manually from: ' +
    'https://www.atf.gov/firearms/listing-federal-firearms-licensees then use the "Upload FFL File" button.'
  )
}

// Helper to find column index by partial header match
function findColumnIndex(headers: string[], ...searchTerms: string[]): number {
  for (const term of searchTerms) {
    const index = headers.findIndex(h => 
      h && h.toString().toLowerCase().includes(term.toLowerCase())
    )
    if (index !== -1) return index
  }
  return -1
}

// Helper to get cell value safely
function getCellValue(row: any[], index: number): string {
  if (index < 0 || index >= row.length) return ''
  const val = row[index]
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

// Parse Excel buffer into FFL contacts
export function parseATFExcelBuffer(buffer: ArrayBuffer): ParseResult {
  const errors: string[] = []
  const contacts: FFLContact[] = []
  
  try {
    // Read the workbook
    const workbook = XLSX.read(buffer, { type: 'array' })
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      throw new Error('No sheets found in Excel file')
    }
    
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert to array of arrays to handle both headers and data
    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: ''
    })
    
    if (rawData.length < 2) {
      throw new Error('Excel file has no data rows')
    }
    
    // First row is headers
    const headers: string[] = rawData[0].map((h: any) => String(h || '').trim())
    console.log('Headers found:', headers.slice(0, 15))
    
    // ATF Excel format: First 6 columns are FFL number parts (A-F)
    // Columns: Region, District, County, Type, Expiration, Sequence
    // Then: License Name, Business Name, Premise Street, Premise City, Premise State, Premise Zip, etc.
    
    // Map column indices - ATF uses columns A-F for FFL parts
    // The headers for these are typically short abbreviations or empty
    const colMap = {
      // FFL number parts are always columns 0-5 (A-F)
      region: 0,      // Column A
      district: 1,    // Column B  
      county: 2,      // Column C
      type: 3,        // Column D
      expiration: 4,  // Column E
      sequence: 5,    // Column F
      // Find other columns by header name
      licenseName: findColumnIndex(headers, 'license name', 'lic name', 'licensee'),
      businessName: findColumnIndex(headers, 'business name', 'trade name', 'dba'),
      premiseStreet: findColumnIndex(headers, 'premise street', 'premise address', 'street'),
      premiseCity: findColumnIndex(headers, 'premise city', 'city'),
      premiseState: findColumnIndex(headers, 'premise state', 'state'),
      premiseZip: findColumnIndex(headers, 'premise zip', 'zip code', 'zip'),
      phone: findColumnIndex(headers, 'voice phone', 'phone', 'telephone')
    }
    
    console.log('Column mapping:', colMap)
    
    // If we couldn't find key columns, try alternative approach
    // Sometimes ATF files have columns in fixed positions
    if (colMap.licenseName === -1) colMap.licenseName = 6
    if (colMap.businessName === -1) colMap.businessName = 7
    if (colMap.premiseStreet === -1) colMap.premiseStreet = 8
    if (colMap.premiseCity === -1) colMap.premiseCity = 9
    if (colMap.premiseState === -1) colMap.premiseState = 10
    if (colMap.premiseZip === -1) colMap.premiseZip = 11
    if (colMap.phone === -1) colMap.phone = 16
    
    console.log(`Processing ${rawData.length - 1} data rows`)
    
    // Process each data row (skip header row)
    for (let i = 1; i < rawData.length; i++) {
      try {
        const row = rawData[i]
        
        // Build FFL number from first 6 columns
        // Format: Region-District-County-Type-Expiration-Sequence
        // Example: 1-59-109-01-7F-32325
        const region = getCellValue(row, colMap.region)
        const district = getCellValue(row, colMap.district)
        const county = getCellValue(row, colMap.county)
        const licType = getCellValue(row, colMap.type)
        const expiration = getCellValue(row, colMap.expiration)
        const sequence = getCellValue(row, colMap.sequence)
        
        // Skip rows without FFL data
        if (!region || !sequence) {
          continue
        }
        
        // Full FFL format: Region-District-County-Type-Expiration-Sequence
        // Example: 1-59-109-01-7F-32325
        const licenseNumber = `${region}-${district}-${county}-${licType}-${expiration}-${sequence}`
        
        // Skip invalid FFL numbers
        if (!region || !sequence || licenseNumber.length < 10) {
          continue
        }
        
        const contact: FFLContact = {
          license_number: licenseNumber,
          license_name: getCellValue(row, colMap.licenseName).toUpperCase(),
          trade_name: getCellValue(row, colMap.businessName).toUpperCase(),
          premise_address: getCellValue(row, colMap.premiseStreet).toUpperCase(),
          premise_city: getCellValue(row, colMap.premiseCity).toUpperCase(),
          premise_state: getCellValue(row, colMap.premiseState).toUpperCase(),
          premise_zip: getCellValue(row, colMap.premiseZip),
          phone: getCellValue(row, colMap.phone).replace(/\D/g, ''),
          license_type: licType,
          license_expires: null, // ATF expiration format varies
          business_type: getLicenseTypeDescription(licType)
        }
        
        contacts.push(contact)
        
      } catch (recordError) {
        errors.push(`Row ${i + 1}: ${(recordError as Error).message}`)
      }
    }
    
    console.log(`Successfully parsed ${contacts.length} FFL contacts`)
    
    return {
      success: true,
      contacts,
      totalRecords: rawData.length - 1,
      errors
    }
    
  } catch (error) {
    return {
      success: false,
      contacts: [],
      totalRecords: 0,
      errors: [`Failed to parse Excel file: ${(error as Error).message}`]
    }
  }
}

// Parse uploaded file (for manual upload option)
export async function parseUploadedFile(file: File): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    return parseATFExcelBuffer(arrayBuffer)
  } catch (error) {
    return {
      success: false,
      contacts: [],
      totalRecords: 0,
      errors: [`Failed to read uploaded file: ${(error as Error).message}`]
    }
  }
}

// Download and parse ATF database in one step
export async function downloadAndParseATFDatabase(): Promise<ParseResult> {
  try {
    const buffer = await downloadATFDatabase()
    return parseATFExcelBuffer(buffer)
  } catch (error) {
    return {
      success: false,
      contacts: [],
      totalRecords: 0,
      errors: [`Failed to download and parse ATF database: ${(error as Error).message}`]
    }
  }
}
