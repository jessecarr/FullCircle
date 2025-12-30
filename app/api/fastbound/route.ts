import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    
    console.log('Fastbound webhook received:', payload)

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook received successfully' 
    })
  } catch (error) {
    console.error('Fastbound webhook error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const apiKey = process.env.FASTBOUND_API_KEY
  const apiUrl = process.env.FASTBOUND_API_URL

  if (!apiKey || !apiUrl) {
    return NextResponse.json(
      { error: 'Fastbound API credentials not configured' },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(`${apiUrl}/acquisitions`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Fastbound API error: ${response.statusText}`)
    }

    const data = await response.json()

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Fastbound API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch from Fastbound' },
      { status: 500 }
    )
  }
}
