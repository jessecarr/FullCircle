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

// Helper to format date as YYYY-MM-DD
function formatDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper to get pay period dates (2-week periods starting from Dec 29, 2025)
function getPayPeriodDates(date: Date): { start: string; end: string } {
  // Base date: December 29, 2025 (Monday) - first pay period containing Jan 1, 2026
  const baseDate = new Date(2025, 11, 29) // Month is 0-indexed, so 11 = December
  const diffTime = date.getTime() - baseDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const periodNumber = Math.floor(diffDays / 14)
  
  const periodStart = new Date(baseDate)
  periodStart.setDate(baseDate.getDate() + (periodNumber * 14))
  
  const periodEnd = new Date(periodStart)
  periodEnd.setDate(periodStart.getDate() + 13)
  
  return {
    start: formatDateString(periodStart),
    end: formatDateString(periodEnd)
  }
}

// Helper to calculate hours between two timestamps
function calculateHours(timeIn: string, timeOut: string): number {
  const start = new Date(timeIn)
  const end = new Date(timeOut)
  const diffMs = end.getTime() - start.getTime()
  const hours = diffMs / (1000 * 60 * 60)
  return Math.round(hours * 100) / 100 // Round to 2 decimal places
}

// Helper to calculate regular and overtime hours for a week
async function calculateWeeklyHours(employeeId: string, weekStart: Date, weekEnd: Date, currentDayHours: number): Promise<{ regular: number; overtime: number }> {
  // Get all timesheets for the week
  const { data: weekTimesheets } = await supabaseAdmin
    .from('timesheets')
    .select('regular_hours, overtime_hours')
    .eq('employee_id', employeeId)
    .gte('date', weekStart.toISOString().split('T')[0])
    .lte('date', weekEnd.toISOString().split('T')[0])

  // Sum up existing hours for the week (excluding current day which we'll recalculate)
  let totalRegularHours = 0
  if (weekTimesheets) {
    totalRegularHours = weekTimesheets.reduce((sum, ts) => sum + (ts.regular_hours || 0), 0)
  }

  // Calculate how hours should be split for current day
  const remainingRegular = Math.max(0, 40 - totalRegularHours)
  
  if (currentDayHours <= remainingRegular) {
    return { regular: currentDayHours, overtime: 0 }
  } else {
    return { regular: remainingRegular, overtime: currentDayHours - remainingRegular }
  }
}

// Get the week boundaries (Monday to Sunday) for a given date
function getWeekBoundaries(date: Date): { start: Date; end: Date } {
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  
  const weekStart = new Date(date)
  weekStart.setDate(diff)
  weekStart.setHours(0, 0, 0, 0)
  
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  
  return { start: weekStart, end: weekEnd }
}

// POST - Clock in or clock out
export async function POST(request: Request) {
  try {
    const { employee_id, action } = await request.json()
    
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const payPeriod = getPayPeriodDates(now)

    // Check if there's already a timesheet entry for today
    const { data: existing } = await supabaseAdmin
      .from('timesheets')
      .select('*')
      .eq('employee_id', employee_id)
      .eq('date', today)
      .single()

    if (action === 'clock_in') {
      if (existing?.time_in && !existing?.time_out) {
        return NextResponse.json({ error: 'Already clocked in' }, { status: 400 })
      }

      if (existing?.time_out) {
        return NextResponse.json({ error: 'Already clocked in and out for today' }, { status: 400 })
      }

      // Create new entry with clock in time
      const { data, error } = await supabaseAdmin
        .from('timesheets')
        .insert({
          employee_id,
          date: today,
          time_in: now.toISOString(),
          regular_hours: 0,
          overtime_hours: 0,
          pto_hours: 0,
          holiday_hours: 0,
          pay_period_start: payPeriod.start,
          pay_period_end: payPeriod.end
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, timesheet: data, message: 'Clocked in successfully' })
    } 
    else if (action === 'clock_out') {
      if (!existing) {
        return NextResponse.json({ error: 'No clock in found for today' }, { status: 400 })
      }

      if (!existing.time_in) {
        return NextResponse.json({ error: 'Must clock in first' }, { status: 400 })
      }

      if (existing.time_out) {
        return NextResponse.json({ error: 'Already clocked out' }, { status: 400 })
      }

      // Calculate hours worked
      const hoursWorked = calculateHours(existing.time_in, now.toISOString())
      
      // Get week boundaries to calculate overtime
      const weekBounds = getWeekBoundaries(now)
      const { regular, overtime } = await calculateWeeklyHours(
        employee_id, 
        weekBounds.start, 
        weekBounds.end, 
        hoursWorked
      )

      // Update with clock out time and calculated hours
      const { data, error } = await supabaseAdmin
        .from('timesheets')
        .update({
          time_out: now.toISOString(),
          regular_hours: regular,
          overtime_hours: overtime,
          updated_at: now.toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ 
        success: true, 
        timesheet: data, 
        message: `Clocked out successfully. Hours: ${hoursWorked.toFixed(2)} (Regular: ${regular.toFixed(2)}, OT: ${overtime.toFixed(2)})` 
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Clock error:', error)
    return NextResponse.json({ error: 'Failed to process clock action' }, { status: 500 })
  }
}

// GET - Get current clock status for employee
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabaseAdmin
      .from('timesheets')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const status = {
      isClockedIn: data?.time_in && !data?.time_out,
      isClockedOut: data?.time_in && data?.time_out,
      timeIn: data?.time_in || null,
      timeOut: data?.time_out || null,
      todayEntry: data || null
    }

    return NextResponse.json(status)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get clock status' }, { status: 500 })
  }
}
