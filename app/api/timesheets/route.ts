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

// GET - Fetch timesheets (filtered by employee_id for non-admins)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const payPeriodStart = searchParams.get('pay_period_start')
    const payPeriodEnd = searchParams.get('pay_period_end')
    const isAdmin = searchParams.get('is_admin') === 'true'

    let query = supabaseAdmin
      .from('timesheets')
      .select('*')
      .order('date', { ascending: true })

    // If not admin, only show their own timesheets
    if (!isAdmin && employeeId) {
      query = query.eq('employee_id', employeeId)
    } else if (employeeId) {
      // Admin filtering by specific employee
      query = query.eq('employee_id', employeeId)
    }

    // Filter by pay period if provided
    if (payPeriodStart && payPeriodEnd) {
      query = query
        .gte('date', payPeriodStart)
        .lte('date', payPeriodEnd)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ timesheets: data })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch timesheets' }, { status: 500 })
  }
}

// POST - Create or update timesheet entry
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { employee_id, date, time_in, time_out, regular_hours, overtime_hours, pto_hours, holiday_hours, pay_period_start, pay_period_end, notes, pto_notes, holiday_name } = body

    // Check if entry already exists for this employee and date
    const { data: existing } = await supabaseAdmin
      .from('timesheets')
      .select('id')
      .eq('employee_id', employee_id)
      .eq('date', date)
      .single()

    if (existing) {
      // Update existing entry
      const { data, error } = await supabaseAdmin
        .from('timesheets')
        .update({
          time_in,
          time_out,
          regular_hours: regular_hours || 0,
          overtime_hours: overtime_hours || 0,
          pto_hours: pto_hours || 0,
          holiday_hours: holiday_hours || 0,
          notes,
          pto_notes,
          holiday_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, timesheet: data })
    } else {
      // Create new entry
      const { data, error } = await supabaseAdmin
        .from('timesheets')
        .insert({
          employee_id,
          date,
          time_in,
          time_out,
          regular_hours: regular_hours || 0,
          overtime_hours: overtime_hours || 0,
          pto_hours: pto_hours || 0,
          holiday_hours: holiday_hours || 0,
          pay_period_start,
          pay_period_end,
          notes,
          pto_notes,
          holiday_name
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, timesheet: data })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save timesheet' }, { status: 500 })
  }
}

// PUT - Update timesheet entry (admin only for manual edits)
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, time_in, time_out, regular_hours, overtime_hours, pto_hours, holiday_hours, notes } = body

    const { data, error } = await supabaseAdmin
      .from('timesheets')
      .update({
        time_in,
        time_out,
        regular_hours: regular_hours || 0,
        overtime_hours: overtime_hours || 0,
        pto_hours: pto_hours || 0,
        holiday_hours: holiday_hours || 0,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, timesheet: data })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update timesheet' }, { status: 500 })
  }
}

// DELETE - Delete timesheet entry (admin only)
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()

    const { error } = await supabaseAdmin
      .from('timesheets')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete timesheet' }, { status: 500 })
  }
}
