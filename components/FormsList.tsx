'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Eye, Edit, Trash2, Printer, Download, RefreshCw, ChevronDown, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface FormsListProps {
  tableName?: 'special_orders' | 'inbound_transfers' | 'suppressor_approvals' | 'outbound_transfers'
  title?: string
  onEdit?: (item: any, formType: string) => void
  onView?: (item: any, formType: string) => void
  refreshTrigger?: number
  onItemsChange?: (items: any[]) => void
}

type FormType = 'all' | 'special_orders' | 'inbound_transfers' | 'suppressor_approvals' | 'outbound_transfers'

const FORM_TYPE_LABELS: Record<FormType, string> = {
  all: 'All Forms',
  special_orders: 'Special Order',
  inbound_transfers: 'Inbound Transfer',
  suppressor_approvals: 'Suppressor Approval',
  outbound_transfers: 'Outbound Transfer',
}

const ALL_STATUSES = ['pending', 'ordered', 'received', 'completed', 'cancelled', 'shipped', 'delivered']

export function FormsList({ tableName, title, onEdit, onView, refreshTrigger, onItemsChange }: FormsListProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFormTypes, setSelectedFormTypes] = useState<FormType[]>(['all'])
  const [showFormTypeDropdown, setShowFormTypeDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showVendorDropdown, setShowVendorDropdown] = useState(false)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['pending', 'ordered', 'received'])
  const [selectedVendors, setSelectedVendors] = useState<string[]>([])
  const [availableVendors, setAvailableVendors] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearchQuery, setActiveSearchQuery] = useState('')
  const [statusUpdateItem, setStatusUpdateItem] = useState<any>(null)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const { toast } = useToast()
  const printRef = useRef<HTMLDivElement>(null)
  const formTypeRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)
  const vendorRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formTypeRef.current && !formTypeRef.current.contains(event.target as Node)) {
        setShowFormTypeDropdown(false)
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false)
      }
      if (vendorRef.current && !vendorRef.current.contains(event.target as Node)) {
        setShowVendorDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle search execution
  const handleSearch = () => {
    setActiveSearchQuery(searchQuery)
  }

  const fetchAllItems = async () => {
    setLoading(true)
    try {
      let allItems: any[] = []
      const vendors = new Set<string>()
      
      // Determine which tables to fetch from
      const tablesToFetch: Array<'special_orders' | 'inbound_transfers' | 'suppressor_approvals' | 'outbound_transfers'> = 
        selectedFormTypes.includes('all')
          ? ['special_orders', 'inbound_transfers', 'suppressor_approvals', 'outbound_transfers']
          : selectedFormTypes.filter(t => t !== 'all') as Array<'special_orders' | 'inbound_transfers' | 'suppressor_approvals' | 'outbound_transfers'>
      
      for (const table of tablesToFetch) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .order('created_at', { ascending: false })
        
        if (!error && data) {
          const itemsWithType = data.map(item => {
            // Extract vendor from product_lines
            if (item.product_lines && Array.isArray(item.product_lines)) {
              item.product_lines.forEach((line: any) => {
                const vendor = line.vendor_name || line.vendor
                if (vendor) vendors.add(vendor)
              })
            }
            return {
              ...item,
              _formType: table
            }
          })
          allItems = [...allItems, ...itemsWithType]
        }
      }
      
      // Sort by created_at
      allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      // Update available vendors list (sorted alphabetically)
      setAvailableVendors(Array.from(vendors).sort())
      
      // Filter by selected statuses
      let filteredData = allItems.filter(item => 
        selectedStatuses.length === 0 || selectedStatuses.includes(item.status)
      )
      
      // Filter by selected vendors
      if (selectedVendors.length > 0) {
        filteredData = filteredData.filter(item => {
          if (!item.product_lines || !Array.isArray(item.product_lines)) return false
          return item.product_lines.some((line: any) => {
            const vendor = line.vendor_name || line.vendor
            return vendor && selectedVendors.includes(vendor)
          })
        })
      }
      
      // Filter by search query
      if (activeSearchQuery.trim()) {
        const query = activeSearchQuery.toLowerCase().trim()
        filteredData = filteredData.filter(item => {
          // Search in customer name
          if (item.customer_name?.toLowerCase().includes(query)) return true
          // Search in customer phone
          if (item.customer_phone?.toLowerCase().includes(query)) return true
          // Search in customer email
          if (item.customer_email?.toLowerCase().includes(query)) return true
          // Search in transferee name
          if (item.transferee_name?.toLowerCase().includes(query)) return true
          // Search in transferee FFL name
          if (item.transferee_ffl_name?.toLowerCase().includes(query)) return true
          // Search in notes
          if (item.notes?.toLowerCase().includes(query)) return true
          // Search in product lines
          if (item.product_lines && Array.isArray(item.product_lines)) {
            return item.product_lines.some((line: any) => {
              if (line.sku?.toLowerCase().includes(query)) return true
              if (line.description?.toLowerCase().includes(query)) return true
              if (line.vendor?.toLowerCase().includes(query)) return true
              if (line.vendor_name?.toLowerCase().includes(query)) return true
              if (line.manufacturer?.toLowerCase().includes(query)) return true
              if (line.model?.toLowerCase().includes(query)) return true
              if (line.serial_number?.toLowerCase().includes(query)) return true
              if (line.control_number?.toLowerCase().includes(query)) return true
              return false
            })
          }
          return false
        })
      }
      
      setItems(filteredData)
      onItemsChange?.(filteredData)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load forms',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllItems()
  }, [selectedFormTypes, selectedStatuses, selectedVendors, activeSearchQuery, refreshTrigger])

  const handleDelete = (item: any) => {
    setDeleteItem(item)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!deleteItem || deleteConfirmation.toLowerCase() !== 'delete') return

    try {
      const { error } = await supabase
        .from(deleteItem._formType)
        .delete()
        .eq('id', deleteItem.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Item deleted successfully',
      })

      fetchAllItems()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      })
    } finally {
      setShowDeleteDialog(false)
      setDeleteItem(null)
      setDeleteConfirmation('')
    }
  }

  const handleStatusUpdate = async () => {
    if (!statusUpdateItem || !newStatus) return

    try {
      const { error } = await supabase
        .from(statusUpdateItem._formType)
        .update({ status: newStatus })
        .eq('id', statusUpdateItem.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Status updated successfully',
      })

      setShowStatusDialog(false)
      setStatusUpdateItem(null)
      setNewStatus('')
      fetchAllItems()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      })
    }
  }

  const handlePrint = async (item: any) => {
    // Dynamic import to avoid SSR issues
    const { printForm } = await import('@/lib/printUtils')
    printForm(item, item._formType)
  }

  const handleDownloadPDF = async (item: any) => {
    // Dynamic import to avoid SSR issues
    const { downloadFormPDF } = await import('@/lib/printUtils')
    downloadFormPDF(item, item._formType)
    toast({
      title: 'Downloading PDF',
      description: 'Your PDF is being generated and will download shortly.',
    })
  }

  const openStatusDialog = (item: any) => {
    setStatusUpdateItem(item)
    setNewStatus(item.status)
    setShowStatusDialog(true)
  }

  const toggleFormType = (formType: FormType) => {
    setSelectedFormTypes(prev => {
      if (formType === 'all') {
        // If 'all' is selected, select all form types
        return prev.includes('all') ? [] : ['all', 'special_orders', 'inbound_transfers', 'suppressor_approvals', 'outbound_transfers']
      } else {
        // Toggle individual form type
        const newTypes = prev.includes(formType)
          ? prev.filter(t => t !== formType && t !== 'all')
          : [...prev.filter(t => t !== 'all'), formType]
        
        // If all individual types are selected, also select 'all'
        const allIndividualTypes = ['special_orders', 'inbound_transfers', 'suppressor_approvals', 'outbound_transfers']
        if (allIndividualTypes.every(t => newTypes.includes(t as FormType))) {
          return ['all', ...allIndividualTypes] as FormType[]
        }
        
        return newTypes.length > 0 ? newTypes : ['special_orders']
      }
    })
  }

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }

  const toggleVendor = (vendor: string) => {
    setSelectedVendors(prev => 
      prev.includes(vendor)
        ? prev.filter(v => v !== vendor)
        : [...prev, vendor]
    )
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getVendors = (item: any): string[] => {
    // Get all unique vendors from product_lines
    if (item.product_lines && Array.isArray(item.product_lines) && item.product_lines.length > 0) {
      const vendors = new Set<string>()
      item.product_lines.forEach((line: any) => {
        const vendor = line.vendor_name || line.vendor
        if (vendor) vendors.add(vendor)
      })
      return Array.from(vendors)
    }
    return []
  }

  const getCustomerName = (item: any) => {
    return item.customer_name || item.transferor_name || item.transferee_name || 'N/A'
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'ordered': return 'bg-blue-100 text-blue-800'
      case 'received': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'shipped': return 'bg-purple-100 text-purple-800'
      case 'delivered': return 'bg-teal-100 text-teal-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder="Search forms by customer name, phone, SKU, description, vendor, serial number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch()
                  }
                }}
                className="pl-4 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setActiveSearchQuery('')
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af] hover:text-[#e0e0e0]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              onClick={handleSearch}
              variant="default"
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-6">
            {/* Form Type Filter */}
            <div className="flex flex-col space-y-2 relative" ref={formTypeRef}>
              <Label className="text-lg block">Form Type</Label>
              <Button
                variant="outline"
                onClick={() => setShowFormTypeDropdown(!showFormTypeDropdown)}
                className="styled-button w-[200px] justify-between"
              >
                <span>
                  {selectedFormTypes.length === 1 
                    ? FORM_TYPE_LABELS[selectedFormTypes[0]] 
                    : `${selectedFormTypes.length} selected`}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
              {showFormTypeDropdown && (
                <div className="absolute top-full mt-1 w-[200px] bg-[rgba(17,24,39,0.95)] border border-[rgba(59,130,246,0.3)] rounded-md shadow-lg z-50 p-2 max-h-[300px] overflow-y-auto backdrop-blur-[10px]">
                  {(['all', 'inbound_transfers', 'outbound_transfers', 'special_orders', 'suppressor_approvals'] as FormType[]).map(formType => (
                    <label
                      key={formType}
                      className="flex items-center gap-2 p-2 hover:bg-[rgba(59,130,246,0.2)] cursor-pointer rounded text-white"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFormTypes.includes(formType)}
                        onChange={() => toggleFormType(formType)}
                        className="w-4 h-4"
                      />
                      <span>{FORM_TYPE_LABELS[formType]}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Status Multi-Select Filter as Dropdown */}
            <div className="flex flex-col space-y-2 relative" ref={statusRef}>
              <Label className="text-lg block">Status Filter</Label>
              <Button
                variant="outline"
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="styled-button w-[200px] justify-between"
              >
                <span>
                  {selectedStatuses.length === 1 
                    ? selectedStatuses[0].charAt(0).toUpperCase() + selectedStatuses[0].slice(1) 
                    : `${selectedStatuses.length} selected`}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
              {showStatusDropdown && (
                <div className="absolute top-full mt-1 w-[200px] bg-[rgba(17,24,39,0.95)] border border-[rgba(59,130,246,0.3)] rounded-md shadow-lg z-50 p-2 max-h-[300px] overflow-y-auto backdrop-blur-[10px]">
                  <label
                    className="flex items-center gap-2 p-2 hover:bg-[rgba(59,130,246,0.2)] cursor-pointer rounded text-white border-b border-[rgba(59,130,246,0.2)] mb-1"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatuses.length === ALL_STATUSES.length}
                      ref={(input) => {
                        if (input && input.indeterminate !== (selectedStatuses.length > 0 && selectedStatuses.length < ALL_STATUSES.length)) {
                          input.indeterminate = selectedStatuses.length > 0 && selectedStatuses.length < ALL_STATUSES.length
                        }
                      }}
                      onChange={() => {
                        if (selectedStatuses.length === ALL_STATUSES.length) {
                          setSelectedStatuses([])
                        } else {
                          setSelectedStatuses([...ALL_STATUSES])
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">All Status</span>
                  </label>
                  {ALL_STATUSES.map(status => (
                    <label
                      key={status}
                      className="flex items-center gap-2 p-2 hover:bg-[rgba(59,130,246,0.2)] cursor-pointer rounded capitalize text-white"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(status)}
                        onChange={() => toggleStatus(status)}
                        className="w-4 h-4"
                      />
                      <span>{status}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Vendor Filter */}
            <div className="flex flex-col space-y-2 relative" ref={vendorRef}>
              <Label className="text-lg block">Vendor Filter</Label>
              <Button
                variant="outline"
                onClick={() => setShowVendorDropdown(!showVendorDropdown)}
                className="styled-button w-[200px] justify-between"
              >
                <span>
                  {selectedVendors.length === 0 
                    ? 'All vendors' 
                    : selectedVendors.length === 1 
                      ? selectedVendors[0] 
                      : `${selectedVendors.length} selected`}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
              {showVendorDropdown && (
                <div className="absolute top-full mt-1 w-[200px] bg-[rgba(17,24,39,0.95)] border border-[rgba(59,130,246,0.3)] rounded-md shadow-lg z-50 p-2 max-h-[300px] overflow-y-auto backdrop-blur-[10px]">
                  {availableVendors.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-2">No vendors found</p>
                  ) : (
                    availableVendors.map(vendor => (
                      <label
                        key={vendor}
                        className="flex items-center gap-2 p-2 hover:bg-[rgba(59,130,246,0.2)] cursor-pointer rounded text-white"
                      >
                        <input
                          type="checkbox"
                          checked={selectedVendors.includes(vendor)}
                          onChange={() => toggleVendor(vendor)}
                          className="w-4 h-4"
                        />
                        <span>{vendor}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Clear Filters */}
            <div className="flex flex-col space-y-2">
              <Label className="text-lg block">&nbsp;</Label>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedFormTypes(['all'])
                  setSelectedStatuses([])
                  setSelectedVendors([])
                }}
                className="styled-button"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <p className="text-base text-muted-foreground">
        Showing {items.length} form{items.length !== 1 ? 's' : ''}
      </p>

      {/* Items List */}
      {items.length === 0 ? (
        <Card className="view-all-form-card">
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">No forms found matching the selected filters</p>
          </CardContent>
        </Card>
      ) : (
        items.map((item) => (
          <Card 
            key={`${item._formType}-${item.id}`} 
            className="view-all-form-card cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onView && onView(item, item._formType)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <CardTitle className="text-2xl">{getCustomerName(item)}</CardTitle>
                  <div className="flex flex-wrap gap-4 text-base text-muted-foreground">
                    <span><strong>Form Type:</strong> {FORM_TYPE_LABELS[item._formType as FormType]}</span>
                    <span><strong>Created:</strong> {formatDate(item.created_at)}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.status)}`}>
                      {item.status?.charAt(0).toUpperCase() + item.status?.slice(1) || 'N/A'}
                    </span>
                    {getVendors(item).length > 0 && (
                      <span><strong>Vendor{getVendors(item).length > 1 ? 's' : ''}:</strong> {getVendors(item).join(', ')}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end" onClick={(e) => e.stopPropagation()}>
                  {onEdit && (
                    <Button
                      variant="outline"
                      onClick={() => onEdit(item, item._formType)}
                      title="Edit"
                      className="styled-button"
                    >
                      <Edit className="h-5 w-5" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => handlePrint(item)}
                    title="Print"
                    className="styled-button"
                  >
                    <Printer className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadPDF(item)}
                    title="Download PDF"
                    className="styled-button"
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                  <button
                    onClick={() => openStatusDialog(item)}
                    title="Update Status"
                    style={{
                      backgroundColor: '#1e40af',
                      borderColor: '#1e40af',
                      color: '#dbeafe',
                      borderRadius: '0.5rem',
                      padding: '0.5rem 1rem',
                      border: '1px solid',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#1e3a8a'
                      e.currentTarget.style.borderColor = '#1e3a8a'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#1e40af'
                      e.currentTarget.style.borderColor = '#1e40af'
                    }}
                  >
                    Update Status
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    title="Delete"
                    className="delete-button"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.9)',
                      borderColor: 'rgba(239, 68, 68, 0.6)',
                      color: '#D1D5DB',
                      borderRadius: '0.5rem',
                      padding: '0.5rem 1rem',
                      border: '1px solid',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 1)'
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.8)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.9)'
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.6)'
                    }}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))
      )}

      {/* Status Update Dialog */}
      <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Status</AlertDialogTitle>
            <AlertDialogDescription>
              Select a new status for this form.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map(status => (
                  <SelectItem key={status} value={status} className="capitalize">
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowStatusDialog(false)
              setStatusUpdateItem(null)
              setNewStatus('')
            }}>Cancel</AlertDialogCancel>
            <Button 
              onClick={handleStatusUpdate}
              style={{
                backgroundColor: '#1e40af',
                borderColor: '#1e40af',
                color: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8'
                e.currentTarget.style.borderColor = '#1d4ed8'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1e40af'
                e.currentTarget.style.borderColor = '#1e40af'
              }}
            >
              Update
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open)
        if (!open) {
          setDeleteItem(null)
          setDeleteConfirmation('')
        }
      }}>
        <AlertDialogContent style={{
          backgroundColor: 'rgba(17, 24, 39, 0.98)',
          border: '2px solid rgba(59, 130, 246, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)'
        }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#ffffff' }}>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#9ca3af' }}>
              Are you sure you want to delete this {deleteItem?._formType?.replace('_', ' ')}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <label htmlFor="delete-confirmation" style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: '500' }}>
                Type <span style={{ color: '#ef4444', fontWeight: 'bold' }}>"delete"</span> to confirm:
              </label>
              <Input
                id="delete-confirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Type delete to confirm"
                style={{
                  backgroundColor: 'rgba(31, 41, 55, 0.8)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#ffffff'
                }}
                className="placeholder:text-gray-400"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowDeleteDialog(false)
                setDeleteItem(null)
                setDeleteConfirmation('')
              }}
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#ffffff'
              }}
              className="hover:bg-blue-600"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteConfirmation.toLowerCase() !== 'delete'}
              style={{
                backgroundColor: deleteConfirmation.toLowerCase() === 'delete' 
                  ? 'rgba(220, 38, 38, 0.8)' 
                  : 'rgba(107, 114, 128, 0.5)',
                border: deleteConfirmation.toLowerCase() === 'delete'
                  ? '1px solid rgba(220, 38, 38, 0.5)'
                  : '1px solid rgba(107, 114, 128, 0.3)',
                color: '#ffffff',
                cursor: deleteConfirmation.toLowerCase() === 'delete' ? 'pointer' : 'not-allowed',
                opacity: deleteConfirmation.toLowerCase() === 'delete' ? 1 : 0.6
              }}
              className={deleteConfirmation.toLowerCase() === 'delete' ? 'hover:bg-red-600' : ''}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
