import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createAdminClient } from '@/lib/supabase/api'
import { syncInventoryLog } from '@/lib/lightspeed'

export const maxDuration = 300 // 5 minute timeout

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const supabaseAdmin = createAdminClient()

  try {
    const { type = 'incremental' } = await request.json()

    if (!process.env.LIGHTSPEED_ACCESS_TOKEN || !process.env.LIGHTSPEED_ACCOUNT_ID) {
      return NextResponse.json(
        { error: 'Lightspeed API credentials not configured' },
        { status: 500 }
      )
    }

    // Get last sync timestamp for incremental syncs
    let sinceTimestamp: string | undefined

    if (type === 'incremental') {
      const { data: lastSync } = await supabaseAdmin
        .from('lightspeed_sync_status')
        .select('last_sale_timestamp')
        .not('completed_at', 'is', null)
        .not('last_sale_timestamp', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single()

      if (lastSync?.last_sale_timestamp) {
        sinceTimestamp = lastSync.last_sale_timestamp
        console.log(`[Sync] Incremental sync since: ${sinceTimestamp}`)
      } else {
        console.log('[Sync] No previous sync found, doing full sync')
      }
    } else {
      console.log('[Sync] Full sync requested')
    }

    // Create sync record
    const { data: syncRecord } = await supabaseAdmin
      .from('lightspeed_sync_status')
      .insert({
        sync_type: sinceTimestamp ? 'incremental' : 'full',
      })
      .select()
      .single()

    let latestTimestamp: string | null = null
    let totalRecords = 0

    // Fetch InventoryLog from Lightspeed and insert into Supabase page by page
    const result = await syncInventoryLog(async (records) => {
      const { error } = await supabaseAdmin
        .from('lightspeed_inventory_log')
        .upsert(records, { onConflict: 'inventory_log_id' })

      if (error) {
        console.error('[Sync] Supabase insert error:', error)
        throw error
      }

      totalRecords += records.length

      for (const r of records) {
        if (!latestTimestamp || r.create_time > latestTimestamp) {
          latestTimestamp = r.create_time
        }
      }
    }, sinceTimestamp)

    // Update sync status
    if (syncRecord) {
      await supabaseAdmin
        .from('lightspeed_sync_status')
        .update({
          last_sale_timestamp: latestTimestamp,
          records_synced: totalRecords,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncRecord.id)
    }

    return NextResponse.json({
      success: true,
      type: sinceTimestamp ? 'incremental' : 'full',
      totalRecords,
      totalPages: result.totalPages,
      latestTimestamp,
    })
  } catch (error) {
    console.error('Lightspeed sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync inventory data' },
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
      .from('lightspeed_sync_status')
      .select('*')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    const { count } = await supabaseAdmin
      .from('lightspeed_inventory_log')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      lastSync,
      totalRecords: count || 0,
    })
  } catch (error) {
    console.error('Sync status error:', error)
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}
