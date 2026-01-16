'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Clock } from 'lucide-react'

interface TimePickerProps {
  timeIn: string // HH:MM format (24-hour)
  timeOut: string // HH:MM format (24-hour)
  onSave: (timeIn: string, timeOut: string) => void
  onCancel: () => void
}

export function TimePicker({ timeIn, timeOut, onSave, onCancel }: TimePickerProps) {
  const popupRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [activeField, setActiveField] = useState<'in' | 'out'>('in')
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Parse time string to get hour, minute, and period
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hour: '9', minute: '00', period: 'AM' as 'AM' | 'PM' }
    const [h, m] = timeStr.split(':').map(Number)
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
    return { 
      hour: hour.toString(), 
      minute: (m || 0).toString().padStart(2, '0'), 
      period 
    }
  }
  
  // Convert to 24-hour HH:MM format
  const to24Hour = (h: string, m: string, p: 'AM' | 'PM'): string => {
    let hour24 = parseInt(h) || 0
    if (p === 'PM' && hour24 !== 12) hour24 += 12
    if (p === 'AM' && hour24 === 12) hour24 = 0
    return `${hour24.toString().padStart(2, '0')}:${m.padStart(2, '0')}`
  }
  
  const initialIn = parseTime(timeIn)
  const initialOut = parseTime(timeOut)
  
  const [inHour, setInHour] = useState(initialIn.hour)
  const [inMinute, setInMinute] = useState(initialIn.minute)
  const [inPeriod, setInPeriod] = useState<'AM' | 'PM'>(initialIn.period)
  
  const [outHour, setOutHour] = useState(initialOut.hour)
  const [outMinute, setOutMinute] = useState(initialOut.minute)
  const [outPeriod, setOutPeriod] = useState<'AM' | 'PM'>(initialOut.period)
  
  // Preset times (9am to 5pm)
  const presetTimes = [
    { label: '9:00 AM', hour: 9, minute: 0 },
    { label: '10:00 AM', hour: 10, minute: 0 },
    { label: '11:00 AM', hour: 11, minute: 0 },
    { label: '12:00 PM', hour: 12, minute: 0 },
    { label: '1:00 PM', hour: 13, minute: 0 },
    { label: '2:00 PM', hour: 14, minute: 0 },
    { label: '3:00 PM', hour: 15, minute: 0 },
    { label: '4:00 PM', hour: 16, minute: 0 },
    { label: '5:00 PM', hour: 17, minute: 0 },
  ]
  
  // Handle hour input change
  const handleHourChange = (val: string, field: 'in' | 'out') => {
    const num = parseInt(val) || 0
    if (num >= 0 && num <= 12) {
      if (field === 'in') setInHour(val)
      else setOutHour(val)
    }
  }
  
  // Handle minute input change
  const handleMinuteChange = (val: string, field: 'in' | 'out') => {
    const num = parseInt(val) || 0
    if (num >= 0 && num <= 59) {
      const padded = val.length === 1 && num > 5 ? val.padStart(2, '0') : val
      if (field === 'in') setInMinute(padded)
      else setOutMinute(padded)
    }
  }
  
  // Handle period toggle
  const handlePeriodChange = (p: 'AM' | 'PM', field: 'in' | 'out') => {
    if (field === 'in') setInPeriod(p)
    else setOutPeriod(p)
  }
  
  // Handle preset click - applies to active field
  const handlePresetClick = (preset: { hour: number; minute: number }) => {
    const h = preset.hour === 0 ? 12 : preset.hour > 12 ? preset.hour - 12 : preset.hour
    const p: 'AM' | 'PM' = preset.hour >= 12 ? 'PM' : 'AM'
    const m = preset.minute.toString().padStart(2, '0')
    
    if (activeField === 'in') {
      setInHour(h.toString())
      setInMinute(m)
      setInPeriod(p)
      setActiveField('out') // Auto-switch to out after selecting in
    } else {
      setOutHour(h.toString())
      setOutMinute(m)
      setOutPeriod(p)
    }
  }
  
  const handleSave = () => {
    const finalTimeIn = to24Hour(inHour, inMinute, inPeriod)
    const finalTimeOut = to24Hour(outHour, outMinute, outPeriod)
    onSave(finalTimeIn, finalTimeOut)
  }
  
  // Close on escape key, save on enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, inHour, inMinute, inPeriod, outHour, outMinute, outPeriod])
  
  if (!mounted) return null
  
  // Time input row component
  const TimeInputRow = ({ 
    label, 
    hour, 
    minute, 
    period, 
    field,
    isActive 
  }: { 
    label: string
    hour: string
    minute: string
    period: 'AM' | 'PM'
    field: 'in' | 'out'
    isActive: boolean
  }) => (
    <div 
      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
        isActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
      }`}
      onClick={() => setActiveField(field)}
    >
      <div className="text-xs text-slate-400 mb-2 font-medium">{label}</div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="1"
          max="12"
          value={hour}
          onChange={(e) => handleHourChange(e.target.value, field)}
          onFocus={() => setActiveField(field)}
          className="w-14 h-9 text-center text-lg font-bold bg-slate-900 border-slate-600 text-white"
        />
        <span className="text-xl font-bold text-white">:</span>
        <Input
          type="number"
          min="0"
          max="59"
          value={minute}
          onChange={(e) => handleMinuteChange(e.target.value, field)}
          onFocus={() => setActiveField(field)}
          className="w-14 h-9 text-center text-lg font-bold bg-slate-900 border-slate-600 text-white"
        />
        <div className="flex ml-2">
          <button
            type="button"
            className={`px-3 py-1.5 text-sm font-bold rounded-l border-2 transition-all ${
              period === 'AM' 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
            }`}
            onClick={() => handlePeriodChange('AM', field)}
          >
            AM
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-sm font-bold rounded-r border-2 border-l-0 transition-all ${
              period === 'PM' 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
            }`}
            onClick={() => handlePeriodChange('PM', field)}
          >
            PM
          </button>
        </div>
      </div>
    </div>
  )
  
  const popupContent = (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 z-[9998]"
        onClick={onCancel}
      />
      {/* Popup */}
      <div 
        ref={popupRef}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] rounded-xl shadow-2xl p-5 min-w-[380px]"
        style={{ backgroundColor: '#1e293b', border: '2px solid #334155' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-600">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <Clock className="h-5 w-5 text-blue-400" />
            Edit Time
          </div>
          <button 
            className="h-8 w-8 flex items-center justify-center rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            onClick={onCancel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Time In / Time Out Inputs */}
        <div className="space-y-3 mb-5">
          <TimeInputRow 
            label="TIME IN"
            hour={inHour}
            minute={inMinute}
            period={inPeriod}
            field="in"
            isActive={activeField === 'in'}
          />
          <TimeInputRow 
            label="TIME OUT"
            hour={outHour}
            minute={outMinute}
            period={outPeriod}
            field="out"
            isActive={activeField === 'out'}
          />
        </div>
        
        {/* Quick Select */}
        <div className="mb-5">
          <div className="text-xs text-slate-400 mb-2 font-medium">
            Quick select for {activeField === 'in' ? 'TIME IN' : 'TIME OUT'}:
          </div>
          <div className="grid grid-cols-3 gap-2">
            {presetTimes.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="h-9 text-sm font-semibold rounded border-2 border-slate-600 bg-slate-800 text-white hover:bg-blue-600 hover:border-blue-600 transition-all"
                onClick={() => handlePresetClick(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-600">
          <button
            className="px-5 py-2 text-sm font-semibold rounded border-2 border-slate-600 bg-slate-800 text-white hover:bg-slate-700 transition-all"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-5 py-2 text-sm font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition-all"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </>
  )
  
  return createPortal(popupContent, document.body)
}
