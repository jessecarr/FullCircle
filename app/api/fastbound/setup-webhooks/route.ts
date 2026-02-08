import { NextRequest, NextResponse } from 'next/server'
import { getFastBoundClient } from '@/lib/fastbound'
import { requireAdmin } from '@/lib/supabase/api'

// API to setup webhooks in FastBound
// This registers your webhook URL with FastBound so they send events to your app

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const apiKey = process.env.FASTBOUND_API_KEY
  const accountNumber = process.env.FASTBOUND_ACCOUNT_NUMBER

  if (!apiKey || !accountNumber) {
    return NextResponse.json(
      { error: 'FastBound API credentials not configured' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const webhookUrl = body.webhookUrl || process.env.NEXT_PUBLIC_APP_URL + '/api/fastbound/webhook'

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Webhook URL is required. Either pass webhookUrl in body or set NEXT_PUBLIC_APP_URL env variable.' },
        { status: 400 }
      )
    }

    const client = getFastBoundClient()

    // Define the events we want to subscribe to
    const eventsToSubscribe = [
      'acquisition.committed',
      'acquisition.items.added',
      'disposition.committed',
      'disposition.items.added',
      'disposition.items.removed',
      'disposition.items.edited',
      'form4473.completed'
    ]

    // Create the webhook in FastBound
    const webhook = await client.createWebhook({
      url: webhookUrl,
      events: eventsToSubscribe
    })

    return NextResponse.json({
      success: true,
      message: 'Webhook registered successfully with FastBound',
      webhook,
      webhookUrl,
      subscribedEvents: eventsToSubscribe
    })
  } catch (error) {
    console.error('Failed to setup webhook:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to setup webhook' },
      { status: 500 }
    )
  }
}

// GET - List existing webhooks
export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
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
    const webhooks = await client.getWebhooks()

    return NextResponse.json({
      success: true,
      webhooks
    })
  } catch (error) {
    console.error('Failed to get webhooks:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get webhooks' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a webhook
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const apiKey = process.env.FASTBOUND_API_KEY
  const accountNumber = process.env.FASTBOUND_ACCOUNT_NUMBER

  if (!apiKey || !accountNumber) {
    return NextResponse.json(
      { error: 'FastBound API credentials not configured' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const webhookId = body.webhookId

    if (!webhookId) {
      return NextResponse.json(
        { error: 'webhookId is required' },
        { status: 400 }
      )
    }

    const client = getFastBoundClient()
    await client.deleteWebhook(webhookId)

    return NextResponse.json({
      success: true,
      message: `Webhook ${webhookId} deleted successfully`
    })
  } catch (error) {
    console.error('Failed to delete webhook:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete webhook' },
      { status: 500 }
    )
  }
}
