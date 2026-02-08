import { NextResponse } from 'next/server'
import { requireAuth, createAdminClient } from '@/lib/supabase/api'
import { syncItems } from '@/lib/lightspeed'

export const maxDuration = 300 // 5 minute timeout

export async function POST() {
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

    console.log('[Sync-Items] Starting items catalog sync...')
    let totalItemsSynced = 0

    await syncItems(async (records: any[]) => {
      const { error } = await supabaseAdmin
        .from('lightspeed_items')
        .upsert(records, { onConflict: 'item_id' })

      if (error) {
        console.error('[Sync-Items] Upsert error:', error)
        throw error
      }

      totalItemsSynced += records.length
      console.log(`[Sync-Items] Progress: ${totalItemsSynced} items synced`)
    })

    console.log(`[Sync-Items] Complete: ${totalItemsSynced} items`)

    return NextResponse.json({
      success: true,
      totalItemsSynced,
    })
  } catch (error) {
    console.error('[Sync-Items] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync items catalog' },
      { status: 500 }
    )
  }
}
