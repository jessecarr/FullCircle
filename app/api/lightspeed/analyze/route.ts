import { NextRequest, NextResponse } from 'next/server'
import { analyzeItemsFromSupabase, OrderRecommendation } from '@/lib/lightspeed'
import { requireAuth, createAdminClient } from '@/lib/supabase/api'

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const supabaseAdmin = createAdminClient()

  try {
    const { itemIds } = await request.json()

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'Please provide an array of Lightspeed item IDs' },
        { status: 400 }
      )
    }

    if (!process.env.LIGHTSPEED_ACCESS_TOKEN || !process.env.LIGHTSPEED_ACCOUNT_ID) {
      return NextResponse.json(
        { error: 'Lightspeed API credentials not configured' },
        { status: 500 }
      )
    }

    const recommendations: OrderRecommendation[] = await analyzeItemsFromSupabase(itemIds, supabaseAdmin)

    return NextResponse.json({
      success: true,
      data: recommendations,
      summary: {
        totalItems: recommendations.length,
        itemsNeedingReorder: recommendations.filter((r: OrderRecommendation) => r.recommendedOrderQty > 0).length,
        urgentItems: recommendations.filter((r: OrderRecommendation) => r.monthsOfStockLeft < 1 && r.recommendedOrderQty > 0).length,
        totalEstimatedCost: Math.round(recommendations.reduce((sum: number, r: OrderRecommendation) => sum + r.estimatedOrderCost, 0) * 100) / 100,
      },
    })
  } catch (error) {
    console.error('Lightspeed analyze error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze items' },
      { status: 500 }
    )
  }
}
