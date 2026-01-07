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
            top: rect.bottom,
            left: rect.left,
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
          // Scroll the new highlighted item into view
          setTimeout(() => {
            const dropdown = document.querySelector('[data-fastbound-dropdown]')
            const items = dropdown?.querySelectorAll('[data-dropdown-item]')
            if (items && items[newIndex]) {
              items[newIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }
          }, 0)
          return newIndex
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : results.length - 1
          // Scroll the new highlighted item into view
          setTimeout(() => {
            const dropdown = document.querySelector('[data-fastbound-dropdown]')
            const items = dropdown?.querySelectorAll('[data-dropdown-item]')
            if (items && items[newIndex]) {
              items[newIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }
          }, 0)
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

      {isOpen && results.length > 0 && typeof window !== 'undefined' && createPortal(
        <div 
          data-fastbound-dropdown
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 999999999,
            backgroundColor: 'rgba(17, 24, 39, 0.98)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '0.375rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.8)',
            maxHeight: '240px',
            overflow: 'auto'
          }}
        >
          {results.map((item, index) => (
            <div
              key={item.id}
              data-dropdown-item
              onClick={() => handleSelect(item)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: index < results.length - 1 ? '1px solid rgba(59, 130, 246, 0.2)' : 'none',
                backgroundColor: index === highlightedIndex ? 'rgba(59, 130, 246, 0.2)' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (index !== highlightedIndex) {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'
                }
              }}
              onMouseLeave={(e) => {
                if (index !== highlightedIndex) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'white' }}>
                {item.manufacturer} {item.model}
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                <span style={{ marginRight: '12px' }}>Serial: {item.serial_number || 'N/A'}</span>
                <span style={{ marginRight: '12px' }}>Type: {item.firearm_type || 'N/A'}</span>
                <span>Caliber: {item.caliber || 'N/A'}</span>
              </div>
              {item.price && (
                <div style={{ fontSize: '12px', color: '#4ade80', marginTop: '4px' }}>
                  Price: ${item.price.toFixed(2)}
                </div>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}

      {isOpen && results.length === 0 && query.trim() && !loading && typeof window !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 999999999,
            backgroundColor: 'rgba(17, 24, 39, 0.98)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '0.375rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.8)',
            padding: '16px',
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: '14px'
          }}
        >
          No items found in inventory
        </div>,
        document.body
      )}
    </div>
  )
}
