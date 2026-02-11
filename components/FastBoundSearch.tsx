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

// Helper function to split batch-acquired items into individual entries and filter by search query
// When multiple items are acquired at once in FastBound, they may be stored with comma-separated values
function expandBatchItems(items: FastBoundItem[], searchQuery: string): FastBoundItem[] {
  const expanded: FastBoundItem[] = []
  const query = searchQuery.toLowerCase().trim()
  
  for (const item of items) {
    // Check if serial_number contains multiple values (comma-separated)
    // Serial numbers should be unique per firearm, so commas indicate batch data
    const serialNumbers = item.serial_number?.split(',').map(s => s.trim()).filter(s => s) || []
    
    if (serialNumbers.length > 1) {
      // This is a batch item - split into individual items
      const manufacturers = item.manufacturer?.split(',').map(s => s.trim()) || []
      const models = item.model?.split(',').map(s => s.trim()) || []
      const calibers = item.caliber?.split(',').map(s => s.trim()) || []
      const firearmTypes = item.firearm_type?.split(',').map(s => s.trim()) || []
      const controlNumbers = item.control_number?.split(',').map(s => s.trim()) || []
      
      for (let i = 0; i < serialNumbers.length; i++) {
        const individualItem: FastBoundItem = {
          ...item,
          id: `${item.id}-${i}`, // Create unique ID for each split item
          serial_number: serialNumbers[i] || null,
          manufacturer: manufacturers[i] || manufacturers[0] || null,
          model: models[i] || models[0] || null,
          caliber: calibers[i] || calibers[0] || null,
          firearm_type: firearmTypes[i] || firearmTypes[0] || null,
          control_number: controlNumbers[i] || controlNumbers[0] || null,
        }
        
        // Only include items that match the search query
        const matchesQuery = 
          (individualItem.serial_number?.toLowerCase().includes(query)) ||
          (individualItem.control_number?.toLowerCase().includes(query)) ||
          (individualItem.manufacturer?.toLowerCase().includes(query)) ||
          (individualItem.model?.toLowerCase().includes(query))
        
        if (matchesQuery) {
          expanded.push(individualItem)
        }
      }
    } else {
      // Single item - add as-is (already matched by database query)
      expanded.push(item)
    }
  }
  
  return expanded
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
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
        // Split batch-acquired items (those with comma-separated values) into individual items
        // Filter to only show items that match the search query
        const expandedResults = expandBatchItems(data || [], searchQuery)
        setResults(expandedResults)
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
    <div ref={wrapperRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full p-3 rounded bg-[rgba(17, 24, 39, 0.8)] text-white placeholder-[#9ca3af] text-base"
        style={{
          border: 'none',
          outline: 'none'
        }}
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
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '0.375rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.8)',
            maxHeight: '240px',
            overflow: 'auto',
            backdropFilter: 'blur(10px)',
            padding: '8px'
          }}
        >
          {results.map((item, index) => (
            <div
              key={item.id}
              data-dropdown-item
              onClick={() => handleSelect(item)}
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(item)
              }}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                userSelect: 'none',
                borderRadius: '0.5rem',
                marginBottom: index < results.length - 1 ? '8px' : '0',
                transition: 'all 0.2s ease',
                background: index === highlightedIndex || hoveredIndex === index
                  ? 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.25) 0%, rgba(26, 26, 26, 0.8) 50%, rgba(10, 10, 10, 0.9) 100%)'
                  : 'radial-gradient(circle at 50% 50%, rgba(26, 26, 26, 0.8) 0%, rgba(10, 10, 10, 0.9) 70%, rgba(0, 0, 0, 0.95) 100%)',
                backdropFilter: 'blur(10px)',
                boxShadow: index === highlightedIndex || hoveredIndex === index
                  ? '0 10px 20px rgba(59, 130, 246, 0.25), 0 8px 32px rgba(0, 0, 0, 0.8)'
                  : '0 8px 32px rgba(0, 0, 0, 0.8)',
                borderTop: index === highlightedIndex || hoveredIndex === index ? '2px solid rgba(59, 130, 246, 0.6)' : '1px solid rgba(59, 130, 246, 0.3)',
                borderRight: index === highlightedIndex || hoveredIndex === index ? '2px solid rgba(59, 130, 246, 0.6)' : '1px solid rgba(59, 130, 246, 0.3)',
                borderLeft: index === highlightedIndex || hoveredIndex === index ? '2px solid rgba(59, 130, 246, 0.6)' : '1px solid rgba(59, 130, 246, 0.3)',
                borderBottom: index === highlightedIndex || hoveredIndex === index ? '2px solid rgba(59, 130, 246, 0.6)' : '1px solid rgba(59, 130, 246, 0.3)',
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div style={{ fontSize: '16px', fontWeight: '500', color: 'white' }}>
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
