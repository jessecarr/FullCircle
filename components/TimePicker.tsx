'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Clock } from 'lucide-react'

interface TimePickerProps {
  value: string // HH:MM format (24-hour)
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

export function TimePicker({ value, onChange, onSave, onCancel }: TimePickerProps) {
  const popupRef = useRef<HTMLDivElement>(null)
  
  // Parse initial value to get hour, minute, and period
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hour: '9', minute: '00', period: 'AM' }
    const [h, m] = timeStr.split(':').map(Number)
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
    const period = h >= 12 ? 'PM' : 'AM'
    return { 
      hour: hour.toString(), 
      minute: (m || 0).toString().padStart(2, '0'), 
      period 
    }
  }
  
  const initialParsed = parseTime(value)
  const [hour, setHour] = useState(initialParsed.hour)
  const [minute, setMinute] = useState(initialParsed.minute)
  const [period, setPeriod] = useState<'AM' | 'PM'>(initialParsed.period as 'AM' | 'PM')
  
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
  
  // Convert to 24-hour format and update parent
  const updateTime = (h: string, m: string, p: 'AM' | 'PM') => {
    let hour24 = parseInt(h) || 0
    if (p === 'PM' && hour24 !== 12) hour24 += 12
    if (p === 'AM' && hour24 === 12) hour24 = 0
    const formatted = `${hour24.toString().padStart(2, '0')}:${m.padStart(2, '0')}`
    onChange(formatted)
  }
  
  // Handle hour input change
  const handleHourChange = (val: string) => {
    const num = parseInt(val) || 0
    if (num >= 0 && num <= 12) {
      setHour(val)
      updateTime(val, minute, period)
    }
  }
  
  // Handle minute input change
  const handleMinuteChange = (val: string) => {
    const num = parseInt(val) || 0
    if (num >= 0 && num <= 59) {
      const padded = val.length === 1 && num > 5 ? val.padStart(2, '0') : val
      setMinute(padded)
      updateTime(hour, padded, period)
    }
  }
  
  // Handle period toggle
  const handlePeriodChange = (p: 'AM' | 'PM') => {
    setPeriod(p)
    updateTime(hour, minute, p)
  }
  
  // Handle preset click
  const handlePresetClick = (preset: { hour: number; minute: number }) => {
    const h = preset.hour === 0 ? 12 : preset.hour > 12 ? preset.hour - 12 : preset.hour
    const p = preset.hour >= 12 ? 'PM' : 'AM'
    const m = preset.minute.toString().padStart(2, '0')
    
    setHour(h.toString())
    setMinute(m)
    setPeriod(p as 'AM' | 'PM')
    
    // Update parent with 24-hour format
    const formatted = `${preset.hour.toString().padStart(2, '0')}:${m}`
    onChange(formatted)
  }
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onCancel()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onCancel])
  
  return (
    <div 
      ref={popupRef}
      className="absolute z-50 bg-background border border-border rounded-lg shadow-lg p-4 min-w-[280px]"
      style={{ top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '4px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4" />
          Select Time
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Manual Input Section */}
      <div className="mb-4">
        <div className="text-xs text-muted-foreground mb-2">Enter time manually:</div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="1"
            max="12"
            value={hour}
            onChange={(e) => handleHourChange(e.target.value)}
            className="w-14 h-9 text-center"
            placeholder="HH"
          />
          <span className="text-lg font-bold">:</span>
          <Input
            type="number"
            min="0"
            max="59"
            value={minute}
            onChange={(e) => handleMinuteChange(e.target.value)}
            className="w-14 h-9 text-center"
            placeholder="MM"
          />
          <div className="flex border rounded-md overflow-hidden">
            <Button
              type="button"
              variant={period === 'AM' ? 'default' : 'ghost'}
              size="sm"
              className="h-9 rounded-none px-3"
              onClick={() => handlePeriodChange('AM')}
            >
              AM
            </Button>
            <Button
              type="button"
              variant={period === 'PM' ? 'default' : 'ghost'}
              size="sm"
              className="h-9 rounded-none px-3"
              onClick={() => handlePeriodChange('PM')}
            >
              PM
            </Button>
          </div>
        </div>
      </div>
      
      {/* Preset Times */}
      <div className="mb-4">
        <div className="text-xs text-muted-foreground mb-2">Quick select:</div>
        <div className="grid grid-cols-3 gap-2">
          {presetTimes.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => handlePresetClick(preset)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave}>
          Save
        </Button>
      </div>
    </div>
  )
}
