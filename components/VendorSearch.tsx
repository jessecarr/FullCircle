'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import VendorDialog from './VendorDialog'

interface Vendor {
  id: string
  name: string
}

interface VendorSearchProps {
  value?: string
  onSelect: (vendorName: string) => void
  placeholder?: string
  height?: string
  onHeightChange?: (height: string) => void
  rowIndex?: number
}

export default function VendorSearch({ value, onSelect, placeholder = "Search or add vendor", height, onHeightChange, rowIndex }: VendorSearchProps) {
  const { toast } = useToast()
  const [isClient, setIsClient] = useState(false)
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState<Vendor[]>([])
  const [showResults, setShowResults] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newVendorName, setNewVendorName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [hasUserTyped, setHasUserTyped] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [results])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const searchVendors = async () => {
      if (!query.trim()) {
        setResults([])
        setShowResults(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('vendors')
          .select('id, name')
          .ilike('name', `%${query}%`)
          .order('name')
          .limit(10)

        if (error) throw error

        setResults(data || [])
        setShowResults(true)
      } catch (error) {
        console.error('Vendor search error:', error)
        setResults([])
      }
    }

    const debounceTimer = setTimeout(searchVendors, 300)
    return () => clearTimeout(debounceTimer)
  }, [query])

  const handleSelect = (vendorName: string) => {
    setQuery(vendorName)
    onSelect(vendorName)
    setShowResults(false)
    setHighlightedIndex(0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showResults || results.length === 0) {
      // If no results showing and Enter is pressed, move to next field
      if (e.key === 'Enter') {
        e.preventDefault()
        // Find the next field to focus (will be handled by parent form)
        const nextFieldId = rowIndex !== undefined ? `sku-${rowIndex + 1}` : null
        if (nextFieldId) {
          const nextField = document.getElementById(nextFieldId)
          if (nextField) {
            nextField.focus()
          }
        }
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : prev
        )
        break
      case 'Enter':
        e.preventDefault()
        if (results[highlightedIndex]) {
          handleSelect(results[highlightedIndex].name)
          // Move to next row's SKU field after selection
          if (rowIndex !== undefined) {
            setTimeout(() => {
              const nextField = document.getElementById(`sku-${rowIndex + 1}`)
              if (nextField) {
                nextField.focus()
              }
            }, 50)
          }
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowResults(false)
        break
    }
  }

  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [verifiedVendorName, setVerifiedVendorName] = useState('')

  const handleAddVendor = () => {
    if (!newVendorName.trim()) {
      toast({
        title: 'Error',
        description: 'Vendor name cannot be empty',
        variant: 'destructive',
      })
      return
    }

    const uppercaseName = newVendorName.trim().toUpperCase()
    setVerifiedVendorName(uppercaseName)
    setShowResults(false)
    setShowVerificationDialog(true)
  }

  const handleConfirmAddVendor = async () => {
    setIsAdding(true)
    try {
      const { data, error } = await supabase
        .from('vendors')
        .insert([{ name: verifiedVendorName }])
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Error',
            description: 'This vendor already exists',
            variant: 'destructive',
          })
        } else {
          throw error
        }
        return
      }

      toast({
        title: 'Success',
        description: 'Vendor added successfully',
      })

      handleSelect(data.name)
      setShowAddDialog(false)
      setShowVerificationDialog(false)
      setNewVendorName('')
      setVerifiedVendorName('')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add vendor',
        variant: 'destructive',
      })
    } finally {
      setIsAdding(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setQuery(newValue)
    setHasUserTyped(true)
    onSelect(newValue)
  }

  return (
    <>
      <div className="relative" ref={containerRef}>
        <Textarea
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          onFocus={() => hasUserTyped && query && setShowResults(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="text-base min-h-[48px] resize-none overflow-hidden"
          rows={1}
          data-vendor-row={rowIndex}
          style={{
            height: height || '48px',
            minHeight: '48px'
          }}
          onInput={(e) => {
            if (!isClient) return
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            const newHeight = `${target.scrollHeight}px`;
            target.style.height = newHeight;
            if (onHeightChange) {
              onHeightChange(newHeight);
            }
            // Trigger recalculation after a short delay for proper shrinking
            setTimeout(() => {
              if (onHeightChange) {
                onHeightChange(newHeight);
              }
            }, 10);
          }}
        />
        
        {showResults && results.length > 0 && !showAddDialog && !showVerificationDialog && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {results.map((vendor, index) => (
              <div
                key={vendor.id}
                className={`px-4 py-2 cursor-pointer ${
                  index === highlightedIndex 
                    ? 'bg-blue-100 text-blue-900' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => handleSelect(vendor.name)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {vendor.name}
              </div>
            ))}
          </div>
        )}

        {showResults && query && results.length === 0 && !showAddDialog && !showVerificationDialog && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
            <div className="px-4 py-2 text-gray-500">No vendors found</div>
            <div className="px-4 py-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewVendorName(query)
                  setShowResults(false)
                  setShowAddDialog(true)
                }}
                className="w-full"
              >
                + Add "{query}" as new vendor
              </Button>
            </div>
          </div>
        )}
      </div>

<VendorDialog
        isOpen={showAddDialog}
        title="Add New Vendor"
        description="Enter the vendor name to add to your list"
        value={newVendorName}
        onChange={setNewVendorName}
        onSubmit={handleAddVendor}
        onCancel={() => {
          setShowAddDialog(false)
          setNewVendorName('')
        }}
        submitText="Next"
        isSubmitting={isAdding}
      />

      <VendorDialog
        isOpen={showVerificationDialog}
        title="Verify Vendor Name"
        description="Please confirm the vendor name before adding it to the list"
        value=""
        onChange={() => {}}
        onSubmit={handleConfirmAddVendor}
        onCancel={() => {
          setShowVerificationDialog(false)
          setShowAddDialog(true)
        }}
        submitText="Confirm & Add Vendor"
        isSubmitting={isAdding}
        showVerification={true}
        verifiedValue={verifiedVendorName}
      />
    </>
  )
}
