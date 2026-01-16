'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/Header'
import { PageNavigation } from '@/components/PageNavigation'
import { Clock, Play, Square, ChevronLeft, ChevronRight, Users, Calendar, Edit2, Save, X } from 'lucide-react'
import { Timesheet } from '@/lib/supabase'
import { TimePicker } from '@/components/TimePicker'

interface Employee {
  id: string
  email: string
  name: string
  role: string
}

interface PayPeriod {
  start: string
  end: string
  label: string
}

interface DayEntry {
  date: string
  dayName: string
  timesheet: Timesheet | null
}

interface WeekData {
  weekNumber: number
  startDate: string
  endDate: string
  days: DayEntry[]
  totals: {
    regular: number
    overtime: number
    pto: number
    holiday: number
    total: number
  }
}

// Helper to parse date string as local date (avoids timezone issues)
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Helper to format date as YYYY-MM-DD
function formatDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper function to get pay period dates
// First pay period of 2026 starts Dec 29, 2025 (Monday of week containing Jan 1, 2026)
function getPayPeriodDates(date: Date): PayPeriod {
  // Base date: December 29, 2025 (Monday) - first pay period containing Jan 1, 2026
  const baseDate = new Date(2025, 11, 29) // Month is 0-indexed, so 11 = December
  
  // Calculate difference in days
  const diffTime = date.getTime() - baseDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const periodNumber = Math.floor(diffDays / 14)
  
  const periodStart = new Date(baseDate)
  periodStart.setDate(baseDate.getDate() + (periodNumber * 14))
  
  const periodEnd = new Date(periodStart)
  periodEnd.setDate(periodStart.getDate() + 13)
  
  const formatDisplay = (d: Date) => d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
  
  return {
    start: formatDateString(periodStart),
    end: formatDateString(periodEnd),
    label: `${formatDisplay(periodStart)} - ${formatDisplay(periodEnd)}`
  }
}

// Navigate to next/previous pay period
function navigatePayPeriod(currentStart: string, direction: 'next' | 'prev'): PayPeriod {
  const current = parseLocalDate(currentStart)
  const newDate = new Date(current)
  newDate.setDate(current.getDate() + (direction === 'next' ? 14 : -14))
  return getPayPeriodDates(newDate)
}

// Get week data for a pay period
function getWeeksInPayPeriod(payPeriodStart: string, payPeriodEnd: string, timesheets: Timesheet[]): WeekData[] {
  const weeks: WeekData[] = []
  const startDate = parseLocalDate(payPeriodStart)
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  
  for (let weekNum = 0; weekNum < 2; weekNum++) {
    const weekStart = new Date(startDate)
    weekStart.setDate(startDate.getDate() + (weekNum * 7))
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    
    const days: DayEntry[] = []
    let weekTotals = { regular: 0, overtime: 0, pto: 0, holiday: 0, total: 0 }
    
    for (let dayNum = 0; dayNum < 7; dayNum++) {
      const currentDate = new Date(weekStart)
      currentDate.setDate(weekStart.getDate() + dayNum)
      const dateStr = formatDateString(currentDate)
      
      const timesheet = timesheets.find(ts => ts.date === dateStr) || null
      
      days.push({
        date: dateStr,
        dayName: dayNames[currentDate.getDay()],
        timesheet
      })
      
      if (timesheet) {
        weekTotals.regular += timesheet.regular_hours || 0
        weekTotals.overtime += timesheet.overtime_hours || 0
        weekTotals.pto += timesheet.pto_hours || 0
        weekTotals.holiday += timesheet.holiday_hours || 0
      }
    }
    
    weekTotals.total = weekTotals.regular + weekTotals.overtime + weekTotals.pto + weekTotals.holiday
    
    weeks.push({
      weekNumber: weekNum + 1,
      startDate: formatDateString(weekStart),
      endDate: formatDateString(weekEnd),
      days,
      totals: weekTotals
    })
  }
  
  return weeks
}

