import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { type FastBoundItem } from '@/lib/fastbound'

// Webhook endpoint for FastBound to send events to
// URL: https://your-domain.com/api/fastbound/webhook

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature if FastBound provides one
    const signature = request.headers.get('x-fastbound-signature')
    const webhookSecret = process.env.FASTBOUND_WEBHOOK_SECRET
    
    // Optional: Validate signature if you've set up a webhook secret
    if (webhookSecret && signature) {
      // Add signature verification logic here if needed
      console.log('Webhook signature received:', signature)
    }

    const payload = await request.json()
    
    console.log('FastBound webhook received:', JSON.stringify(payload, null, 2))
    
    const eventType = payload.event || payload.eventType || payload.type
    
    if (!eventType) {
      console.log('Unknown webhook format, logging payload')
      return NextResponse.json({ 
        success: true, 
        message: 'Webhook received but event type unknown' 
      })
    }

    // Process different webhook events
    switch (eventType) {
      // Acquisition events - new inventory coming in
      case 'acquisition.committed':
        await handleAcquisitionCommitted(payload)
        break
        
      case 'acquisition.items.added':
        await handleAcquisitionItemsAdded(payload)
        break

      // Disposition events - inventory going out
      case 'disposition.committed':
        await handleDispositionCommitted(payload)
        break
        
      case 'disposition.items.added':
        await handleDispositionItemsAdded(payload)
        break
        
      case 'disposition.items.removed':
        await handleDispositionItemsRemoved(payload)
        break
        
      case 'disposition.items.edited':
        await handleDispositionItemsEdited(payload)
        break

      // Form 4473 events
      case 'form4473.completed':
        await handleForm4473Completed(payload)
        break

      // Item events
      case 'item.created':
      case 'item.updated':
        await handleItemUpdated(payload)
        break
        
      case 'item.deleted':
        await handleItemDeleted(payload)
        break

      default:
        console.log(`Unhandled webhook event type: ${eventType}`)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully',
      eventType 
    })
  } catch (error) {
    console.error('FastBound webhook error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

// Handle acquisition committed - new items are officially in inventory
async function handleAcquisitionCommitted(payload: any) {
  console.log('Processing acquisition.committed event')
  
  const acquisition = payload.acquisition || payload
  const items = acquisition.items || payload.items || []
  
  if (items.length > 0) {
    await upsertItems(items, 'in_stock')
  }
  
  // Log the acquisition
  await logWebhookEvent('acquisition.committed', payload)
}

// Handle items added to acquisition
async function handleAcquisitionItemsAdded(payload: any) {
  console.log('Processing acquisition.items.added event')
  
  const items = payload.items || []
  
  if (items.length > 0) {
    // Items added but acquisition not committed yet - status is 'pending'
    await upsertItems(items, 'pending_acquisition')
  }
  
  await logWebhookEvent('acquisition.items.added', payload)
}

// Handle disposition committed - items have left inventory
async function handleDispositionCommitted(payload: any) {
  console.log('Processing disposition.committed event')
  
  const disposition = payload.disposition || payload
  const items = disposition.items || payload.items || []
  
  for (const item of items) {
    const itemId = item.id || item.itemId
    if (itemId) {
      await updateItemStatus(itemId, 'disposed', {
        disposition_date: new Date().toISOString(),
        disposition_type: disposition.type || null
      })
    }
  }
  
  await logWebhookEvent('disposition.committed', payload)
}

// Handle items added to disposition
async function handleDispositionItemsAdded(payload: any) {
  console.log('Processing disposition.items.added event')
  
  const items = payload.items || []
  
  for (const item of items) {
    const itemId = item.id || item.itemId
    if (itemId) {
      await updateItemStatus(itemId, 'pending_disposition')
    }
  }
  
  await logWebhookEvent('disposition.items.added', payload)
}

// Handle items removed from disposition
async function handleDispositionItemsRemoved(payload: any) {
  console.log('Processing disposition.items.removed event')
  
  const items = payload.items || []
  
  for (const item of items) {
    const itemId = item.id || item.itemId
    if (itemId) {
      // Item removed from disposition, back to in_stock
      await updateItemStatus(itemId, 'in_stock')
    }
  }
  
  await logWebhookEvent('disposition.items.removed', payload)
}

// Handle items edited on disposition
async function handleDispositionItemsEdited(payload: any) {
  console.log('Processing disposition.items.edited event')
  
  const items = payload.items || []
  
  for (const item of items) {
    if (item.price !== undefined) {
      const itemId = item.id || item.itemId
      if (itemId) {
        await supabase
          .from('fastbound_inventory')
          .update({ price: item.price, updated_at: new Date().toISOString() })
          .eq('fastbound_item_id', itemId)
      }
    }
  }
  
  await logWebhookEvent('disposition.items.edited', payload)
}

// Handle Form 4473 completed
async function handleForm4473Completed(payload: any) {
  console.log('Processing form4473.completed event')
  
  // Log the 4473 completion - you may want to store this separately
  await logWebhookEvent('form4473.completed', payload)
}

// Handle item created or updated
async function handleItemUpdated(payload: any) {
  console.log('Processing item update event')
  
  const item = payload.item || payload
  
  if (item.id) {
    await upsertItems([item], item.isDisposed ? 'disposed' : 'in_stock')
  }
  
  await logWebhookEvent('item.updated', payload)
}

// Handle item deleted
async function handleItemDeleted(payload: any) {
  console.log('Processing item.deleted event')
  
  const itemId = payload.itemId || payload.item?.id
  
  if (itemId) {
    await updateItemStatus(itemId, 'deleted')
  }
  
  await logWebhookEvent('item.deleted', payload)
}

// Helper: Upsert items to Supabase
// FastBound API field mapping:
// - serial (not serialNumber)
// - itemNumber (control number)
// - acquire_Date (acquisition date)
// - disposed (boolean for disposal status)
async function upsertItems(items: any[], defaultStatus: string) {
  const mappedItems = items.map(item => ({
    fastbound_item_id: item.id,
    fastbound_acquisition_id: item.acquisitionContactId || null,
    control_number: item.itemNumber || item.externalId || item.sku || null,
    firearm_type: item.type || '',
    manufacturer: item.manufacturer || '',
    model: item.model || '',
    caliber: item.caliber || '',
    serial_number: item.serial || '',
    date_acquired: item.acquire_Date || null,
    status: item.disposed ? 'disposed' : defaultStatus,
    price: item.price || item.cost || null,
    notes: null,
    metadata: {
      condition: item.condition,
      location: item.location,
      mpn: item.mpn,
      upc: item.upc,
      countryOfManufacture: item.countryOfManufacture,
      importer: item.importer,
      itemNumber: item.itemNumber,
      ttsn: item.ttsn,
      otsn: item.otsn,
      acquisitionType: item.acquisitionType,
      dispositionType: item.dispositionType,
    }
  }))

  const { error } = await supabase
    .from('fastbound_inventory')
    .upsert(mappedItems, { 
      onConflict: 'fastbound_item_id',
      ignoreDuplicates: false 
    })

  if (error) {
    console.error('Supabase upsert error:', error)
    throw new Error(`Failed to upsert items: ${error.message}`)
  }
  
  console.log(`Upserted ${mappedItems.length} items to Supabase`)
}

// Helper: Update item status
async function updateItemStatus(fastboundItemId: string, status: string, extraData?: object) {
  const updateData: any = { 
    status, 
    updated_at: new Date().toISOString(),
    ...extraData
  }

  const { error } = await supabase
    .from('fastbound_inventory')
    .update(updateData)
    .eq('fastbound_item_id', fastboundItemId)

  if (error) {
    console.error('Supabase update error:', error)
    throw new Error(`Failed to update item status: ${error.message}`)
  }
  
  console.log(`Updated item ${fastboundItemId} status to ${status}`)
}

// Helper: Log webhook events for debugging/auditing
async function logWebhookEvent(eventType: string, payload: any) {
  // You could create a webhook_logs table to store these
  console.log(`Webhook event logged: ${eventType}`, {
    timestamp: new Date().toISOString(),
    eventType,
    payloadSummary: JSON.stringify(payload).slice(0, 500)
  })
}

// GET endpoint for webhook verification (if FastBound requires it)
export async function GET(request: NextRequest) {
  // Some webhook systems require a GET endpoint for verification
  const challenge = request.nextUrl.searchParams.get('challenge')
  
  if (challenge) {
    return NextResponse.json({ challenge })
  }
  
  return NextResponse.json({ 
    status: 'ok',
    message: 'FastBound webhook endpoint is active',
    supportedEvents: [
      'acquisition.committed',
      'acquisition.items.added',
      'disposition.committed',
      'disposition.items.added',
      'disposition.items.removed',
      'disposition.items.edited',
      'form4473.completed',
      'item.created',
      'item.updated',
      'item.deleted'
    ]
  })
}
