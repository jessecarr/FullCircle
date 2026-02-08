import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createAdminClient } from '@/lib/supabase/api'
import { searchItems } from '@/lib/lightspeed'

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const supabaseAdmin = createAdminClient()

  const query = request.nextUrl.searchParams.get('q')

  if (!query || query.trim().length < 1) {
    return NextResponse.json({ results: [] })
  }

  try {
    const q = query.trim()

    // Check if it's a numeric ID (exact match on item_id)
    const isNumeric = /^\d+$/.test(q)

    let results: any[] = []

    if (isNumeric) {
      // Exact match on item_id first
      const { data: exactMatch } = await supabaseAdmin
        .from('lightspeed_items')
        .select('item_id, system_sku, description, manufacturer_sku, upc, qoh')
        .eq('item_id', q)
        .limit(1)

      if (exactMatch && exactMatch.length > 0) {
        results = exactMatch
      }
    }

    // If no exact ID match, do partial text search on description, SKU, UPC
    if (results.length === 0) {
      const pattern = `%${q}%`
      const { data, error } = await supabaseAdmin
        .from('lightspeed_items')
        .select('item_id, system_sku, description, manufacturer_sku, upc, qoh')
        .or(`description.ilike.${pattern},manufacturer_sku.ilike.${pattern},upc.ilike.${pattern},system_sku.ilike.${pattern},item_id.ilike.${pattern}`)
        .eq('archived', false)
        .limit(20)

      if (!error && data) {
        results = data
      }
    }

    // Fallback to Lightspeed API if Supabase has no results (table may not be populated yet)
    if (results.length === 0) {
      console.log('[Search] No Supabase results, falling back to Lightspeed API...')
      const apiResults = await searchItems(q)
      return NextResponse.json({
        results: apiResults.map(item => ({
          itemID: item.itemID,
          description: item.description || '',
          systemSku: item.systemSku || '',
          manufacturerSku: item.manufacturerSku || '',
          upc: item.upc || '',
          currentQty: item.currentQty || 0,
        }))
      })
    }

    return NextResponse.json({
      results: results.map(item => ({
        itemID: item.item_id,
        description: item.description || '',
        systemSku: item.system_sku || '',
        manufacturerSku: item.manufacturer_sku || '',
        upc: item.upc || '',
        currentQty: item.qoh || 0,
      }))
    })
  } catch (error) {
    console.error('[Search] Error:', error)
    return NextResponse.json(
      { error: 'Search failed', results: [] },
      { status: 500 }
    )
  }
}
