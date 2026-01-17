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
import { Clock, Play, Square, ChevronLeft, ChevronRight, Users, Calendar, Edit2, Save, X, BarChart3, Printer } from 'lucide-react'
import Link from 'next/link'
import { Timesheet } from '@/lib/supabase'
import { TimePicker } from '@/components/TimePicker'
import { HolidayPicker } from '@/components/HolidayPicker'
import { PTOPicker } from '@/components/PTOPicker'

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
  const [editingPTOForDate, setEditingPTOForDate] = useState<string | null>(null)
  const [editPTOHours, setEditPTOHours] = useState(0)
  const [editPTONotes, setEditPTONotes] = useState('')
  const [editingHolidayForDate, setEditingHolidayForDate] = useState<string | null>(null)
  const [editHolidayHours, setEditHolidayHours] = useState(0)
  const [editHolidayName, setEditHolidayName] = useState('')
  const [bulkSelectMode, setBulkSelectMode] = useState<'time_in' | 'time_out' | 'pto' | null>(null)
  const [bulkSelectedDates, setBulkSelectedDates] = useState<string[]>([])
  const [showBulkPTOModal, setShowBulkPTOModal] = useState(false)
  const [bulkPTOHours, setBulkPTOHours] = useState(8)
  const [bulkPTONotes, setBulkPTONotes] = useState('')
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false)
  
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
  
  // Handle PTO edit - opens picker
  const handleStartPTOEdit = (date: string, timesheet: Timesheet | null) => {
    if (!isAdmin) return
    setEditingPTOForDate(date)
    setEditPTOHours(timesheet?.pto_hours || 8)
    setEditPTONotes(timesheet?.pto_notes || '')
  }
  
  // Handle saving PTO
  const handleSavePTO = async (hours: number, notes: string) => {
    if (!selectedEmployee || !editingPTOForDate) return
    
    const date = editingPTOForDate
    const existingTimesheet = timesheets.find(ts => ts.date === date)
    
    try {
      const body: any = {
        employee_id: selectedEmployee.id,
        date,
        pay_period_start: payPeriod.start,
        pay_period_end: payPeriod.end,
        regular_hours: existingTimesheet?.regular_hours || 0,
        overtime_hours: existingTimesheet?.overtime_hours || 0,
        pto_hours: hours,
        holiday_hours: existingTimesheet?.holiday_hours || 0,
        time_in: existingTimesheet?.time_in || null,
        time_out: existingTimesheet?.time_out || null,
        pto_notes: notes,
        holiday_name: existingTimesheet?.holiday_name || null
      }
      
      const res = await fetch('/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const data = await res.json()
      
      if (data.success) {
        toast({ title: 'Saved', description: 'PTO updated successfully' })
        fetchTimesheets()
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save PTO', variant: 'destructive' })
    }
    
    setEditingPTOForDate(null)
  }
  
  const handleCancelPTOPicker = () => {
    setEditingPTOForDate(null)
  }
  
  // Handle clearing PTO directly
  const handleClearPTO = async (date: string) => {
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
        pto_hours: 0,
        holiday_hours: existingTimesheet?.holiday_hours || 0,
        time_in: existingTimesheet?.time_in || null,
        time_out: existingTimesheet?.time_out || null,
        pto_notes: null,
        holiday_name: existingTimesheet?.holiday_name || null
      }
      
      const res = await fetch('/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const data = await res.json()
      
      if (data.success) {
        toast({ title: 'Cleared', description: 'PTO cleared' })
        fetchTimesheets()
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to clear PTO', variant: 'destructive' })
    }
  }
  
  // Handle Holiday edit - opens picker
  const handleStartHolidayEdit = (date: string, timesheet: Timesheet | null) => {
    if (!isAdmin) return
    setEditingHolidayForDate(date)
    setEditHolidayHours(timesheet?.holiday_hours || 8)
    setEditHolidayName(timesheet?.holiday_name || '')
  }
  
  // Handle saving Holiday
  const handleSaveHoliday = async (hours: number, holidayName: string) => {
    if (!selectedEmployee || !editingHolidayForDate) return
    
    const date = editingHolidayForDate
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
        holiday_hours: hours,
        time_in: existingTimesheet?.time_in || null,
        time_out: existingTimesheet?.time_out || null,
        pto_notes: existingTimesheet?.pto_notes || null,
        holiday_name: holidayName
      }
      
      const res = await fetch('/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const data = await res.json()
      
      if (data.success) {
        toast({ title: 'Saved', description: 'Holiday updated successfully' })
        fetchTimesheets()
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save Holiday', variant: 'destructive' })
    }
    
    setEditingHolidayForDate(null)
  }
  
  const handleCancelHolidayPicker = () => {
    setEditingHolidayForDate(null)
  }
  
  // Handle clearing Holiday directly
  const handleClearHoliday = async (date: string) => {
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
        holiday_hours: 0,
        time_in: existingTimesheet?.time_in || null,
        time_out: existingTimesheet?.time_out || null,
        pto_notes: existingTimesheet?.pto_notes || null,
        holiday_name: null
      }
      
      const res = await fetch('/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const data = await res.json()
      
      if (data.success) {
        toast({ title: 'Cleared', description: 'Holiday cleared' })
        fetchTimesheets()
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to clear Holiday', variant: 'destructive' })
    }
  }
  
  // Bulk selection handlers
  const handleToggleBulkMode = (field: 'time_in' | 'time_out' | 'pto') => {
    if (bulkSelectMode === field) {
      setBulkSelectMode(null)
      setBulkSelectedDates([])
    } else {
      setBulkSelectMode(field)
      setBulkSelectedDates([])
    }
  }
  
  const handleToggleBulkDate = (date: string) => {
    setBulkSelectedDates(prev => 
      prev.includes(date) 
        ? prev.filter(d => d !== date)
        : [...prev, date]
    )
  }
  
  const handleBulkSetTime = async (timeHHMM: string) => {
    if (!selectedEmployee || !bulkSelectMode || bulkSelectedDates.length === 0) return
    
    try {
      for (const date of bulkSelectedDates) {
        const existingTimesheet = timesheets.find(ts => ts.date === date)
        const [hours, minutes] = timeHHMM.split(':')
        const timeDate = new Date(date + 'T00:00:00')
        timeDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
        
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
        
        body[bulkSelectMode] = timeDate.toISOString()
        
        // Recalculate hours if both times are set
        if (body.time_in && body.time_out) {
          const totalHours = calculateHoursBetween(body.time_in, body.time_out)
          const weekNum = getWeekNumber(date)
          const existingWeeklyHours = calculateWeeklyHoursExcluding(weekNum, date)
          const availableRegularHours = Math.max(0, 40 - existingWeeklyHours)
          
          if (totalHours <= availableRegularHours) {
            body.regular_hours = Math.round(totalHours * 100) / 100
            body.overtime_hours = 0
          } else {
            body.regular_hours = Math.round(availableRegularHours * 100) / 100
            body.overtime_hours = Math.round((totalHours - availableRegularHours) * 100) / 100
          }
        }
        
        await fetch('/api/timesheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      }
      
      toast({ title: 'Success', description: `Updated ${bulkSelectedDates.length} entries` })
      fetchTimesheets()
      setBulkSelectMode(null)
      setBulkSelectedDates([])
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to bulk update', variant: 'destructive' })
    }
  }
  
  const handleBulkDelete = async () => {
    if (!selectedEmployee || !bulkSelectMode || bulkSelectedDates.length === 0) return
    
    try {
      for (const date of bulkSelectedDates) {
        const existingTimesheet = timesheets.find(ts => ts.date === date)
        
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
        
        body[bulkSelectMode] = null
        
        // Clear hours if one time is missing
        if (!body.time_in || !body.time_out) {
          body.regular_hours = 0
          body.overtime_hours = 0
        }
        
        await fetch('/api/timesheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      }
      
      toast({ title: 'Success', description: `Cleared ${bulkSelectedDates.length} entries` })
      fetchTimesheets()
      setBulkSelectMode(null)
      setBulkSelectedDates([])
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to bulk delete', variant: 'destructive' })
    }
  }
  
  // Handle Bulk PTO - set PTO hours and notes for multiple dates
  const handleBulkSetPTO = async (hours: number, notes: string) => {
    if (!selectedEmployee || bulkSelectedDates.length === 0) return
    
    try {
      for (const date of bulkSelectedDates) {
        const existingTimesheet = timesheets.find(ts => ts.date === date)
        
        const body: any = {
          employee_id: selectedEmployee.id,
          date,
          pay_period_start: payPeriod.start,
          pay_period_end: payPeriod.end,
          regular_hours: existingTimesheet?.regular_hours || 0,
          overtime_hours: existingTimesheet?.overtime_hours || 0,
          pto_hours: hours,
          holiday_hours: existingTimesheet?.holiday_hours || 0,
          time_in: existingTimesheet?.time_in || null,
          time_out: existingTimesheet?.time_out || null,
          pto_notes: notes,
          holiday_name: existingTimesheet?.holiday_name || null
        }
        
        await fetch('/api/timesheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      }
      
      toast({ title: 'Success', description: `Set PTO for ${bulkSelectedDates.length} days` })
      fetchTimesheets()
      setBulkSelectMode(null)
      setBulkSelectedDates([])
      setShowBulkPTOModal(false)
      setBulkPTOHours(8)
      setBulkPTONotes('')
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to bulk set PTO', variant: 'destructive' })
    }
  }
  
  // Handle Bulk Clear PTO
  const handleBulkClearPTO = async () => {
    if (!selectedEmployee || bulkSelectedDates.length === 0) return
    
    try {
      for (const date of bulkSelectedDates) {
        const existingTimesheet = timesheets.find(ts => ts.date === date)
        
        const body: any = {
          employee_id: selectedEmployee.id,
          date,
          pay_period_start: payPeriod.start,
          pay_period_end: payPeriod.end,
          regular_hours: existingTimesheet?.regular_hours || 0,
          overtime_hours: existingTimesheet?.overtime_hours || 0,
          pto_hours: 0,
          holiday_hours: existingTimesheet?.holiday_hours || 0,
          time_in: existingTimesheet?.time_in || null,
          time_out: existingTimesheet?.time_out || null,
          pto_notes: null,
          holiday_name: existingTimesheet?.holiday_name || null
        }
        
        await fetch('/api/timesheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      }
      
      toast({ title: 'Success', description: `Cleared PTO for ${bulkSelectedDates.length} days` })
      fetchTimesheets()
      setBulkSelectMode(null)
      setBulkSelectedDates([])
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to clear PTO', variant: 'destructive' })
    }
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
      <div className="print:hidden">
        <Header />
      </div>

      <main className="landing-page max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 print:hidden">
        <div className="px-4 py-6 sm:px-0">
          <PageNavigation backButtonText="Return to Dashboard" />

          {/* Page Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
            <div>
              <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Clock className="h-8 w-8" />
                Time Sheets
              </h2>
              <p className="mt-1 text-muted-foreground">
                {isAdmin ? 'Manage employee time tracking' : 'View your hours and clock in/out'}
              </p>
              {isAdmin && (
                <Link 
                  href="/timesheet-stats" 
                  className="mt-2 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <BarChart3 className="h-4 w-4" />
                  View Timesheet Stats
                </Link>
              )}
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
                  onClick={() => setShowClockOutConfirm(true)}
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
            <Card className="mb-6 border-slate-600 print:hidden" style={{ backgroundColor: '#1e293b' }}>
              <CardHeader className="pb-3" style={{ backgroundColor: '#1e3a5f', borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }}>
                <CardTitle className="text-xl flex items-center gap-2 text-white">
                  <Users className="h-6 w-6" />
                  Select Employee
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <select
                  value={selectedEmployee?.id || ''}
                  onChange={(e) => {
                    const emp = employees.find(emp => emp.id === e.target.value)
                    setSelectedEmployee(emp || null)
                  }}
                  className="w-full max-w-md p-3 text-lg border border-slate-600 rounded-md bg-slate-800 text-white"
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
          <Card className="mb-6 border-slate-600 print:hidden" style={{ backgroundColor: '#0f172a' }}>
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <Button
                  className="text-lg px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setPayPeriod(navigatePayPeriod(payPeriod.start, 'prev'))}
                >
                  <ChevronLeft className="h-5 w-5 mr-1" />
                  Previous
                </Button>
                
                <div className="text-center">
                  <div className="flex items-center gap-2 justify-center">
                    <Calendar className="h-6 w-6 text-white" />
                    <span className="font-bold text-2xl text-white">Pay Period</span>
                  </div>
                  <p className="text-xl text-slate-300">{payPeriod.label}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    className="text-lg px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => setPayPeriod(navigatePayPeriod(payPeriod.start, 'next'))}
                  >
                    Next
                    <ChevronRight className="h-5 w-5 ml-1" />
                  </Button>
                  {selectedEmployee && (
                    <Button
                      className="text-lg px-5 py-2 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => window.print()}
                    >
                      <Printer className="h-5 w-5 mr-1" />
                      Print
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee Name Header */}
          {selectedEmployee && (
            <div className="mb-4 p-5 rounded-lg border border-slate-600 print:border-black print:bg-white" style={{ backgroundColor: '#0f172a' }}>
              <h3 className="text-3xl font-bold text-white underline print:text-black">NAME: {selectedEmployee.name.toUpperCase()}</h3>
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
                <Card key={weekIndex} className="mb-6 border-slate-600" style={{ backgroundColor: '#1e293b' }}>
                  <CardHeader className="pb-2 py-4" style={{ backgroundColor: '#1e3a5f', borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }}>
                    <div className="flex items-center justify-between relative min-h-[48px]">
                      <div className="w-[160px] print:hidden"></div>
                      <CardTitle className="text-3xl font-bold text-white text-center flex-1 flex items-center justify-center">
                        WEEKLY TIME REPORT {formatDate(week.startDate)} - {formatDate(week.endDate)}
                      </CardTitle>
                      {isAdmin && (
                        <button
                          className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center gap-2 print:hidden"
                          onClick={() => handleFullTimeEmployee(weekIndex)}
                        >
                          <Clock className="h-4 w-4" />
                          Full Time Autofill
                        </button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto border border-slate-600 rounded-md" style={{ backgroundColor: '#0f172a' }}>
                      <table className="w-full text-lg border-collapse">
                        <thead>
                          <tr style={{ backgroundColor: '#1e3a5f' }}>
                            <th className="px-5 py-4 text-left font-semibold border border-slate-600 text-white text-xl">DAY</th>
                            <th className="px-5 py-4 text-left font-semibold border border-slate-600 text-white text-xl">DATE</th>
                            <th className="px-5 py-4 text-center font-semibold border border-slate-600 text-white text-xl">
                              <div className="flex items-center justify-center gap-1">
                                <span>TIME IN</span>
                                {isAdmin && (
                                  <button
                                    className={`p-1 rounded text-xs print:hidden ${bulkSelectMode === 'time_in' ? 'bg-blue-600 text-white' : 'hover:bg-blue-500/20 text-blue-400'}`}
                                    onClick={() => handleToggleBulkMode('time_in')}
                                    title="Bulk select"
                                  >
                                    ☑
                                  </button>
                                )}
                              </div>
                            </th>
                            <th className="px-5 py-4 text-center font-semibold border border-slate-600 text-white text-xl">
                              <div className="flex items-center justify-center gap-1">
                                <span>TIME OUT</span>
                                {isAdmin && (
                                  <button
                                    className={`p-1 rounded text-xs print:hidden ${bulkSelectMode === 'time_out' ? 'bg-blue-600 text-white' : 'hover:bg-blue-500/20 text-blue-400'}`}
                                    onClick={() => handleToggleBulkMode('time_out')}
                                    title="Bulk select"
                                  >
                                    ☑
                                  </button>
                                )}
                              </div>
                            </th>
                            <th className="px-5 py-4 text-center font-semibold border border-slate-600 text-white text-xl">REG. HOURS</th>
                            <th className="px-5 py-4 text-center font-semibold border border-slate-600 text-white text-xl">OVER TIME</th>
                            <th className="px-5 py-4 text-center font-semibold border border-slate-600 text-white text-xl">
                              <div className="flex items-center justify-center gap-1">
                                <span>PTO</span>
                                {isAdmin && (
                                  <button
                                    className={`p-1 rounded text-xs print:hidden ${bulkSelectMode === 'pto' ? 'bg-purple-600 text-white' : 'hover:bg-purple-500/20 text-purple-400'}`}
                                    onClick={() => handleToggleBulkMode('pto')}
                                    title="Bulk select PTO"
                                  >
                                    ☑
                                  </button>
                                )}
                              </div>
                            </th>
                            <th className="px-5 py-4 text-center font-semibold border border-slate-600 text-white text-xl">HOLIDAY</th>
                          </tr>
                        </thead>
                        <tbody>
                          {week.days.map((day, dayIndex) => (
                            <tr 
                              key={dayIndex} 
                              className="hover:brightness-110 transition-colors"
                              style={{ backgroundColor: dayIndex % 2 === 0 ? '#0f172a' : '#1e293b' }}
                            >
                              <td className="px-5 py-4 font-medium border border-slate-600 text-slate-200 text-xl">{day.dayName}</td>
                              <td className="px-5 py-4 border border-slate-600 text-slate-200 text-xl">{formatDate(day.date)}</td>
                              
                              {/* Time In - Editable by admin */}
                              <td className="px-5 py-4 text-center border border-slate-600 text-slate-200 text-xl">
                                <div className="flex items-center justify-center gap-1">
                                  {bulkSelectMode === 'time_in' && (
                                    <input
                                      type="checkbox"
                                      checked={bulkSelectedDates.includes(day.date)}
                                      onChange={() => handleToggleBulkDate(day.date)}
                                      className="h-4 w-4 rounded border-slate-600 print:hidden"
                                    />
                                  )}
                                  <span>{formatTime(day.timesheet?.time_in)}</span>
                                  {isAdmin && !bulkSelectMode && (
                                    <span className="print:hidden flex items-center gap-1">
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
                                    </span>
                                  )}
                                </div>
                              </td>
                              
                              {/* Time Out - Editable by admin */}
                              <td className="px-5 py-4 text-center border border-slate-600 text-slate-200 text-xl">
                                <div className="flex items-center justify-center gap-1">
                                  {bulkSelectMode === 'time_out' && (
                                    <input
                                      type="checkbox"
                                      checked={bulkSelectedDates.includes(day.date)}
                                      onChange={() => handleToggleBulkDate(day.date)}
                                      className="h-4 w-4 rounded border-slate-600 print:hidden"
                                    />
                                  )}
                                  <span>{formatTime(day.timesheet?.time_out)}</span>
                                  {isAdmin && !bulkSelectMode && (
                                    <span className="print:hidden flex items-center gap-1">
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
                                    </span>
                                  )}
                                </div>
                              </td>
                              
                              {/* Regular Hours */}
                              <td className="px-5 py-4 text-center border border-slate-600 text-slate-200 text-xl">
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
                                    {isAdmin && <Edit2 className="h-3 w-3 inline ml-1 opacity-30 print:hidden" />}
                                  </span>
                                )}
                              </td>
                              
                              {/* Overtime Hours */}
                              <td className="px-5 py-4 text-center border border-slate-600 text-slate-200 text-xl">
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
                                    {isAdmin && <Edit2 className="h-3 w-3 inline ml-1 opacity-30 print:hidden" />}
                                  </span>
                                )}
                              </td>
                              
                              {/* PTO Hours */}
                              <td className="px-5 py-4 text-center border border-slate-600 text-slate-200 text-xl">
                                <div className="flex items-center justify-center gap-1">
                                  {bulkSelectMode === 'pto' && (
                                    <input
                                      type="checkbox"
                                      checked={bulkSelectedDates.includes(day.date)}
                                      onChange={() => handleToggleBulkDate(day.date)}
                                      className="h-4 w-4 rounded border-slate-600 print:hidden"
                                    />
                                  )}
                                  <span>{day.timesheet?.pto_hours || '-'}</span>
                                  {isAdmin && (
                                    <span className="print:hidden flex items-center gap-1">
                                      <button
                                        className="p-1 rounded hover:bg-purple-500/20 text-purple-400"
                                        onClick={() => handleStartPTOEdit(day.date, day.timesheet)}
                                        title="Edit PTO"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      {day.timesheet?.pto_hours ? (
                                        <button
                                          className="p-1 rounded hover:bg-red-500/20 text-red-400"
                                          onClick={() => handleClearPTO(day.date)}
                                          title="Clear PTO"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      ) : null}
                                    </span>
                                  )}
                                </div>
                              </td>
                              
                              {/* Holiday Hours */}
                              <td className="px-5 py-4 text-center border border-slate-600 text-slate-200 text-xl">
                                <div className="flex items-center justify-center gap-1">
                                  <div className="flex flex-col items-center">
                                    <span>{day.timesheet?.holiday_hours || '-'}</span>
                                    {day.timesheet?.holiday_name && (
                                      <span className="text-xs text-white truncate max-w-[80px]" title={day.timesheet.holiday_name}>
                                        {day.timesheet.holiday_name}
                                      </span>
                                    )}
                                  </div>
                                  {isAdmin && (
                                    <span className="print:hidden flex items-center gap-1">
                                      <button
                                        className="p-1 rounded hover:bg-green-500/20 text-green-400"
                                        onClick={() => handleStartHolidayEdit(day.date, day.timesheet)}
                                        title="Edit Holiday"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      {day.timesheet?.holiday_hours ? (
                                        <button
                                          className="p-1 rounded hover:bg-red-500/20 text-red-400"
                                          onClick={() => handleClearHoliday(day.date)}
                                          title="Clear Holiday"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      ) : null}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                          
                          {/* Weekly Totals Row */}
                          <tr style={{ backgroundColor: '#334155' }}>
                            <td colSpan={4} className="px-5 py-4 text-right border border-slate-600 font-semibold text-white text-xl">TOTALS</td>
                            <td className="px-5 py-4 text-center border border-slate-600 font-semibold text-white text-xl">{week.totals.regular.toFixed(2)}</td>
                            <td className="px-5 py-4 text-center border border-slate-600 font-semibold text-white text-xl">{week.totals.overtime.toFixed(2)}</td>
                            <td className="px-5 py-4 text-center border border-slate-600 font-semibold text-white text-xl">{week.totals.pto.toFixed(2)}</td>
                            <td className="px-5 py-4 text-center border border-slate-600 font-semibold text-white text-xl">{week.totals.holiday.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Weekly Total Box */}
                    <div className="flex justify-end p-4 print:hidden">
                      <div className="border rounded-md p-3 bg-muted/30">
                        <span className="font-semibold">WEEKLY TOTAL: </span>
                        <span className="text-lg font-bold">{week.totals.total.toFixed(2)} hrs</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Pay Period Totals */}
              <Card className="border-slate-600" style={{ backgroundColor: '#1e293b' }}>
                <CardHeader className="py-4" style={{ backgroundColor: '#1e3a5f', borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }}>
                  <CardTitle className="text-3xl font-bold text-white underline text-center flex items-center justify-center">Pay Period Totals</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xl">
                      <thead>
                        <tr className="border-b border-slate-600">
                          <th className="p-4 text-center font-semibold text-white text-xl">REG. HOURS</th>
                          <th className="p-4 text-center font-semibold text-white text-xl">OVER TIME</th>
                          <th className="p-4 text-center font-semibold text-white text-xl">PTO</th>
                          <th className="p-4 text-center font-semibold text-white text-xl">HOLIDAY</th>
                          <th className="p-4 text-center font-semibold text-white text-xl">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="font-bold text-2xl">
                          <td className="p-4 text-center text-slate-200">{payPeriodTotals.regular.toFixed(2)}</td>
                          <td className="p-4 text-center text-slate-200">{payPeriodTotals.overtime.toFixed(2)}</td>
                          <td className="p-4 text-center text-slate-200">{payPeriodTotals.pto.toFixed(2)}</td>
                          <td className="p-4 text-center text-slate-200">{payPeriodTotals.holiday.toFixed(2)}</td>
                          <td className="p-4 text-center text-blue-400">{payPeriodTotals.total.toFixed(2)}</td>
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
      
      {/* PTO Picker Modal */}
      {editingPTOForDate && (
        <PTOPicker
          hours={editPTOHours}
          notes={editPTONotes}
          onSave={handleSavePTO}
          onCancel={handleCancelPTOPicker}
        />
      )}
      
      {/* Holiday Picker Modal */}
      {editingHolidayForDate && (
        <HolidayPicker
          hours={editHolidayHours}
          holidayName={editHolidayName}
          onSave={handleSaveHoliday}
          onCancel={handleCancelHolidayPicker}
        />
      )}
      
      {/* Bulk Action Bar */}
      {bulkSelectMode && bulkSelectedDates.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9000] bg-slate-800 border-2 border-slate-600 rounded-xl shadow-2xl p-4 flex items-center gap-4">
          <span className="text-white font-semibold">
            {bulkSelectedDates.length} selected for {bulkSelectMode === 'time_in' ? 'Time In' : bulkSelectMode === 'time_out' ? 'Time Out' : 'PTO'}
          </span>
          <div className="flex gap-2">
            {bulkSelectMode === 'pto' ? (
              <>
                <button
                  className="px-3 py-1.5 text-sm font-semibold rounded bg-purple-600 text-white hover:bg-purple-700"
                  onClick={() => setShowBulkPTOModal(true)}
                >
                  Set PTO Hours & Notes
                </button>
                <button
                  className="px-3 py-1.5 text-sm font-semibold rounded bg-red-600 text-white hover:bg-red-700"
                  onClick={handleBulkClearPTO}
                >
                  Clear PTO
                </button>
              </>
            ) : (
              <>
                <button
                  className="px-3 py-1.5 text-sm font-semibold rounded bg-slate-700 text-white hover:bg-slate-600"
                  onClick={() => handleBulkSetTime('09:00')}
                >
                  Set 9 AM
                </button>
                <button
                  className="px-3 py-1.5 text-sm font-semibold rounded bg-slate-700 text-white hover:bg-slate-600"
                  onClick={() => handleBulkSetTime('17:00')}
                >
                  Set 5 PM
                </button>
                <button
                  className="px-3 py-1.5 text-sm font-semibold rounded bg-red-600 text-white hover:bg-red-700"
                  onClick={handleBulkDelete}
                >
                  Clear Selected
                </button>
              </>
            )}
          </div>
          <button
            className="px-3 py-1.5 text-sm font-semibold rounded border border-slate-500 text-slate-300 hover:bg-slate-700"
            onClick={() => {
              setBulkSelectMode(null)
              setBulkSelectedDates([])
            }}
          >
            Cancel
          </button>
        </div>
      )}
      
      {/* Bulk PTO Modal */}
      {showBulkPTOModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/70 z-[9998]"
            onClick={() => setShowBulkPTOModal(false)}
          />
          <div 
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] rounded-xl shadow-2xl p-6 min-w-[400px]"
            style={{ backgroundColor: '#1e293b', border: '2px solid #334155' }}
          >
            <div className="text-lg font-bold text-white mb-4">Set PTO for {bulkSelectedDates.length} Days</div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">PTO Hours per Day</label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={bulkPTOHours}
                  onChange={(e) => setBulkPTOHours(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">PTO Notes (optional)</label>
                <input
                  type="text"
                  value={bulkPTONotes}
                  onChange={(e) => setBulkPTONotes(e.target.value)}
                  placeholder="e.g., Vacation, Sick day, etc."
                  className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-white placeholder-slate-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-5 py-2 text-sm font-semibold rounded border-2 border-slate-600 bg-slate-800 text-white hover:bg-slate-700 transition-all"
                onClick={() => setShowBulkPTOModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2 text-sm font-semibold rounded bg-purple-600 text-white hover:bg-purple-700 transition-all"
                onClick={() => handleBulkSetPTO(bulkPTOHours, bulkPTONotes)}
              >
                Apply to All Selected
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Clock Out Confirmation Dialog */}
      {showClockOutConfirm && (
        <>
          <div 
            className="fixed inset-0 bg-black/70 z-[9998]"
            onClick={() => setShowClockOutConfirm(false)}
          />
          <div 
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] rounded-xl shadow-2xl p-6 min-w-[340px]"
            style={{ backgroundColor: '#1e293b', border: '2px solid #334155' }}
          >
            <div className="text-lg font-bold text-white mb-4">Confirm Clock Out</div>
            <p className="text-slate-300 mb-6">Are you sure you want to clock out?</p>
            <div className="flex justify-end gap-3">
              <button
                className="px-5 py-2 text-sm font-semibold rounded border-2 border-slate-600 bg-slate-800 text-white hover:bg-slate-700 transition-all"
                onClick={() => setShowClockOutConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2 text-sm font-semibold rounded bg-red-600 text-white hover:bg-red-700 transition-all"
                onClick={() => {
                  setShowClockOutConfirm(false)
                  handleClock('clock_out')
                }}
              >
                Clock Out
              </button>
            </div>
          </div>
        </>
      )}

      {/* PRINT-ONLY SECTION - Hidden on screen, visible when printing */}
      {selectedEmployee && (
        <div className="print-only-section">
          {/* Employee Name */}
          <h1 style={{ fontSize: '18pt', fontWeight: 'bold', textDecoration: 'underline', margin: '0 0 8px 0', textAlign: 'center' }}>
            NAME: {selectedEmployee.name.toUpperCase()}
          </h1>

          {/* Week Tables */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} style={{ marginBottom: '6px' }}>
              {/* Week Header */}
              <h2 style={{ fontSize: '14pt', fontWeight: 'bold', textAlign: 'center', margin: '0 0 4px 0', backgroundColor: '#ddd', padding: '4px' }}>
                WEEKLY TIME REPORT {formatDate(week.startDate)} - {formatDate(week.endDate)}
              </h2>
              
              {/* Week Table - narrow columns */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11pt', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                </colgroup>
                <thead>
                  <tr style={{ backgroundColor: '#eee' }}>
                    <th style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>DAY</th>
                    <th style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>DATE</th>
                    <th style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>TIME IN</th>
                    <th style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>TIME OUT</th>
                    <th style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>REG HRS</th>
                    <th style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>OT HRS</th>
                    <th style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>PTO</th>
                    <th style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>HOLIDAY</th>
                  </tr>
                </thead>
                <tbody>
                  {week.days.map((day) => (
                    <tr key={day.date}>
                      <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>{day.dayName.substring(0, 3).toUpperCase()}</td>
                      <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>{formatDate(day.date)}</td>
                      <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>{formatTime(day.timesheet?.time_in) || '-'}</td>
                      <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>{formatTime(day.timesheet?.time_out) || '-'}</td>
                      <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>{day.timesheet?.regular_hours || '-'}</td>
                      <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>{day.timesheet?.overtime_hours || '-'}</td>
                      <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>{day.timesheet?.pto_hours || '-'}</td>
                      <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>{day.timesheet?.holiday_hours || '-'}</td>
                    </tr>
                  ))}
                  {/* Week Totals Row */}
                  <tr style={{ backgroundColor: '#ddd', fontWeight: 'bold' }}>
                    <td colSpan={4} style={{ border: '1px solid #000', padding: '3px', textAlign: 'right' }}>TOTALS</td>
                    <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>{week.totals.regular.toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>{week.totals.overtime.toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>{week.totals.pto.toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>{week.totals.holiday.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}

          {/* Pay Period Totals - immediately after, no extra margin */}
          <div style={{ marginTop: '6px' }}>
            <h2 style={{ fontSize: '14pt', fontWeight: 'bold', textAlign: 'center', textDecoration: 'underline', margin: '0 0 4px 0' }}>
              Pay Period Totals
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12pt', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: '#eee' }}>
                  <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>REG. HOURS</th>
                  <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>OVERTIME</th>
                  <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>PTO</th>
                  <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>HOLIDAY</th>
                  <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ fontWeight: 'bold', fontSize: '14pt' }}>
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{payPeriodTotals.regular.toFixed(2)}</td>
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{payPeriodTotals.overtime.toFixed(2)}</td>
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{payPeriodTotals.pto.toFixed(2)}</td>
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{payPeriodTotals.holiday.toFixed(2)}</td>
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{payPeriodTotals.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
