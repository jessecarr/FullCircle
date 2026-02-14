import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createAdminClient } from '@/lib/supabase/api'
import { syncItems } from '@/lib/lightspeed'

export const maxDuration = 300 // 5 minute timeout

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const supabaseAdmin = createAdminClient()

  try {
    if (!process.env.LIGHTSPEED_ACCESS_TOKEN || !process.env.LIGHTSPEED_ACCOUNT_ID) {
      return NextResponse.json(
        { error: 'Lightspeed API credentials not configured' },
        { status: 500 }
      )
    }

    // Check for incremental sync request
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
        .from('lightspeed_items_sync_status')
        .select('last_item_timestamp')
        .not('last_item_timestamp', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single()

      if (lastSync?.last_item_timestamp) {
        sinceTimestamp = lastSync.last_item_timestamp
        console.log(`[Sync-Items] Incremental sync since: ${sinceTimestamp}`)
      } else {
        console.log('[Sync-Items] No previous sync found, doing full sync')
      }
    } else {
      console.log('[Sync-Items] Full sync requested')
    }

    let totalItemsSynced = 0

    const result = await syncItems(async (records: any[]) => {
      const { error } = await supabaseAdmin
        .from('lightspeed_items')
        .upsert(records, { onConflict: 'item_id' })

      if (error) {
        console.error('[Sync-Items] Upsert error:', error)
        throw error
      }

      totalItemsSynced += records.length
      console.log(`[Sync-Items] Progress: ${totalItemsSynced} items synced`)
    }, sinceTimestamp)

    // Record sync status
    await supabaseAdmin
      .from('lightspeed_items_sync_status')
      .insert({
        sync_type: sinceTimestamp ? 'incremental' : 'full',
        items_synced: totalItemsSynced,
        last_item_timestamp: result.latestTimestamp,
        completed_at: new Date().toISOString(),
      })

    console.log(`[Sync-Items] Complete: ${totalItemsSynced} items`)

    return NextResponse.json({
      success: true,
      totalItemsSynced,
      syncType: sinceTimestamp ? 'incremental' : 'full',
      latestTimestamp: result.latestTimestamp,
    })
  } catch (error) {
    console.error('[Sync-Items] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync items catalog' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const supabaseAdmin = createAdminClient()

  try {
    // Get last sync info
    const { data: lastSync } = await supabaseAdmin
      .from('lightspeed_items_sync_status')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    // Get total items count
    const { count } = await supabaseAdmin
      .from('lightspeed_items')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      lastSync,
      totalItems: count || 0,
    })
  } catch (error) {
    console.error('[Sync-Items] Status error:', error)
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}
