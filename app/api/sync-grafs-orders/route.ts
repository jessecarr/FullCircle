import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    const { action, deletedDate, newDate, changedDate } = await request.json()

    // Get all scheduled delivery dates
    const { data: scheduleDates, error: scheduleError } = await supabaseAdmin
      .from('grafs_delivery_schedule')
      .select('delivery_date')
      .order('delivery_date', { ascending: true })

    if (scheduleError) {
      return NextResponse.json({ error: scheduleError.message }, { status: 400 })
    }

    const availableDates = scheduleDates?.map(d => d.delivery_date) || []

    if (availableDates.length === 0) {
      return NextResponse.json({ message: 'No scheduled dates available' })
    }

    // Get all non-arrived tracking records
    const { data: trackingRecords, error: trackingError } = await supabaseAdmin
      .from('grafs_order_tracking')
      .select('id, expected_delivery_date')
      .eq('arrived', false)

    if (trackingError) {
      return NextResponse.json({ error: trackingError.message }, { status: 400 })
    }

    if (!trackingRecords || trackingRecords.length === 0) {
      return NextResponse.json({ message: 'No tracking records to update' })
    }

    let updatedCount = 0

    for (const record of trackingRecords) {
      let newExpectedDate = record.expected_delivery_date

      if (action === 'delete' && deletedDate) {
        // If the current date was deleted, move to next available date
        if (record.expected_delivery_date === deletedDate) {
          // Find next available date after the deleted one, or earliest available
          const nextDate = availableDates.find(d => d > deletedDate) || availableDates[0]
          if (nextDate) {
            newExpectedDate = nextDate
          }
        }
      } else if (action === 'add' && newDate) {
        // If a sooner date was added, update orders that are scheduled for later dates
        if (newDate < record.expected_delivery_date) {
          newExpectedDate = newDate
        }
      } else if (action === 'change' && changedDate) {
        // If the order's date was changed, update to the new date
        if (record.expected_delivery_date === changedDate.oldDate) {
          newExpectedDate = changedDate.newDate
        }
      }

      // Update if date changed
      if (newExpectedDate !== record.expected_delivery_date) {
        const { error: updateError } = await supabaseAdmin
          .from('grafs_order_tracking')
          .update({ expected_delivery_date: newExpectedDate })
          .eq('id', record.id)

        if (!updateError) {
          updatedCount++
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      updatedCount,
      message: `Updated ${updatedCount} order(s)` 
    })
  } catch (error) {
    console.error('Error syncing grafs orders:', error)
    return NextResponse.json({ error: 'Failed to sync orders' }, { status: 500 })
  }
}

// Update a single order's expected delivery date
export async function PUT(request: Request) {
  try {
    const { trackingId, newDate } = await request.json()

    if (!trackingId || !newDate) {
      return NextResponse.json({ error: 'Missing trackingId or newDate' }, { status: 400 })
    }

    // Verify the date exists in the schedule
    const { data: scheduleDate, error: scheduleError } = await supabaseAdmin
      .from('grafs_delivery_schedule')
      .select('delivery_date')
      .eq('delivery_date', newDate)
      .single()

    if (scheduleError || !scheduleDate) {
      return NextResponse.json({ error: 'Selected date is not in the delivery schedule' }, { status: 400 })
    }

    // Update the tracking record
    const { error: updateError } = await supabaseAdmin
      .from('grafs_order_tracking')
      .update({ expected_delivery_date: newDate })
      .eq('id', trackingId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Order date updated' })
  } catch (error) {
    console.error('Error updating order date:', error)
    return NextResponse.json({ error: 'Failed to update order date' }, { status: 500 })
  }
}
