// FastBound API Types
export interface FastBoundItem {
  id: string
  acquisitionId?: string
  externalId?: string
  manufacturer: string
  countryOfManufacture?: string
  importer?: string
  model: string
  caliber: string
  type: string
  serialNumber: string
  condition?: string
  cost?: number
  price?: number
  mpn?: string
  upc?: string
  sku?: string
  location?: string
  note?: string
  ttsn?: string
  otsn?: string
  acquisitionDate?: string
  dispositionDate?: string
  isDisposed?: boolean
}

export interface FastBoundAcquisition {
  id: string
  externalId?: string
  contactId?: string
  type?: string
  purchaseDate?: string
  invoiceNumber?: string
  shipmentTrackingNumber?: string
  note?: string
  items?: FastBoundItem[]
  isCommitted?: boolean
  committedDate?: string
}

export interface FastBoundWebhook {
  id?: string
  url: string
  events: string[]
  isActive?: boolean
}

export interface FastBoundContact {
  id: string
  fflNumber?: string
  fflExpires?: string
  licenseName?: string
  tradeName?: string
  firstName?: string
  lastName?: string
  organizationName?: string
  premiseAddress1: string
  premiseCity: string
  premiseState: string
  premiseZipCode: string
  premiseCountry: string
}

// FastBound API Client Class
export class FastBoundClient {
  private baseUrl: string
  private apiKey: string
  private accountNumber: string

  constructor() {
    this.baseUrl = 'https://cloud.fastbound.com'
    this.apiKey = process.env.FASTBOUND_API_KEY || ''
    this.accountNumber = process.env.FASTBOUND_ACCOUNT_NUMBER || ''
  }

  private getAuthHeader(): string {
    // FastBound uses HTTP Basic Auth with Account Number as username and API Key as password
    const credentials = Buffer.from(`${this.accountNumber}:${this.apiKey}`).toString('base64')
    return `Basic ${credentials}`
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // URL format: https://cloud.fastbound.com/{accountNumber}/api/{endpoint}
    const url = `${this.baseUrl}/${this.accountNumber}/api${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`FastBound API error (${response.status}): ${errorText}`)
    }

    return response.json()
  }

  // Get all items (inventory)
  async getItems(params?: {
    take?: number
    skip?: number
    search?: string
    isDisposed?: boolean
  }): Promise<FastBoundItem[]> {
    const queryParams = new URLSearchParams()
    if (params?.take) queryParams.set('take', params.take.toString())
    if (params?.skip) queryParams.set('skip', params.skip.toString())
    if (params?.search) queryParams.set('search', params.search)
    if (params?.isDisposed !== undefined) queryParams.set('isDisposed', params.isDisposed.toString())

    const query = queryParams.toString()
    const endpoint = `/Items${query ? `?${query}` : ''}`
    
    const response = await this.request<{ items: FastBoundItem[] }>(endpoint)
    return response.items || []
  }

  // Get a single item by ID
  async getItem(itemId: string): Promise<FastBoundItem> {
    return this.request<FastBoundItem>(`/Items/${itemId}`)
  }

  // Get all acquisitions
  async getAcquisitions(params?: {
    take?: number
    skip?: number
    isCommitted?: boolean
  }): Promise<FastBoundAcquisition[]> {
    const queryParams = new URLSearchParams()
    if (params?.take) queryParams.set('take', params.take.toString())
    if (params?.skip) queryParams.set('skip', params.skip.toString())
    if (params?.isCommitted !== undefined) queryParams.set('isCommitted', params.isCommitted.toString())

    const query = queryParams.toString()
    const endpoint = `/Acquisitions${query ? `?${query}` : ''}`
    
    const response = await this.request<{ acquisitions: FastBoundAcquisition[] }>(endpoint)
    return response.acquisitions || []
  }

  // Get a single acquisition by ID
  async getAcquisition(acquisitionId: string): Promise<FastBoundAcquisition> {
    return this.request<FastBoundAcquisition>(`/Acquisitions/${acquisitionId}`)
  }

  // Create a webhook subscription
  async createWebhook(webhook: FastBoundWebhook): Promise<FastBoundWebhook> {
    return this.request<FastBoundWebhook>('/Webhooks', {
      method: 'POST',
      body: JSON.stringify(webhook),
    })
  }

  // Get all webhooks
  async getWebhooks(): Promise<FastBoundWebhook[]> {
    const response = await this.request<{ webhooks: FastBoundWebhook[] }>('/Webhooks')
    return response.webhooks || []
  }

  // Delete a webhook
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.request(`/Webhooks/${webhookId}`, {
      method: 'DELETE',
    })
  }

  // Get contacts
  async getContacts(params?: {
    take?: number
    skip?: number
    search?: string
  }): Promise<FastBoundContact[]> {
    const queryParams = new URLSearchParams()
    if (params?.take) queryParams.set('take', params.take.toString())
    if (params?.skip) queryParams.set('skip', params.skip.toString())
    if (params?.search) queryParams.set('search', params.search)

    const query = queryParams.toString()
    const endpoint = `/Contacts${query ? `?${query}` : ''}`
    
    const response = await this.request<{ contacts: FastBoundContact[] }>(endpoint)
    return response.contacts || []
  }
}

// Singleton instance
let fastBoundClient: FastBoundClient | null = null

export function getFastBoundClient(): FastBoundClient {
  if (!fastBoundClient) {
    fastBoundClient = new FastBoundClient()
  }
  return fastBoundClient
}

// Helper function for client-side use
export async function fetchFastboundData(): Promise<FastBoundItem[]> {
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

// Map FastBound item to your form format
export function mapFastboundToForm(item: FastBoundItem) {
  return {
    fastbound_item_id: item.id,
    control_number: item.externalId || item.sku || '',
    manufacturer: item.manufacturer || '',
    model: item.model || '',
    caliber: item.caliber || '',
    serial_number: item.serialNumber || '',
    firearm_type: item.type || '',
    price: item.price || item.cost || 0,
    date_acquired: item.acquisitionDate || null,
  }
}
