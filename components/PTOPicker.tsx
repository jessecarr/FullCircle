'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Input } from '@/components/ui/input'
import { X, Clock } from 'lucide-react'

interface PTOPickerProps {
  hours: number
  notes: string
  onSave: (hours: number, notes: string) => void
  onCancel: () => void
}

export function PTOPicker({ hours, notes, onSave, onCancel }: PTOPickerProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedHours, setSelectedHours] = useState(hours || 8)
  const [ptoNotes, setPtoNotes] = useState(notes || '')
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Close on escape key, save on enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter' && selectedHours > 0) {
        e.preventDefault()
        onSave(selectedHours, ptoNotes)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, onSave, selectedHours, ptoNotes])
  
  const handleSave = () => {
    if (selectedHours > 0) {
      onSave(selectedHours, ptoNotes)
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
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] rounded-xl shadow-2xl p-5 min-w-[400px]"
        style={{ backgroundColor: '#1e293b', border: '2px solid #334155' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-600">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <Clock className="h-5 w-5 text-purple-400" />
            PTO Hours
          </div>
          <button 
            className="h-8 w-8 flex items-center justify-center rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            onClick={onCancel}
          >
            <X className="h-5 w-5" />
          </button>
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
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-slate-800 border-slate-600 text-white hover:bg-purple-600 hover:border-purple-600'
                  }`}
                  onClick={() => setSelectedHours(preset)}
                >
                  {preset}h
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Notes Input */}
        <div className="mb-5">
          <div className="text-sm text-slate-400 mb-2 font-medium">Reason / Notes:</div>
          <textarea
            value={ptoNotes}
            onChange={(e) => setPtoNotes(e.target.value)}
            placeholder="Enter reason for PTO (e.g., Doctor's appointment, Vacation, Personal day...)"
            className="w-full h-24 px-3 py-2 rounded border-2 border-slate-600 bg-slate-900 text-white font-medium focus:border-purple-500 focus:outline-none resize-none"
          />
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
              selectedHours > 0
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-slate-600 cursor-not-allowed'
            }`}
            onClick={handleSave}
            disabled={!selectedHours}
          >
            Save
          </button>
        </div>
      </div>
    </>
  )
  
  return createPortal(popupContent, document.body)
}