export default function TimesheetPage() {
  const { user, loading, userRole } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [payPeriod, setPayPeriod] = useState<PayPeriod>(getPayPeriodDates(new Date()))
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [weeks, setWeeks] = useState<WeekData[]>([])
  const [clockStatus, setClockStatus] = useState<{ isClockedIn: boolean; isClockedOut: boolean; timeIn: string | null }>({
    isClockedIn: false,
    isClockedOut: false,
    timeIn: null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [editingCell, setEditingCell] = useState<{ date: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editingTimeForDate, setEditingTimeForDate] = useState<string | null>(null)
  const [editTimeIn, setEditTimeIn] = useState('')
  const [editTimeOut, setEditTimeOut] = useState('')
  
  const isAdmin = userRole === 'admin'
  
  // Fetch employees (for admin) or current employee (for non-admin)
  useEffect(() => {
    if (loading || !user) return
    
    if (isAdmin) {
      // Admin: fetch all employees
      fetch('/api/employees')
        .then(res => res.json())
        .then(data => {
          if (data.employees) {
            setEmployees(data.employees)
            // Default to first employee if none selected
            if (!selectedEmployee && data.employees.length > 0) {
              const self = data.employees.find((e: Employee) => e.email.toLowerCase() === user.email?.toLowerCase())
              setSelectedEmployee(self || data.employees[0])
            }
          }
        })
        .catch(err => console.error('Failed to fetch employees:', err))
    } else {
      // Non-admin: look up their employee record by email
      if (!selectedEmployee && user.email) {
        fetch(`/api/employees?email=${encodeURIComponent(user.email)}`)
          .then(res => res.json())
          .then(data => {
            if (data.employee) {
              setSelectedEmployee(data.employee)
            } else {
              console.error('No employee record found for email:', user.email)
            }
          })
          .catch(err => console.error('Failed to fetch employee:', err))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, isAdmin])
  
  // Fetch timesheets when employee or pay period changes
  const fetchTimesheets = useCallback(async () => {
    if (!selectedEmployee) return
    
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        employee_id: selectedEmployee.id,
        pay_period_start: payPeriod.start,
        pay_period_end: payPeriod.end,
        is_admin: isAdmin.toString()
      })
      
      const res = await fetch(`/api/timesheets?${params}`)
      const data = await res.json()
      
      if (data.timesheets) {
        setTimesheets(data.timesheets)
      }
    } catch (err) {
      console.error('Failed to fetch timesheets:', err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedEmployee, payPeriod, isAdmin])
  
  useEffect(() => {
    fetchTimesheets()
  }, [fetchTimesheets])
  
  // Calculate weeks data when timesheets change
  useEffect(() => {
    const weeksData = getWeeksInPayPeriod(payPeriod.start, payPeriod.end, timesheets)
    setWeeks(weeksData)
  }, [payPeriod, timesheets])
  
  // Fetch clock status
  useEffect(() => {
    if (!selectedEmployee || isAdmin) return
    
    fetch(`/api/timesheets/clock?employee_id=${selectedEmployee.id}`)
      .then(res => res.json())
      .then(data => {
        setClockStatus({
          isClockedIn: data.isClockedIn || false,
          isClockedOut: data.isClockedOut || false,
          timeIn: data.timeIn || null
        })
      })
      .catch(err => console.error('Failed to fetch clock status:', err))
  }, [selectedEmployee, isAdmin])
  
  // Handle clock in/out
  const handleClock = async (action: 'clock_in' | 'clock_out') => {
    if (!selectedEmployee) return
    
    try {
      const res = await fetch('/api/timesheets/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: selectedEmployee.id,
          action
        })
      })
      
      const data = await res.json()
      
      if (data.success) {
        toast({
          title: action === 'clock_in' ? 'Clocked In' : 'Clocked Out',
          description: data.message
        })
        
        // Refresh clock status and timesheets
        setClockStatus({
          isClockedIn: action === 'clock_in',
          isClockedOut: action === 'clock_out',
          timeIn: action === 'clock_in' ? new Date().toISOString() : clockStatus.timeIn
        })
        fetchTimesheets()
      } else {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive'
        })
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to process clock action',
        variant: 'destructive'
      })
    }
  }
  
  // Handle cell edit (admin only)
  const handleStartEdit = (date: string, field: string, currentValue: string | number) => {
    if (!isAdmin) return
    setEditingCell({ date, field })
    setEditValue(currentValue.toString())
  }
  
  // Handle time edit (admin only) - opens picker for both times
  const handleStartTimeEdit = (date: string, timesheet: Timesheet | null) => {
    if (!isAdmin) return
    setEditingTimeForDate(date)
    
    // Convert ISO time to HH:MM format for input
    if (timesheet?.time_in) {
      const time = new Date(timesheet.time_in)
      setEditTimeIn(`${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`)
    } else {
      setEditTimeIn('09:00')
    }
    
    if (timesheet?.time_out) {
      const time = new Date(timesheet.time_out)
      setEditTimeOut(`${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`)
    } else {
      setEditTimeOut('17:00')
    }
  }
  
  // Handle clearing a time field
  const handleClearTime = async (date: string, field: 'time_in' | 'time_out') => {
    if (!selectedEmployee) return
    
    const existingTimesheet = timesheets.find(ts => ts.date === date)
    
    try {
      const body: any = {
        employee_id: selectedEmployee.id,
        date,
        pay_period_start: payPeriod.start,
        pay_period_end: payPeriod.end,
        regular_hours: existingTimesheet?.regular_hours || 0,
        overtime_hours: existingTimesheet?.overtime_hours || 0,
        pto_hours: existingTimesheet?.pto_hours || 0,
        holiday_hours: existingTimesheet?.holiday_hours || 0,
        time_in: existingTimesheet?.time_in || null,
        time_out: existingTimesheet?.time_out || null
      }
      
      body[field] = null
      
      // If clearing time, also clear hours
      if (!body.time_in || !body.time_out) {
        body.regular_hours = 0
        body.overtime_hours = 0
      }
      
      const res = await fetch('/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const data = await res.json()
      
      if (data.success) {
        toast({ title: 'Cleared', description: `${field === 'time_in' ? 'Time In' : 'Time Out'} cleared` })
        fetchTimesheets()
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to clear time', variant: 'destructive' })
    }
  }
  
  // Handle saving both times from the TimePicker
  const handleSaveBothTimes = async (timeInHHMM: string, timeOutHHMM: string) => {
    if (!selectedEmployee || !editingTimeForDate) return
    
    const date = editingTimeForDate
    const existingTimesheet = timesheets.find(ts => ts.date === date)
    
    try {
      // Convert HH:MM to ISO string for the given date
      const [inH, inM] = timeInHHMM.split(':')
      const timeInDate = new Date(date + 'T00:00:00')
      timeInDate.setHours(parseInt(inH), parseInt(inM), 0, 0)
      
      const [outH, outM] = timeOutHHMM.split(':')
      const timeOutDate = new Date(date + 'T00:00:00')
      timeOutDate.setHours(parseInt(outH), parseInt(outM), 0, 0)
      
      const body: any = {
        employee_id: selectedEmployee.id,
        date,
        pay_period_start: payPeriod.start,
        pay_period_end: payPeriod.end,
        regular_hours: existingTimesheet?.regular_hours || 0,
        overtime_hours: existingTimesheet?.overtime_hours || 0,
        pto_hours: existingTimesheet?.pto_hours || 0,
        holiday_hours: existingTimesheet?.holiday_hours || 0,
        time_in: timeInDate.toISOString(),
        time_out: timeOutDate.toISOString()
      }
      
      // Auto-calculate hours
      const totalHoursWorked = calculateHoursBetween(body.time_in, body.time_out)
      const weekNum = getWeekNumber(date)
      const existingWeeklyHours = calculateWeeklyHoursExcluding(weekNum, date)
      const availableRegularHours = Math.max(0, 40 - existingWeeklyHours)
      
      if (totalHoursWorked <= availableRegularHours) {
        body.regular_hours = Math.round(totalHoursWorked * 100) / 100
        body.overtime_hours = 0
      } else {
        body.regular_hours = Math.round(availableRegularHours * 100) / 100
        body.overtime_hours = Math.round((totalHoursWorked - availableRegularHours) * 100) / 100
      }
      
      const res = await fetch('/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const data = await res.json()
      
      if (data.success) {
        toast({ title: 'Saved', description: 'Times updated successfully' })
        fetchTimesheets()
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save times', variant: 'destructive' })
    }
    
    setEditingTimeForDate(null)
  }
  
  const handleCancelTimePicker = () => {
    setEditingTimeForDate(null)
  }
  
  // Handle Full Time Employee button - fills Tue-Sat with 9am-5pm
  const handleFullTimeEmployee = async (weekIndex: number) => {
    if (!selectedEmployee) return
    
    const week = weeks[weekIndex]
    if (!week) return
    
    // Days to fill: Tuesday (index 1), Wednesday (2), Thursday (3), Friday (4), Saturday (5)
    const daysToFill = week.days.filter(day => {
      const dayNum = parseLocalDate(day.date).getDay()
      return dayNum >= 2 && dayNum <= 6 // Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
    })
    
    try {
      for (const day of daysToFill) {
        const timeIn = new Date(day.date + 'T09:00:00')
        const timeOut = new Date(day.date + 'T17:00:00')
        
        const body = {
          employee_id: selectedEmployee.id,
          date: day.date,
          pay_period_start: payPeriod.start,
          pay_period_end: payPeriod.end,
          regular_hours: 8,
          overtime_hours: 0,
          pto_hours: 0,
          holiday_hours: 0,
          time_in: timeIn.toISOString(),
          time_out: timeOut.toISOString()
        }
        
        await fetch('/api/timesheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      }
      
      toast({ title: 'Success', description: 'Filled Tue-Sat with 9am-5pm' })
      fetchTimesheets()
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fill times', variant: 'destructive' })
    }
  }
  
  // Calculate hours between two times
  const calculateHoursBetween = (timeIn: string, timeOut: string): number => {
    const start = new Date(timeIn)
    const end = new Date(timeOut)
    const diffMs = end.getTime() - start.getTime()
    return Math.max(0, diffMs / (1000 * 60 * 60))
  }
  
  // Get the week number (1 or 2) for a date within the pay period
  const getWeekNumber = (dateStr: string): number => {
    const date = parseLocalDate(dateStr)
    const periodStart = parseLocalDate(payPeriod.start)
    const diffDays = Math.floor((date.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays < 7 ? 1 : 2
  }
  
  // Calculate weekly hours excluding a specific date (for recalculation)
  const calculateWeeklyHoursExcluding = (weekNum: number, excludeDate: string): number => {
    return timesheets
      .filter(ts => getWeekNumber(ts.date) === weekNum && ts.date !== excludeDate)
      .reduce((sum, ts) => sum + (ts.regular_hours || 0) + (ts.overtime_hours || 0), 0)
  }
  
  const handleSaveEdit = async (date: string, field: string) => {
    if (!selectedEmployee) return
    
    const existingTimesheet = timesheets.find(ts => ts.date === date)
    
    try {
      const body: any = {
        employee_id: selectedEmployee.id,
        date,
        pay_period_start: payPeriod.start,
        pay_period_end: payPeriod.end,
        regular_hours: existingTimesheet?.regular_hours || 0,
        overtime_hours: existingTimesheet?.overtime_hours || 0,
        pto_hours: existingTimesheet?.pto_hours || 0,
        holiday_hours: existingTimesheet?.holiday_hours || 0,
        time_in: existingTimesheet?.time_in || null,
        time_out: existingTimesheet?.time_out || null
      }
      
      // Update the specific field
      if (field === 'time_in' || field === 'time_out') {
        // Convert HH:MM to ISO string for the given date
        if (editValue) {
          const [hours, minutes] = editValue.split(':')
          const timeDate = new Date(date + 'T00:00:00')
          timeDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
          body[field] = timeDate.toISOString()
        } else {
          body[field] = null
        }
        
        // Auto-calculate hours if both time_in and time_out are set
        const finalTimeIn = body.time_in
        const finalTimeOut = body.time_out
        
        if (finalTimeIn && finalTimeOut) {
          const totalHoursWorked = calculateHoursBetween(finalTimeIn, finalTimeOut)
          
          // Get the week number for this date
          const weekNum = getWeekNumber(date)
          
          // Calculate existing weekly hours (excluding this day)
          const existingWeeklyHours = calculateWeeklyHoursExcluding(weekNum, date)
          
          // Calculate how many regular hours are available (40 - existing)
          const availableRegularHours = Math.max(0, 40 - existingWeeklyHours)
          
          // Split hours between regular and overtime
          if (totalHoursWorked <= availableRegularHours) {
            // All hours fit in regular
            body.regular_hours = Math.round(totalHoursWorked * 100) / 100
            body.overtime_hours = 0
          } else {
            // Split between regular and overtime
            body.regular_hours = Math.round(availableRegularHours * 100) / 100
            body.overtime_hours = Math.round((totalHoursWorked - availableRegularHours) * 100) / 100
          }
        }
      } else {
        body[field] = parseFloat(editValue) || 0
      }
      
      const res = await fetch('/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const data = await res.json()
      
      if (data.success) {
        toast({ title: 'Saved', description: 'Timesheet updated successfully' })
        fetchTimesheets()
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' })
    }
    
    setEditingCell(null)
    setEditValue('')
  }
  
  const handleCancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }
  
  // Format time for display
  const formatTime = (isoString: string | null | undefined) => {
    if (!isoString) return '-'
    return new Date(isoString).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }
  
  // Format HH:MM (24-hour) to display format
  const formatTimeFromHHMM = (timeStr: string) => {
    if (!timeStr) return '-'
    const [h, m] = timeStr.split(':').map(Number)
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
    const period = h >= 12 ? 'PM' : 'AM'
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`
  }
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr)
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
  }
  
  // Calculate pay period totals
  const payPeriodTotals = weeks.reduce((acc, week) => ({
    regular: acc.regular + week.totals.regular,
    overtime: acc.overtime + week.totals.overtime,
    pto: acc.pto + week.totals.pto,
    holiday: acc.holiday + week.totals.holiday,
    total: acc.total + week.totals.total
  }), { regular: 0, overtime: 0, pto: 0, holiday: 0, total: 0 })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="landing-page max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <PageNavigation backButtonText="Return to Dashboard" />

          {/* Page Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Clock className="h-8 w-8" />
                Time Sheets
              </h2>
              <p className="mt-1 text-muted-foreground">
                {isAdmin ? 'Manage employee time tracking' : 'View your hours and clock in/out'}
              </p>
            </div>
            
            {/* Clock In/Out Buttons (employees only) */}
            {!isAdmin && selectedEmployee && (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleClock('clock_in')}
                  disabled={clockStatus.isClockedIn || clockStatus.isClockedOut}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Clock In
                </Button>
                <Button
                  onClick={() => handleClock('clock_out')}
                  disabled={!clockStatus.isClockedIn || clockStatus.isClockedOut}
                  variant="destructive"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Clock Out
                </Button>
              </div>
            )}
          </div>

          {/* Employee Selector (admin only) */}
          {isAdmin && (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Select Employee
                </CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  value={selectedEmployee?.id || ''}
                  onChange={(e) => {
                    const emp = employees.find(emp => emp.id === e.target.value)
                    setSelectedEmployee(emp || null)
                  }}
                  className="w-full max-w-md p-2 border rounded-md bg-background text-foreground"
                >
                  <option value="">Select an employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email})
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          )}

          {/* Pay Period Navigation */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setPayPeriod(navigatePayPeriod(payPeriod.start, 'prev'))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <div className="text-center">
                  <div className="flex items-center gap-2 justify-center">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold text-lg">Pay Period</span>
                  </div>
                  <p className="text-muted-foreground">{payPeriod.label}</p>
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => setPayPeriod(navigatePayPeriod(payPeriod.start, 'next'))}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Employee Name Header */}
          {selectedEmployee && (
            <div className="mb-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="text-xl font-bold">NAME: {selectedEmployee.name.toUpperCase()}</h3>
            </div>
          )}

          {/* Weekly Timesheet Tables */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading timesheets...</p>
            </div>
          ) : selectedEmployee ? (
            <>
              {weeks.map((week, weekIndex) => (
                <Card key={weekIndex} className="mb-6">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        WEEKLY TIME REPORT FOR {formatDate(week.startDate)} TO {formatDate(week.endDate)}
                      </CardTitle>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-blue-500 text-blue-400 hover:bg-blue-500/20"
                          onClick={() => handleFullTimeEmployee(weekIndex)}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Full Time Employee
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto border border-border rounded-md">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-muted">
                            <th className="px-3 py-2 text-left font-semibold border border-border">DAY</th>
                            <th className="px-3 py-2 text-left font-semibold border border-border">DATE</th>
                            <th className="px-3 py-2 text-center font-semibold border border-border">TIME IN</th>
                            <th className="px-3 py-2 text-center font-semibold border border-border">TIME OUT</th>
                            <th className="px-3 py-2 text-center font-semibold border border-border">REG. HOURS</th>
                            <th className="px-3 py-2 text-center font-semibold border border-border">OVER TIME</th>
                            <th className="px-3 py-2 text-center font-semibold border border-border">PTO</th>
                            <th className="px-3 py-2 text-center font-semibold border border-border">HOLIDAY</th>
                          </tr>
                        </thead>
                        <tbody>
                          {week.days.map((day, dayIndex) => (
                            <tr key={dayIndex} className={`${dayIndex % 2 === 0 ? 'bg-background' : 'bg-muted/30'} hover:bg-muted/50 transition-colors`}>
                              <td className="px-3 py-2 font-medium border border-border">{day.dayName}</td>
                              <td className="px-3 py-2 border border-border">{formatDate(day.date)}</td>
                              
                              {/* Time In - Editable by admin */}
                              <td className="px-3 py-2 text-center border border-border">
                                <div className="flex items-center justify-center gap-1">
                                  <span>{formatTime(day.timesheet?.time_in)}</span>
                                  {isAdmin && (
                                    <>
                                      <button
                                        className="p-1 rounded hover:bg-blue-500/20 text-blue-400"
                                        onClick={() => handleStartTimeEdit(day.date, day.timesheet)}
                                        title="Edit times"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      {day.timesheet?.time_in && (
                                        <button
                                          className="p-1 rounded hover:bg-red-500/20 text-red-400"
                                          onClick={() => handleClearTime(day.date, 'time_in')}
                                          title="Clear time in"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                              
                              {/* Time Out - Editable by admin */}
                              <td className="px-3 py-2 text-center border border-border">
                                <div className="flex items-center justify-center gap-1">
                                  <span>{formatTime(day.timesheet?.time_out)}</span>
                                  {isAdmin && (
                                    <>
                                      <button
                                        className="p-1 rounded hover:bg-blue-500/20 text-blue-400"
                                        onClick={() => handleStartTimeEdit(day.date, day.timesheet)}
                                        title="Edit times"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      {day.timesheet?.time_out && (
                                        <button
                                          className="p-1 rounded hover:bg-red-500/20 text-red-400"
                                          onClick={() => handleClearTime(day.date, 'time_out')}
                                          title="Clear time out"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                              
                              {/* Regular Hours */}
                              <td className="px-3 py-2 text-center border border-border">
                                {editingCell?.date === day.date && editingCell?.field === 'regular_hours' ? (
                                  <div className="flex items-center gap-1 justify-center">
                                    <Input
                                      type="number"
                                      step="0.25"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="w-16 h-7 text-center p-1"
                                      autoFocus
                                    />
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveEdit(day.date, 'regular_hours')}>
                                      <Save className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelEdit}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span 
                                    className={isAdmin ? 'cursor-pointer hover:bg-muted px-2 py-1 rounded' : ''}
                                    onClick={() => handleStartEdit(day.date, 'regular_hours', day.timesheet?.regular_hours || 0)}
                                  >
                                    {day.timesheet?.regular_hours || '-'}
                                    {isAdmin && <Edit2 className="h-3 w-3 inline ml-1 opacity-30" />}
                                  </span>
                                )}
                              </td>
                              
                              {/* Overtime Hours */}
                              <td className="px-3 py-2 text-center border border-border">
                                {editingCell?.date === day.date && editingCell?.field === 'overtime_hours' ? (
                                  <div className="flex items-center gap-1 justify-center">
                                    <Input
                                      type="number"
                                      step="0.25"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="w-16 h-7 text-center p-1"
                                      autoFocus
                                    />
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveEdit(day.date, 'overtime_hours')}>
                                      <Save className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelEdit}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span 
                                    className={isAdmin ? 'cursor-pointer hover:bg-muted px-2 py-1 rounded' : ''}
                                    onClick={() => handleStartEdit(day.date, 'overtime_hours', day.timesheet?.overtime_hours || 0)}
                                  >
                                    {day.timesheet?.overtime_hours || '-'}
                                    {isAdmin && <Edit2 className="h-3 w-3 inline ml-1 opacity-30" />}
                                  </span>
                                )}
                              </td>
                              
                              {/* PTO Hours */}
                              <td className="px-3 py-2 text-center border border-border">
                                {editingCell?.date === day.date && editingCell?.field === 'pto_hours' ? (
                                  <div className="flex items-center gap-1 justify-center">
                                    <Input
                                      type="number"
                                      step="0.25"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="w-16 h-7 text-center p-1"
                                      autoFocus
                                    />
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveEdit(day.date, 'pto_hours')}>
                                      <Save className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelEdit}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span 
                                    className={isAdmin ? 'cursor-pointer hover:bg-muted px-2 py-1 rounded' : ''}
                                    onClick={() => handleStartEdit(day.date, 'pto_hours', day.timesheet?.pto_hours || 0)}
                                  >
                                    {day.timesheet?.pto_hours || '-'}
                                    {isAdmin && <Edit2 className="h-3 w-3 inline ml-1 opacity-30" />}
                                  </span>
                                )}
                              </td>
                              
                              {/* Holiday Hours */}
                              <td className="px-3 py-2 text-center border border-border">
                                {editingCell?.date === day.date && editingCell?.field === 'holiday_hours' ? (
                                  <div className="flex items-center gap-1 justify-center">
                                    <Input
                                      type="number"
                                      step="0.25"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="w-16 h-7 text-center p-1"
                                      autoFocus
                                    />
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveEdit(day.date, 'holiday_hours')}>
                                      <Save className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCancelEdit}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span 
                                    className={isAdmin ? 'cursor-pointer hover:bg-muted px-2 py-1 rounded' : ''}
                                    onClick={() => handleStartEdit(day.date, 'holiday_hours', day.timesheet?.holiday_hours || 0)}
                                  >
                                    {day.timesheet?.holiday_hours || '-'}
                                    {isAdmin && <Edit2 className="h-3 w-3 inline ml-1 opacity-30" />}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                          
                          {/* Weekly Totals Row */}
                          <tr className="bg-muted font-semibold">
                            <td colSpan={4} className="px-3 py-2 text-right border border-border">TOTALS</td>
                            <td className="px-3 py-2 text-center border border-border">{week.totals.regular.toFixed(2)}</td>
                            <td className="px-3 py-2 text-center border border-border">{week.totals.overtime.toFixed(2)}</td>
                            <td className="px-3 py-2 text-center border border-border">{week.totals.pto.toFixed(2)}</td>
                            <td className="px-3 py-2 text-center border border-border">{week.totals.holiday.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Weekly Total Box */}
                    <div className="flex justify-end p-4">
                      <div className="border rounded-md p-3 bg-muted/30">
                        <span className="font-semibold">WEEKLY TOTAL: </span>
                        <span className="text-lg font-bold">{week.totals.total.toFixed(2)} hrs</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Pay Period Totals */}
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Pay Period Totals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="p-2 text-center font-medium">REG. HOURS</th>
                          <th className="p-2 text-center font-medium">OVER TIME</th>
                          <th className="p-2 text-center font-medium">PTO</th>
                          <th className="p-2 text-center font-medium">HOLIDAY</th>
                          <th className="p-2 text-center font-medium">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="font-bold text-lg">
                          <td className="p-3 text-center">{payPeriodTotals.regular.toFixed(2)}</td>
                          <td className="p-3 text-center">{payPeriodTotals.overtime.toFixed(2)}</td>
                          <td className="p-3 text-center">{payPeriodTotals.pto.toFixed(2)}</td>
                          <td className="p-3 text-center">{payPeriodTotals.holiday.toFixed(2)}</td>
                          <td className="p-3 text-center text-primary">{payPeriodTotals.total.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {isAdmin ? 'Select an employee to view their timesheet' : 'No employee data available'}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      {/* Time Picker Modal */}
      {editingTimeForDate && (
        <TimePicker
          timeIn={editTimeIn}
          timeOut={editTimeOut}
          onSave={handleSaveBothTimes}
          onCancel={handleCancelTimePicker}
        />
      )}
    </div>
  )
}
