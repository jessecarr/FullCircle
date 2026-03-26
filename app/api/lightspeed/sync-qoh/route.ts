import { NextResponse } from 'next/server'
import { requireAuth, createAdminClient } from '@/lib/supabase/api'
import { syncItemShopQOH } from '@/lib/lightspeed'

export const maxDuration = 300 // 5 minutes max

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const supabaseAdmin = createAdminClient()

  try {
    let body: { type?: string } = {}
    try {
      body = await request.json()
    } catch {
      // No body provided, default to incremental
    }
    const syncType = body.type || 'incremental'

    // Get last sync timestamp for incremental syncs
    let sinceTimestamp: string | undefined
    if (syncType === 'incremental') {
      const { data: lastSync } = await supabaseAdmin
        .from('lightspeed_qoh_sync_status')
        .select('last_qoh_timestamp')
        .not('completed_at', 'is', null)
        .not('last_qoh_timestamp', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single()

      if (lastSync?.last_qoh_timestamp) {
        sinceTimestamp = lastSync.last_qoh_timestamp
        console.log(`[Sync-QOH] Incremental sync since: ${sinceTimestamp}`)
      } else {
        console.log('[Sync-QOH] No previous sync found, doing full sync')
      }
    } else {
      console.log('[Sync-QOH] Full sync requested')
    }

    let latestTimestamp: string | null = null
    let totalRecords = 0

    // Sync QOH from ItemShop and update lightspeed_items table
    const result = await syncItemShopQOH(async (records) => {
      // Update QOH in lightspeed_items table
      for (const record of records) {
        const { error } = await supabaseAdmin
          .from('lightspeed_items')
          .update({ qoh: record.qoh, updated_at: new Date().toISOString() })
          .eq('item_id', record.item_id)

        if (error) {
          console.error(`[Sync-QOH] Error updating item ${record.item_id}:`, error)
        }
      }

      totalRecords += records.length

      // Track latest timestamp
      for (const r of records) {
        // The timestamp is tracked in the sync function
      }
    }, sinceTimestamp)

    latestTimestamp = result.latestTimestamp

    // Record sync status
    await supabaseAdmin
      .from('lightspeed_qoh_sync_status')
      .insert({
        sync_type: sinceTimestamp ? 'incremental' : 'full',
        records_synced: totalRecords,
        last_qoh_timestamp: latestTimestamp,
        completed_at: new Date().toISOString(),
      })

    return NextResponse.json({
      success: true,
      type: sinceTimestamp ? 'incremental' : 'full',
      totalRecords,
      totalPages: result.totalPages,
      latestTimestamp,
    })
  } catch (error) {
    console.error('QOH sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync QOH data' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const supabaseAdmin = createAdminClient()

  try {
    const { data: lastSync } = await supabaseAdmin
      .from('lightspeed_qoh_sync_status')
      .select('*')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      lastSync,
    })
  } catch (error) {
    console.error('QOH sync status error:', error)
    return NextResponse.json(
      { error: 'Failed to get QOH sync status' },
      { status: 500 }
    )
  }
}
