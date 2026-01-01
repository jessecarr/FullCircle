import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getFastBoundClient, mapFastboundToForm, type FastBoundItem } from '@/lib/fastbound'

// GET - Fetch items from FastBound
export async function GET(request: NextRequest) {
  const apiKey = process.env.FASTBOUND_API_KEY
  const accountNumber = process.env.FASTBOUND_ACCOUNT_NUMBER

  if (!apiKey || !accountNumber) {
    return NextResponse.json(
      { error: 'FastBound API credentials not configured. Please set FASTBOUND_API_KEY and FASTBOUND_ACCOUNT_NUMBER.' },
      { status: 500 }
    )
  }

  try {
    const client = getFastBoundClient()
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const take = searchParams.get('take') ? parseInt(searchParams.get('take')!) : 100
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : 0
    const search = searchParams.get('search') || undefined
    const isDisposed = searchParams.get('isDisposed') === 'true' ? true : 
                       searchParams.get('isDisposed') === 'false' ? false : undefined

    const items = await client.getItems({ take, skip, search, isDisposed })

    return NextResponse.json({ 
      success: true, 
      data: items,
      count: items.length 
    })
  } catch (error) {
    console.error('FastBound API error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch from FastBound' },
      { status: 500 }
    )
  }
}

// POST - Sync FastBound items to Supabase OR handle webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Check if this is a webhook payload (has event type)
    if (body.event || body.eventType) {
      return handleWebhook(body)
    }
    
    // Otherwise, treat as sync request
    return syncToSupabase(body)
  } catch (error) {
    console.error('FastBound POST error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    )
  }
}

// Handle webhook events from FastBound
async function handleWebhook(payload: any) {
  console.log('FastBound webhook received:', JSON.stringify(payload, null, 2))
  
  const eventType = payload.event || payload.eventType
  
  switch (eventType) {
    case 'acquisition.committed':
    case 'acquisition.items.added':
      // New items acquired - add to Supabase
      if (payload.items && Array.isArray(payload.items)) {
        await upsertItemsToSupabase(payload.items)
      }
      break
      
    case 'disposition.committed':
    case 'disposition.items.added':
      // Items disposed - update status in Supabase
      if (payload.items && Array.isArray(payload.items)) {
        for (const item of payload.items) {
          await updateItemStatus(item.id, 'disposed')
        }
      }
      break
      
    case 'item.updated':
      // Item updated - update in Supabase
      if (payload.item) {
        await upsertItemsToSupabase([payload.item])
      }
      break
      
    default:
      console.log(`Unhandled webhook event type: ${eventType}`)
  }

  return NextResponse.json({ 
    success: true, 
    message: 'Webhook processed successfully',
    eventType 
  })
}

// Sync items from FastBound to Supabase
async function syncToSupabase(body: { fullSync?: boolean }) {
  const apiKey = process.env.FASTBOUND_API_KEY
  const accountNumber = process.env.FASTBOUND_ACCOUNT_NUMBER

  if (!apiKey || !accountNumber) {
    return NextResponse.json(
      { error: 'FastBound API credentials not configured' },
      { status: 500 }
    )
  }

  try {
    const client = getFastBoundClient()
    
    // Fetch all non-disposed items from FastBound
    const allItems: FastBoundItem[] = []
    let skip = 0
    const take = 100
    
    while (true) {
      const items = await client.getItems({ 
        take, 
        skip, 
        isDisposed: false 
      })
      
      if (items.length === 0) break
      
      allItems.push(...items)
      skip += take
      
      // Safety limit
      if (skip > 10000) break
    }

    // Upsert all items to Supabase
    const result = await upsertItemsToSupabase(allItems)

    return NextResponse.json({ 
      success: true, 
      message: `Synced ${allItems.length} items from FastBound to Supabase`,
      itemCount: allItems.length,
      ...result
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to sync' },
      { status: 500 }
    )
  }
}

// Helper: Upsert items to Supabase
async function upsertItemsToSupabase(items: FastBoundItem[]) {
  const mappedItems = items.map(item => ({
    fastbound_item_id: item.id,
    fastbound_acquisition_id: item.acquisitionId || null,
    control_number: item.externalId || item.sku || null,
    firearm_type: item.type,
    manufacturer: item.manufacturer,
    model: item.model,
    caliber: item.caliber,
    serial_number: item.serialNumber,
    date_acquired: item.acquisitionDate || null,
    status: item.isDisposed ? 'disposed' : 'in_stock',
    price: item.price || item.cost || null,
    notes: item.note || null,
    metadata: {
      condition: item.condition,
      location: item.location,
      mpn: item.mpn,
      upc: item.upc,
      countryOfManufacture: item.countryOfManufacture,
      importer: item.importer,
    }
  }))

  const { data, error } = await supabase
    .from('fastbound_inventory')
    .upsert(mappedItems, { 
      onConflict: 'fastbound_item_id',
      ignoreDuplicates: false 
    })
    .select()

  if (error) {
    console.error('Supabase upsert error:', error)
    throw new Error(`Failed to upsert to Supabase: ${error.message}`)
  }

  return { upserted: mappedItems.length, data }
}

// Helper: Update item status in Supabase
async function updateItemStatus(fastboundItemId: string, status: string) {
  const { error } = await supabase
    .from('fastbound_inventory')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('fastbound_item_id', fastboundItemId)

  if (error) {
    console.error('Supabase update error:', error)
    throw new Error(`Failed to update item status: ${error.message}`)
  }
}
