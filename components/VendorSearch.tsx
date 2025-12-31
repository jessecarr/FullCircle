'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'

interface Vendor {
  id: string
  name: string
}

interface VendorSearchProps {
  value?: string
  onSelect: (vendorName: string) => void
  placeholder?: string
}

export default function VendorSearch({ value, onSelect, placeholder = "Search or add vendor" }: VendorSearchProps) {
  const { toast } = useToast()
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState<Vendor[]>([])
  const [showResults, setShowResults] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newVendorName, setNewVendorName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

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
  }

  const handleAddVendor = async () => {
    if (!newVendorName.trim()) {
      toast({
        title: 'Error',
        description: 'Vendor name cannot be empty',
        variant: 'destructive',
      })
      return
    }

    setIsAdding(true)
    try {
      const { data, error } = await supabase
        .from('vendors')
        .insert([{ name: newVendorName.trim().toUpperCase() }])
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
      setNewVendorName('')
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setQuery(newValue)
    onSelect(newValue)
  }

  return (
    <>
      <div className="relative">
        <Input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query && setShowResults(true)}
          placeholder={placeholder}
          className="text-base"
        />
        
        {showResults && results.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {results.map((vendor) => (
              <div
                key={vendor.id}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSelect(vendor.name)}
              >
                {vendor.name}
              </div>
            ))}
          </div>
        )}

        {showResults && query && results.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
            <div className="px-4 py-2 text-gray-500">No vendors found</div>
            <div className="px-4 py-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewVendorName(query)
                  setShowAddDialog(true)
                  setShowResults(false)
                }}
                className="w-full"
              >
                + Add "{query}" as new vendor
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>
              Enter the vendor name to add to your list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={newVendorName}
              onChange={(e) => setNewVendorName(e.target.value)}
              placeholder="Vendor name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddVendor()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddDialog(false)
                setNewVendorName('')
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddVendor}
              disabled={isAdding}
            >
              {isAdding ? 'Adding...' : 'Add Vendor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
