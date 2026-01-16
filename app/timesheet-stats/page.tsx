'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Calendar, Users, Clock } from 'lucide-react'
import Link from 'next/link'

interface Employee {
  id: string
  name: string
  email: string
}

interface PTOStats {
  employee_id: string
  employee_name: string
  total_pto_hours: number
  total_pto_days: number
  entries: {
    date: string
    hours: number
    notes: string | null
  }[]
}

export default function TimesheetStatsPage() {
  const { user, loading, userRole } = useAuth()
  const router = useRouter()
  const isAdmin = userRole === 'admin'
  
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [ptoStats, setPtoStats] = useState<PTOStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Generate year options (current year and 5 years back)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 6 }, (_, i) => (currentYear - i).toString())
  
  // Redirect non-admins
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/landing')
    }
  }, [loading, isAdmin, router])
  
  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch('/api/admin/users')
        if (res.ok) {
          const data = await res.json()
          setEmployees(data.users || [])
        }
      } catch (error) {
        console.error('Failed to fetch employees:', error)
      }
    }
    
    if (isAdmin) {
      fetchEmployees()
    }
  }, [isAdmin])
  
  // Fetch PTO stats for selected year
  useEffect(() => {
    const fetchPTOStats = async () => {
      if (!isAdmin || employees.length === 0) return
      
      setIsLoading(true)
      try {
        const startDate = `${selectedYear}-01-01`
        const endDate = `${selectedYear}-12-31`
        
        // Fetch all timesheets for the year
        const res = await fetch(`/api/timesheets?is_admin=true&pay_period_start=${startDate}&pay_period_end=${endDate}`)
        if (!res.ok) throw new Error('Failed to fetch timesheets')
        
        const data = await res.json()
        const timesheets = data.timesheets || []
        
        // Calculate PTO stats per employee
        const statsMap = new Map<string, PTOStats>()
        
        employees.forEach(emp => {
          statsMap.set(emp.id, {
            employee_id: emp.id,
            employee_name: emp.name,
            total_pto_hours: 0,
            total_pto_days: 0,
            entries: []
          })
        })
        
        timesheets.forEach((ts: any) => {
          if (ts.pto_hours && ts.pto_hours > 0) {
            const stats = statsMap.get(ts.employee_id)
            if (stats) {
              stats.total_pto_hours += ts.pto_hours
              stats.entries.push({
                date: ts.date,
                hours: ts.pto_hours,
                notes: ts.pto_notes
              })
            }
          }
        })
        
        // Calculate days (assuming 8 hours = 1 day)
        statsMap.forEach(stats => {
          stats.total_pto_days = stats.total_pto_hours / 8
          stats.entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        })
        
        setPtoStats(Array.from(statsMap.values()).sort((a, b) => a.employee_name.localeCompare(b.employee_name)))
      } catch (error) {
        console.error('Failed to fetch PTO stats:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPTOStats()
  }, [isAdmin, employees, selectedYear])
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  if (!isAdmin) {
    return null
  }
  
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link 
          href="/settings" 
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Timesheet Statistics</h1>
          <p className="text-muted-foreground">View PTO usage by employee</p>
        </div>
      </div>
      
      {/* Year Selector */}
      <Card className="mb-6 border-slate-600" style={{ backgroundColor: '#1e293b' }}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-blue-400" />
            <span className="font-medium text-white">Select Year:</span>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32 bg-slate-800 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Summary Card */}
      <Card className="mb-6 border-slate-600" style={{ backgroundColor: '#1e293b' }}>
        <CardHeader style={{ backgroundColor: '#1e3a5f', borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }}>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            PTO Summary for {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading statistics...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ backgroundColor: '#334155' }}>
                    <th className="px-4 py-3 text-left font-semibold border border-slate-600 text-white">Employee</th>
                    <th className="px-4 py-3 text-center font-semibold border border-slate-600 text-white">PTO Hours</th>
                    <th className="px-4 py-3 text-center font-semibold border border-slate-600 text-white">PTO Days</th>
                    <th className="px-4 py-3 text-center font-semibold border border-slate-600 text-white"># of Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {ptoStats.map((stats, index) => (
                    <tr 
                      key={stats.employee_id}
                      style={{ backgroundColor: index % 2 === 0 ? '#0f172a' : '#1e293b' }}
                    >
                      <td className="px-4 py-3 font-medium border border-slate-600 text-slate-200">
                        {stats.employee_name}
                      </td>
                      <td className="px-4 py-3 text-center border border-slate-600 text-slate-200">
                        {stats.total_pto_hours.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-center border border-slate-600 text-slate-200">
                        <span className={stats.total_pto_days > 0 ? 'text-purple-400 font-semibold' : ''}>
                          {stats.total_pto_days.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center border border-slate-600 text-slate-200">
                        {stats.entries.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#334155' }}>
                    <td className="px-4 py-3 font-bold border border-slate-600 text-white">TOTAL</td>
                    <td className="px-4 py-3 text-center font-bold border border-slate-600 text-white">
                      {ptoStats.reduce((sum, s) => sum + s.total_pto_hours, 0).toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-center font-bold border border-slate-600 text-purple-400">
                      {ptoStats.reduce((sum, s) => sum + s.total_pto_days, 0).toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-center font-bold border border-slate-600 text-white">
                      {ptoStats.reduce((sum, s) => sum + s.entries.length, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Detailed Breakdown per Employee */}
      {!isLoading && ptoStats.filter(s => s.entries.length > 0).map(stats => (
        <Card key={stats.employee_id} className="mb-4 border-slate-600" style={{ backgroundColor: '#1e293b' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-400" />
              {stats.employee_name} - PTO Details
              <span className="ml-auto text-sm font-normal text-purple-400">
                {stats.total_pto_days.toFixed(1)} days ({stats.total_pto_hours.toFixed(1)} hrs)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {stats.entries.map((entry, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-slate-800/50 border border-slate-700"
                >
                  <div>
                    <span className="text-slate-200 font-medium">{formatDate(entry.date)}</span>
                    {entry.notes && (
                      <span className="text-xs text-purple-400 ml-2">({entry.notes})</span>
                    )}
                  </div>
                  <span className="text-slate-400">{entry.hours} hrs</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      
      {!isLoading && ptoStats.every(s => s.entries.length === 0) && (
        <Card className="border-slate-600" style={{ backgroundColor: '#1e293b' }}>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-500" />
            <p className="text-slate-400">No PTO entries found for {selectedYear}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
