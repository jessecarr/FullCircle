'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Input } from '@/components/ui/input'
import { X, Calendar } from 'lucide-react'

interface HolidayPickerProps {
  hours: number
  holidayName: string
  onSave: (hours: number, holidayName: string) => void
  onCancel: () => void
}

// Federal holidays list
const FEDERAL_HOLIDAYS = [
  "New Year's Day",
  "Martin Luther King Jr. Day",
  "Presidents' Day",
  "Memorial Day",
  "Juneteenth",
  "Independence Day",
  "Labor Day",
  "Columbus Day",
  "Veterans Day",
  "Thanksgiving Day",
  "Christmas Day"
]

export function HolidayPicker({ hours, holidayName, onSave, onCancel }: HolidayPickerProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedHours, setSelectedHours] = useState(hours || 8)
  const [selectedHoliday, setSelectedHoliday] = useState(holidayName || '')
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Update state when props change
  useEffect(() => {
    setSelectedHours(hours || 8)
    setSelectedHoliday(holidayName || '')
  }, [hours, holidayName])
  
  // Close on escape key, save on enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter' && selectedHours > 0 && selectedHoliday) {
        e.preventDefault()
        onSave(selectedHours, selectedHoliday)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, onSave, selectedHours, selectedHoliday])
  
  const handleSave = () => {
    if (selectedHours > 0 && selectedHoliday) {
      onSave(selectedHours, selectedHoliday)
    }
  }
  
  // Quick hour presets
  const hourPresets = [4, 6, 8, 10]
  
  if (!mounted) return null
  
  const popupContent = (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 z-[9998]"
        onClick={onCancel}
      />
      {/* Popup */}
      <div 
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] rounded-xl shadow-2xl p-5 min-w-[380px]"
        style={{ backgroundColor: '#1e293b', border: '2px solid #334155' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-600">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <Calendar className="h-5 w-5 text-green-400" />
            Holiday Hours
          </div>
          <button 
            className="h-8 w-8 flex items-center justify-center rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            onClick={onCancel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Holiday Selection */}
        <div className="mb-5">
          <div className="text-sm text-slate-400 mb-2 font-medium">Select Holiday:</div>
          <select
            value={selectedHoliday}
            onChange={(e) => setSelectedHoliday(e.target.value)}
            className="w-full h-10 px-3 rounded border-2 border-slate-600 bg-slate-900 text-white font-medium focus:border-green-500 focus:outline-none"
          >
            <option value="">-- Select a holiday --</option>
            {FEDERAL_HOLIDAYS.map((holiday) => (
              <option key={holiday} value={holiday}>
                {holiday}
              </option>
            ))}
          </select>
        </div>
        
        {/* Hours Input */}
        <div className="mb-5">
          <div className="text-sm text-slate-400 mb-2 font-medium">Hours:</div>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={selectedHours}
              onChange={(e) => setSelectedHours(parseFloat(e.target.value) || 0)}
              className="w-24 h-10 text-center text-lg font-bold bg-slate-900 border-slate-600 text-white"
            />
            <div className="flex gap-2">
              {hourPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`px-3 py-1.5 text-sm font-semibold rounded border-2 transition-all ${
                    selectedHours === preset
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-slate-800 border-slate-600 text-white hover:bg-green-600 hover:border-green-600'
                  }`}
                  onClick={() => setSelectedHours(preset)}
                >
                  {preset}h
                </button>
              ))}
            </div>
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
            className={`px-5 py-2 text-sm font-semibold rounded text-white transition-all ${
              selectedHours > 0 && selectedHoliday
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-slate-600 cursor-not-allowed'
            }`}
            onClick={handleSave}
            disabled={!selectedHours || !selectedHoliday}
          >
            Save
          </button>
        </div>
      </div>
    </>
  )
  
  return createPortal(popupContent, document.body)
}
