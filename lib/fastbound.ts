export interface FastboundFirearm {
  id: string
  manufacturer: string
  model: string
  caliber: string
  serial_number: string
  type: string
  acquisition_date?: string
  disposition_date?: string
}

export async function fetchFastboundData(): Promise<FastboundFirearm[]> {
  try {
    const response = await fetch('/api/fastbound')
    
    if (!response.ok) {
      throw new Error('Failed to fetch Fastbound data')
    }

    const result = await response.json()
    return result.data || []
  } catch (error) {
    console.error('Error fetching Fastbound data:', error)
    return []
  }
}

export function mapFastboundToForm(firearm: FastboundFirearm) {
  return {
    manufacturer: firearm.manufacturer || '',
    model: firearm.model || '',
    caliber: firearm.caliber || '',
    serial_number: firearm.serial_number || '',
    firearm_type: firearm.type || '',
  }
}
