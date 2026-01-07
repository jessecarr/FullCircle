'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'

interface FastBoundItem {
  id: string
  fastbound_item_id: string
  control_number: string | null
  firearm_type: string | null
  manufacturer: string | null
  model: string | null
  caliber: string | null
  serial_number: string | null
  status: string
  price: number | null
}

interface FastBoundSearchProps {
  onSelect: (item: FastBoundItem) => void
  placeholder?: string
  value?: string
  className?: string
}

export default function FastBoundSearch({ 
  onSelect, 
  placeholder = "Search by control number...",
  value = "",
  className = ""
}: FastBoundSearchProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<FastBoundItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      const updatePosition = () => {
        const rect = inputRef.current?.getBoundingClientRect()
        if (rect) {
          setDropdownPosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width
          })
        }
      }
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isOpen, results])

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery)
    
    if (!searchQuery.trim()) {
      setResults([])
      setIsOpen(false)
      return
    }

    setLoading(true)
    try {
      const searchTerm = `%${searchQuery}%`
      
      const { data, error } = await supabase
        .from('fastbound_inventory')
        .select('*')
        .eq('status', 'in_stock')
        .or(`serial_number.ilike.${searchTerm},manufacturer.ilike.${searchTerm},model.ilike.${searchTerm},control_number.ilike.${searchTerm}`)
        .limit(10)

      if (error) {
        console.error('FastBound search error:', error)
        setResults([])
      } else {
        setResults(data || [])
        setIsOpen(true)
        setHighlightedIndex(0) // Auto-highlight first result when new results arrive
      }
    } catch (err) {
      console.error('FastBound search error:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (item: FastBoundItem) => {
    onSelect(item)
    setQuery('') // Clear the search field
    setIsOpen(false)
    setResults([])
    setHighlightedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => {
          const newIndex = prev < results.length - 1 ? prev + 1 : 0
          return newIndex
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : results.length - 1
          return newIndex
        })
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelect(results[highlightedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  return (
    <div ref={wrapperRef} className={`search-component relative ${className}`}>
      <Input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full text-base"
      />
      
      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-gray-500 rounded-full border-t-transparent"></div>
        </div>
      )}

      {isOpen && results.length > 0 && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 99999
          }}
          className="bg-[rgba(17, 24, 39, 0.98)] border border-[rgba(59, 130, 246, 0.3)] rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {results.map((item, index) => (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              className={`px-4 py-3 cursor-pointer border-b border-[rgba(59, 130, 246, 0.2)] last:border-b-0 ${
                index === highlightedIndex 
                  ? 'bg-[rgba(59, 130, 246, 0.2)]' 
                  : 'hover:bg-[rgba(59, 130, 246, 0.1)]'
              }`}
            >
              <div className="font-medium text-sm text-white">
                {item.manufacturer} {item.model}
              </div>
              <div className="text-xs text-[#9ca3af] mt-1">
                <span className="mr-3">Serial: {item.serial_number || 'N/A'}</span>
                <span className="mr-3">Type: {item.firearm_type || 'N/A'}</span>
                <span>Caliber: {item.caliber || 'N/A'}</span>
              </div>
              {item.price && (
                <div className="text-xs text-green-400 mt-1">
                  Price: ${item.price.toFixed(2)}
                </div>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}

      {isOpen && results.length === 0 && query.trim() && !loading && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 99999
          }}
          className="bg-[rgba(17, 24, 39, 0.98)] border border-[rgba(59, 130, 246, 0.3)] rounded-md shadow-lg p-4 text-center text-[#9ca3af] text-sm"
        >
          No items found in inventory
        </div>,
        document.body
      )}
    </div>
  )
}
