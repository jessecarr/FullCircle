'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Search, RefreshCw, Building2, MapPin, Phone, X } from 'lucide-react'
import { FFLContact } from '@/lib/fflTypes'

interface FFLSearchProps {
  onSelect: (ffl: FFLContact) => void
  placeholder?: string
  label?: string
  showSyncButton?: boolean
  className?: string
}

export default function FFLSearch({
  onSelect,
  placeholder = 'Search by FFL number (1-23-456-01-2A-12345) or business name...',
  label = 'FFL Search',
  showSyncButton = true,
  className = ''
}: FFLSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FFLContact[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [noResults, setNoResults] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!query.trim()) {
      setResults([])
      setShowResults(false)
      setNoResults(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      await performSearch(query)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setNoResults(false)

    try {
      const response = await fetch(`/api/ffl/search?q=${encodeURIComponent(searchQuery)}&limit=10`)
      const data = await response.json()

      if (data.success) {
        setResults(data.results)
        setShowResults(true)
        setNoResults(data.results.length === 0)
      } else {
        setResults([])
        setNoResults(true)
      }
    } catch (error) {
      console.error('FFL search error:', error)
      setResults([])
      setNoResults(true)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelect = (ffl: FFLContact) => {
    onSelect(ffl)
    setQuery('')
    setResults([])
    setShowResults(false)
    setNoResults(false)
    setHighlightedIndex(-1)
  }

  const handleSyncDatabase = () => {
    // Open ATF website in new tab for manual download
    window.open('https://www.atf.gov/firearms/listing-federal-firearms-licensees', '_blank')
    setSyncMessage('Download the FFL list from ATF, then go to Settings to upload it.')
    // Clear message after 8 seconds
    setTimeout(() => setSyncMessage(null), 8000)
  }

  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return

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
        setResults([])
        setShowResults(false)
        setHighlightedIndex(-1)
        break
    }
  }

  return (
    <div ref={searchRef} className={`space-y-2 ${className}`}>
      {label && <Label className="text-medium mb-2 block">{label}</Label>}
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full p-3 border-2 border-white rounded bg-[rgba(17,24,39,0.8)] text-white placeholder-[#9ca3af]"
            onFocus={() => {
              if (results.length > 0 || noResults) {
                setShowResults(true)
              }
            }}
          />
        </div>

        {showSyncButton && (
          <Button
            type="button"
            variant="outline"
            onClick={handleSyncDatabase}
            title="Download FFL list from ATF website"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {syncMessage && (
        <div className={`mt-2 p-2 text-sm rounded ${
          syncMessage.includes('failed') || syncMessage.includes('error') 
            ? 'bg-red-500/20 text-red-400' 
            : 'bg-green-500/20 text-green-400'
        }`}>
          {syncMessage}
        </div>
      )}

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="border border-[rgba(59,130,246,0.3)] rounded p-2 max-h-60 overflow-y-auto bg-[rgba(17,24,39,0.95)] backdrop-blur-[10px]">
          {isSearching ? (
            <div className="p-4 text-center text-[#9ca3af]">
              <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
              Searching...
            </div>
          ) : noResults ? (
            <div className="p-4 text-center">
              <p className="text-[#9ca3af] mb-2">No FFLs found for "{query}"</p>
              <p className="text-xs text-[#9ca3af]">
                Go to Settings → FFL Database to download and upload the ATF FFL list
              </p>
            </div>
          ) : (
            results.map((ffl, index) => (
              <div
                key={ffl.id || index}
                data-ffl-index={index}
                className={`border border-[rgba(59,130,246,0.3)] rounded-lg p-3 cursor-pointer mb-2 transition-all duration-200 ${
                  index === highlightedIndex || hoveredIndex === index
                    ? 'ring-2 ring-[rgba(59,130,246,0.6)] shadow-lg' 
                    : ''
                }`}
                style={{
                  background: index === highlightedIndex || hoveredIndex === index
                    ? 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.25) 0%, rgba(26, 26, 26, 0.8) 50%, rgba(10, 10, 10, 0.9) 100%)'
                    : 'radial-gradient(circle at 50% 50%, rgba(26, 26, 26, 0.8) 0%, rgba(10, 10, 10, 0.9) 70%, rgba(0, 0, 0, 0.95) 100%)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: index === highlightedIndex || hoveredIndex === index
                    ? '0 10px 20px rgba(59, 130, 246, 0.25), 0 8px 32px rgba(0, 0, 0, 0.8)'
                    : '0 8px 32px rgba(0, 0, 0, 0.8)'
                }}
                onClick={() => handleSelect(ffl)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="font-semibold text-white text-sm">
                  {ffl.license_number}
                </div>
                <div className="flex items-center gap-1 text-sm text-white mt-1">
                  <Building2 className="h-3 w-3 text-[#9ca3af]" />
                  {ffl.trade_name || ffl.license_name}
                </div>
                <div className="flex items-center gap-1 text-xs text-[#9ca3af] mt-1">
                  <MapPin className="h-3 w-3" />
                  {ffl.premise_city}, {ffl.premise_state} {ffl.premise_zip}
                </div>
                {ffl.phone && (
                  <div className="flex items-center gap-1 text-xs text-[#9ca3af] mt-1">
                    <Phone className="h-3 w-3" />
                    {formatPhoneNumber(ffl.phone)}
                  </div>
                )}
                <div className="text-xs text-[#9ca3af] mt-1">
                  {ffl.business_type}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
