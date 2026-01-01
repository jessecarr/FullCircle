'use client'

import { useState, useEffect, useRef } from 'react'
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
  placeholder = "Search inventory by serial, manufacturer, or model...",
  value = "",
  className = ""
}: FastBoundSearchProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<FastBoundItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

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
    setQuery(`${item.manufacturer} ${item.model} - ${item.serial_number || 'N/A'}`)
    setIsOpen(false)
    setResults([])
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <Input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        className="w-full text-base"
      />
      
      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-gray-500 rounded-full border-t-transparent"></div>
        </div>
      )}

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {results.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
            >
              <div className="font-medium text-sm">
                {item.manufacturer} {item.model}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                <span className="mr-3">Serial: {item.serial_number || 'N/A'}</span>
                <span className="mr-3">Type: {item.firearm_type || 'N/A'}</span>
                <span>Caliber: {item.caliber || 'N/A'}</span>
              </div>
              {item.price && (
                <div className="text-xs text-green-600 mt-1">
                  Price: ${item.price.toFixed(2)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isOpen && results.length === 0 && query.trim() && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4 text-center text-gray-500 text-sm">
          No items found in inventory
        </div>
      )}
    </div>
  )
}
