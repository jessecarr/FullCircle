import { NextRequest, NextResponse } from 'next/server'
import { searchFFLContacts, getFFLByLicenseNumber } from '@/lib/fflSyncService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const searchType = (searchParams.get('type') as 'ffl' | 'name' | 'both') || 'both'
    const limit = parseInt(searchParams.get('limit') || '20')
    const state = searchParams.get('state') || undefined

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        results: [],
        total: 0,
        query: ''
      })
    }

    const results = await searchFFLContacts(query, {
      searchType,
      limit,
      state
    })

    return NextResponse.json({
      success: true,
      results,
      total: results.length,
      query
    })

  } catch (error) {
    console.error('FFL search error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message, results: [], total: 0 },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { licenseNumber } = body

    if (!licenseNumber) {
      return NextResponse.json(
        { success: false, error: 'License number required' },
        { status: 400 }
      )
    }

    const ffl = await getFFLByLicenseNumber(licenseNumber)

    if (!ffl) {
      return NextResponse.json({
        success: false,
        error: 'FFL not found',
        ffl: null
      })
    }

    return NextResponse.json({
      success: true,
      ffl
    })

  } catch (error) {
    console.error('FFL lookup error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
