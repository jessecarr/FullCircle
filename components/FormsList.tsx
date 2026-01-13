'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Eye, Edit, Trash2, Printer, Download, RefreshCw, ChevronDown, Search, X, ArrowUpDown, Mail } from 'lucide-react'
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
import { EmailConfirmDialog } from '@/components/ui/email-confirm-dialog'

interface FormsListProps {
  tableName?: 'special_orders' | 'inbound_transfers' | 'suppressor_approvals' | 'outbound_transfers' | 'consignment_forms'
  title?: string
  onEdit?: (item: any, formType: string) => void
  onView?: (item: any, formType: string) => void
  refreshTrigger?: number
  onItemsChange?: (items: any[]) => void
}

type FormType = 'all' | 'special_orders' | 'inbound_transfers' | 'suppressor_approvals' | 'outbound_transfers' | 'consignment_forms'

const FORM_TYPE_LABELS: Record<FormType, string> = {
  all: 'All Forms',
  special_orders: 'Special Order',
  inbound_transfers: 'Inbound Transfer',
  suppressor_approvals: 'Suppressor Approval',
  outbound_transfers: 'Outbound Transfer',
  consignment_forms: 'Consignment',
}

const ALL_STATUSES = ['backorder', 'cancelled', 'completed', 'layaway', 'ordered', 'partially_received', 'pending', 'quote', 'received']

export function FormsList({ tableName, title, onEdit, onView, refreshTrigger, onItemsChange }: FormsListProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFormTypes, setSelectedFormTypes] = useState<FormType[]>(['all'])
  const [showFormTypeDropdown, setShowFormTypeDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showVendorDropdown, setShowVendorDropdown] = useState(false)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['pending', 'ordered', 'partially_received', 'received'])
  const [selectedVendors, setSelectedVendors] = useState<string[]>([])
  const [availableVendors, setAvailableVendors] = useState<string[]>([])
  const [vendorSearchQuery, setVendorSearchQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearchQuery, setActiveSearchQuery] = useState('')
  const [applyFiltersToSearch, setApplyFiltersToSearch] = useState(false)
  const [statusUpdateItem, setStatusUpdateItem] = useState<any>(null)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'status_asc' | 'status_desc' | 'date_desc' | 'date_asc'>('date_desc')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [emailItem, setEmailItem] = useState<any>(null)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showBulkStatusDialog, setShowBulkStatusDialog] = useState(false)
  const [bulkNewStatus, setBulkNewStatus] = useState('')
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState('')
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)
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
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false)
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
      const tablesToFetch: Array<'special_orders' | 'inbound_transfers' | 'suppressor_approvals' | 'outbound_transfers' | 'consignment_forms'> = 
        selectedFormTypes.includes('all')
          ? ['special_orders', 'inbound_transfers', 'suppressor_approvals', 'outbound_transfers', 'consignment_forms']
          : selectedFormTypes.filter(t => t !== 'all') as Array<'special_orders' | 'inbound_transfers' | 'suppressor_approvals' | 'outbound_transfers' | 'consignment_forms'>
      
      for (const table of tablesToFetch) {
        // Try to filter out soft-deleted items, but fall back if column doesn't exist
        let query = supabase.from(table).select('*')
        
        // First try with deleted_at filter
        let { data, error } = await query
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
        
        // If error (likely column doesn't exist), try without the filter
        if (error) {
          const fallbackResult = await supabase
            .from(table)
            .select('*')
            .order('created_at', { ascending: false })
          data = fallbackResult.data
          error = fallbackResult.error
        }
        
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
      
      let filteredData = allItems
      
      // Only apply status and vendor filters if toggle is on OR if there's no search query
      const shouldApplyFilters = applyFiltersToSearch || !activeSearchQuery.trim()
      
      if (shouldApplyFilters) {
        // Filter by selected statuses
        filteredData = filteredData.filter(item => 
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
      }
      
      // Filter by search query
      if (activeSearchQuery.trim()) {
        const query = activeSearchQuery.toLowerCase().trim()
        filteredData = filteredData.filter(item => {
          // Search in order number
          if (item.order_number?.toLowerCase().includes(query)) return true
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
  }, [selectedFormTypes, selectedStatuses, selectedVendors, activeSearchQuery, applyFiltersToSearch, refreshTrigger])

  const handleDelete = (item: any) => {
    setDeleteItem(item)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!deleteItem || deleteConfirmation.toLowerCase() !== 'delete') return

    try {
      // Soft delete - set deleted_at timestamp instead of permanently deleting
      const { error } = await supabase
        .from(deleteItem._formType)
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', deleteItem.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Item moved to archive',
      })

      fetchAllItems()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to archive item',
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

  const handleEmailClick = (item: any) => {
    const customerEmail = item.customer_email
    if (!customerEmail) {
      toast({
        title: 'No Email Available',
        description: 'This customer does not have an email address on file.',
        variant: 'destructive',
      })
      return
    }
    setEmailItem(item)
    setShowEmailDialog(true)
  }

  const handleEmailConfirm = async () => {
    if (!emailItem) return
    
    setEmailLoading(true)
    try {
      const { sendFormEmail } = await import('@/lib/emailUtils')
      const result = await sendFormEmail({
        customerEmail: emailItem.customer_email,
        customerName: emailItem.customer_name || 'Customer',
        formType: emailItem._formType,
        formData: emailItem,
      })

      if (result.success) {
        toast({ title: 'Email Sent', description: result.message })
      } else {
        toast({ title: 'Email Failed', description: result.message, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Email Failed', description: error instanceof Error ? error.message : 'Failed to send email', variant: 'destructive' })
    } finally {
      setEmailLoading(false)
      setShowEmailDialog(false)
      setEmailItem(null)
    }
  }

  // Bulk selection helpers
  const getItemKey = (item: any) => `${item._formType}-${item.id}`
  
  const toggleItemSelection = (item: any) => {
    const key = getItemKey(item)
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map(getItemKey)))
    }
  }

  const getSelectedItemObjects = () => {
    return items.filter(item => selectedItems.has(getItemKey(item)))
  }

  // Bulk actions
  const handleBulkStatusUpdate = async () => {
    if (!bulkNewStatus || selectedItems.size === 0) return
    
    setBulkActionLoading(true)
    try {
      const selectedObjects = getSelectedItemObjects()
      
      // Group by form type for batch updates
      const byFormType: Record<string, string[]> = {}
      selectedObjects.forEach(item => {
        if (!byFormType[item._formType]) {
          byFormType[item._formType] = []
        }
        byFormType[item._formType].push(item.id)
      })
      
      // Update each form type
      for (const [formType, ids] of Object.entries(byFormType)) {
        const { error } = await supabase
          .from(formType)
          .update({ status: bulkNewStatus })
          .in('id', ids)
        
        if (error) throw error
      }
      
      toast({
        title: 'Success',
        description: `Updated status to "${bulkNewStatus}" for ${selectedItems.size} item(s)`,
      })
      
      setSelectedItems(new Set())
      setShowBulkStatusDialog(false)
      setBulkNewStatus('')
      fetchAllItems()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      })
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (bulkDeleteConfirmation.toLowerCase() !== 'delete' || selectedItems.size === 0) return
    
    setBulkActionLoading(true)
    try {
      const selectedObjects = getSelectedItemObjects()
      const userId = (await supabase.auth.getUser()).data.user?.id
      
      // Group by form type for batch updates
      const byFormType: Record<string, string[]> = {}
      selectedObjects.forEach(item => {
        if (!byFormType[item._formType]) {
          byFormType[item._formType] = []
        }
        byFormType[item._formType].push(item.id)
      })
      
      // Soft delete each form type
      for (const [formType, ids] of Object.entries(byFormType)) {
        const { error } = await supabase
          .from(formType)
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: userId
          })
          .in('id', ids)
        
        if (error) throw error
      }
      
      toast({
        title: 'Success',
        description: `Moved ${selectedItems.size} item(s) to archive`,
      })
      
      setSelectedItems(new Set())
      setShowBulkDeleteDialog(false)
      setBulkDeleteConfirmation('')
      fetchAllItems()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete items',
        variant: 'destructive',
      })
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleBulkPrint = async () => {
    const selectedObjects = getSelectedItemObjects()
    if (selectedObjects.length === 0) return
    
    const { printForm } = await import('@/lib/printUtils')
    
    // Print each item with a small delay
    for (let i = 0; i < selectedObjects.length; i++) {
      const item = selectedObjects[i]
      setTimeout(() => {
        printForm(item, item._formType)
      }, i * 500) // 500ms delay between prints
    }
    
    toast({
      title: 'Printing',
      description: `Printing ${selectedObjects.length} form(s)...`,
    })
  }

  const handleBulkDownload = async () => {
    const selectedObjects = getSelectedItemObjects()
    if (selectedObjects.length === 0) return
    
    const { downloadFormPDF } = await import('@/lib/printUtils')
    
    toast({
      title: 'Downloading',
      description: `Generating ${selectedObjects.length} PDF(s)...`,
    })
    
    // Download each item with a small delay
    for (let i = 0; i < selectedObjects.length; i++) {
      const item = selectedObjects[i]
      setTimeout(() => {
        downloadFormPDF(item, item._formType)
      }, i * 300) // 300ms delay between downloads
    }
  }

  const handleBulkEmail = async () => {
    const selectedObjects = getSelectedItemObjects()
    const itemsWithEmail = selectedObjects.filter(item => item.customer_email)
    
    if (itemsWithEmail.length === 0) {
      toast({
        title: 'No Emails',
        description: 'None of the selected items have customer email addresses.',
        variant: 'destructive',
      })
      return
    }
    
    setBulkActionLoading(true)
    const { sendFormEmail } = await import('@/lib/emailUtils')
    
    let successCount = 0
    let failCount = 0
    
    for (const item of itemsWithEmail) {
      try {
        const result = await sendFormEmail({
          customerEmail: item.customer_email,
          customerName: item.customer_name || 'Customer',
          formType: item._formType,
          formData: item,
        })
        if (result.success) {
          successCount++
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
    }
    
    setBulkActionLoading(false)
    
    if (successCount > 0) {
      toast({
        title: 'Emails Sent',
        description: `Successfully sent ${successCount} email(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
      })
    } else {
      toast({
        title: 'Email Failed',
        description: 'Failed to send emails',
        variant: 'destructive',
      })
    }
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
        return prev.includes('all') ? [] : ['all', 'special_orders', 'inbound_transfers', 'suppressor_approvals', 'outbound_transfers', 'consignment_forms']
      } else {
        // Toggle individual form type
        const newTypes = prev.includes(formType)
          ? prev.filter(t => t !== formType && t !== 'all')
          : [...prev.filter(t => t !== 'all'), formType]
        
        // If all individual types are selected, also select 'all'
        const allIndividualTypes = ['special_orders', 'inbound_transfers', 'suppressor_approvals', 'outbound_transfers', 'consignment_forms']
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

  const sortItems = (itemsToSort: any[]) => {
    const sorted = [...itemsToSort]
    switch (sortBy) {
      case 'name_asc':
        return sorted.sort((a, b) => {
          const nameA = (a.customer_name || '').toLowerCase()
          const nameB = (b.customer_name || '').toLowerCase()
          return nameA.localeCompare(nameB)
        })
      case 'name_desc':
        return sorted.sort((a, b) => {
          const nameA = (a.customer_name || '').toLowerCase()
          const nameB = (b.customer_name || '').toLowerCase()
          return nameB.localeCompare(nameA)
        })
      case 'status_asc':
        return sorted.sort((a, b) => {
          const statusA = (a.status || '').toLowerCase()
          const statusB = (b.status || '').toLowerCase()
          return statusA.localeCompare(statusB)
        })
      case 'status_desc':
        return sorted.sort((a, b) => {
          const statusA = (a.status || '').toLowerCase()
          const statusB = (b.status || '').toLowerCase()
          return statusB.localeCompare(statusA)
        })
      case 'date_asc':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      case 'date_desc':
      default:
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
  }

  const getSortLabel = () => {
    switch (sortBy) {
      case 'name_asc': return 'Name (A-Z)'
      case 'name_desc': return 'Name (Z-A)'
      case 'status_asc': return 'Status (A-Z)'
      case 'status_desc': return 'Status (Z-A)'
      case 'date_asc': return 'Date (Oldest)'
      case 'date_desc': return 'Date (Newest)'
      default: return 'Sort By'
    }
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
      case 'backorder': return 'bg-orange-100 text-orange-800'
      case 'layaway': return 'bg-purple-100 text-purple-800'
      case 'quote': return 'bg-indigo-100 text-indigo-800'
      case 'partially_received': return 'bg-teal-100 text-teal-800'
      case 'received': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatStatus = (status: string) => {
    if (!status) return 'N/A'
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
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
              onClick={() => setApplyFiltersToSearch(!applyFiltersToSearch)}
              variant={applyFiltersToSearch ? "default" : "outline"}
              className={`flex items-center gap-2 min-w-[140px] ${applyFiltersToSearch ? '' : 'border-dashed'}`}
              title={applyFiltersToSearch ? "Filters are applied to search" : "Search ignores filters"}
            >
              {applyFiltersToSearch ? "Filters: On" : "Filters: Off"}
            </Button>
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
                  {(['all', 'inbound_transfers', 'outbound_transfers', 'special_orders', 'suppressor_approvals', 'consignment_forms'] as FormType[]).map(formType => (
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
                    ? formatStatus(selectedStatuses[0])
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
                      className="flex items-center gap-2 p-2 hover:bg-[rgba(59,130,246,0.2)] cursor-pointer rounded text-white"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(status)}
                        onChange={() => toggleStatus(status)}
                        className="w-4 h-4"
                      />
                      <span>{formatStatus(status)}</span>
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
                onClick={() => {
                  setShowVendorDropdown(!showVendorDropdown)
                  if (!showVendorDropdown) setVendorSearchQuery('')
                }}
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
                <div className="absolute top-full mt-1 w-[250px] bg-[rgba(17,24,39,0.95)] border border-[rgba(59,130,246,0.3)] rounded-md shadow-lg z-50 backdrop-blur-[10px]">
                  <div className="p-2 border-b border-[rgba(59,130,246,0.2)]">
                    <Input
                      type="text"
                      placeholder="Search vendors..."
                      value={vendorSearchQuery}
                      onChange={(e) => setVendorSearchQuery(e.target.value)}
                      className="w-full h-8 text-sm"
                      autoFocus
                    />
                  </div>
                  <div className="p-2 max-h-[250px] overflow-y-auto">
                    {availableVendors.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-2">No vendors found</p>
                    ) : (
                      availableVendors
                        .filter(vendor => 
                          vendorSearchQuery === '' || 
                          vendor.toLowerCase().includes(vendorSearchQuery.toLowerCase())
                        )
                        .map(vendor => (
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
                    {availableVendors.length > 0 && 
                     vendorSearchQuery !== '' && 
                     availableVendors.filter(v => v.toLowerCase().includes(vendorSearchQuery.toLowerCase())).length === 0 && (
                      <p className="text-sm text-muted-foreground p-2">No matching vendors</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sort By */}
            <div className="flex flex-col space-y-2 relative" ref={sortRef}>
              <Label className="text-lg block">Sort By</Label>
              <Button
                variant="outline"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="styled-button w-[200px] justify-between"
              >
                <span className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  {getSortLabel()}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
              {showSortDropdown && (
                <div className="absolute top-full mt-1 w-[200px] bg-[rgba(17,24,39,0.95)] border border-[rgba(59,130,246,0.3)] rounded-md shadow-lg z-50 p-2 backdrop-blur-[10px]">
                  {[
                    { value: 'name_asc', label: 'Name (A-Z)' },
                    { value: 'name_desc', label: 'Name (Z-A)' },
                    { value: 'status_asc', label: 'Status (A-Z)' },
                    { value: 'status_desc', label: 'Status (Z-A)' },
                    { value: 'date_desc', label: 'Date (Newest)' },
                    { value: 'date_asc', label: 'Date (Oldest)' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value as any)
                        setShowSortDropdown(false)
                      }}
                      className={`w-full text-left p-2 hover:bg-[rgba(59,130,246,0.2)] cursor-pointer rounded text-white ${sortBy === option.value ? 'bg-[rgba(59,130,246,0.3)]' : ''}`}
                    >
                      {option.label}
                    </button>
                  ))}
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
                  setSortBy('date_desc')
                }}
                className="styled-button"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count & Bulk Actions */}
      <div className="flex items-center justify-between">
        <p className="text-base text-muted-foreground">
          Showing {items.length} form{items.length !== 1 ? 's' : ''}
          {selectedItems.size > 0 && ` (${selectedItems.size} selected)`}
        </p>
        {items.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            className="styled-button"
          >
            {selectedItems.size === items.length ? 'Deselect All' : 'Select All'}
          </Button>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedItems.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected</span>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkStatusDialog(true)}
                  className="styled-button"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Update Status
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkPrint}
                  className="styled-button"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkEmail}
                  disabled={bulkActionLoading}
                  className="styled-button"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDownload}
                  className="styled-button"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBulkDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <Card className="view-all-form-card">
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">No forms found matching the selected filters</p>
          </CardContent>
        </Card>
      ) : (
        sortItems(items).map((item) => (
          <Card 
            key={`${item._formType}-${item.id}`} 
            className={`view-all-form-card cursor-pointer hover:shadow-lg transition-shadow ${selectedItems.has(getItemKey(item)) ? 'ring-2 ring-primary' : ''}`}
            onClick={() => onView && onView(item, item._formType)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(getItemKey(item))}
                    onChange={(e) => {
                      e.stopPropagation()
                      toggleItemSelection(item)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-5 w-5 mt-1 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-2xl">{getCustomerName(item)}</CardTitle>
                      {item.order_number && (
                        <span className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-mono font-bold">
                          {item.order_number}
                        </span>
                      )}
                    </div>
                  <div className="flex flex-wrap gap-4 text-base text-muted-foreground">
                    <span><strong>Form Type:</strong> {FORM_TYPE_LABELS[item._formType as FormType]}</span>
                    <span><strong>Created:</strong> {formatDate(item.created_at)}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.status)}`}>
                      {formatStatus(item.status)}
                    </span>
                    {getVendors(item).length > 0 && (
                      <span><strong>Vendor{getVendors(item).length > 1 ? 's' : ''}:</strong> {getVendors(item).join(', ')}</span>
                    )}
                    </div>
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
                  <Button
                    variant="outline"
                    onClick={() => handleEmailClick(item)}
                    title="Email to Customer"
                    className="styled-button"
                  >
                    <Mail className="h-5 w-5" />
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
                  <SelectItem key={status} value={status}>
                    {formatStatus(status)}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && deleteConfirmation.toLowerCase() === 'delete') {
                    confirmDelete()
                  }
                }}
                placeholder="Type delete to confirm"
                style={{
                  backgroundColor: 'rgba(31, 41, 55, 0.8)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#ffffff'
                }}
                className="placeholder:text-gray-400"
                autoFocus
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

      {/* Email Confirmation Dialog */}
      <EmailConfirmDialog
        open={showEmailDialog}
        onOpenChange={(open) => {
          setShowEmailDialog(open)
          if (!open) setEmailItem(null)
        }}
        customerEmail={emailItem?.customer_email || ''}
        customerName={emailItem?.customer_name}
        onConfirm={handleEmailConfirm}
        loading={emailLoading}
      />

      {/* Bulk Status Update Dialog */}
      <AlertDialog open={showBulkStatusDialog} onOpenChange={setShowBulkStatusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Status for {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''}</AlertDialogTitle>
            <AlertDialogDescription>
              Select a new status for the selected items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={bulkNewStatus} onValueChange={setBulkNewStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map(status => (
                  <SelectItem key={status} value={status}>
                    {formatStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowBulkStatusDialog(false)
              setBulkNewStatus('')
            }}>Cancel</AlertDialogCancel>
            <Button 
              onClick={handleBulkStatusUpdate}
              disabled={!bulkNewStatus || bulkActionLoading}
              style={{
                backgroundColor: '#1e40af',
                borderColor: '#1e40af',
                color: 'white'
              }}
            >
              {bulkActionLoading ? 'Updating...' : 'Update All'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={(open) => {
        setShowBulkDeleteDialog(open)
        if (!open) setBulkDeleteConfirmation('')
      }}>
        <AlertDialogContent style={{
          backgroundColor: 'rgba(17, 24, 39, 0.98)',
          border: '2px solid rgba(59, 130, 246, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)'
        }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#ffffff' }}>Delete {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#9ca3af' }}>
              Are you sure you want to delete the selected items? This will move them to the archive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <label htmlFor="bulk-delete-confirmation" style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: '500' }}>
                Type <span style={{ color: '#ef4444', fontWeight: 'bold' }}>"delete"</span> to confirm:
              </label>
              <Input
                id="bulk-delete-confirmation"
                value={bulkDeleteConfirmation}
                onChange={(e) => setBulkDeleteConfirmation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && bulkDeleteConfirmation.toLowerCase() === 'delete') {
                    handleBulkDelete()
                  }
                }}
                placeholder="Type delete to confirm"
                style={{
                  backgroundColor: 'rgba(31, 41, 55, 0.8)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#ffffff'
                }}
                className="placeholder:text-gray-400"
                autoFocus
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowBulkDeleteDialog(false)
                setBulkDeleteConfirmation('')
              }}
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#ffffff'
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              disabled={bulkDeleteConfirmation.toLowerCase() !== 'delete' || bulkActionLoading}
              style={{
                backgroundColor: bulkDeleteConfirmation.toLowerCase() === 'delete' 
                  ? 'rgba(220, 38, 38, 0.8)' 
                  : 'rgba(107, 114, 128, 0.5)',
                border: bulkDeleteConfirmation.toLowerCase() === 'delete'
                  ? '1px solid rgba(220, 38, 38, 0.5)'
                  : '1px solid rgba(107, 114, 128, 0.3)',
                color: '#ffffff',
                cursor: bulkDeleteConfirmation.toLowerCase() === 'delete' ? 'pointer' : 'not-allowed',
                opacity: bulkDeleteConfirmation.toLowerCase() === 'delete' ? 1 : 0.6
              }}
            >
              {bulkActionLoading ? 'Deleting...' : `Delete ${selectedItems.size} Item${selectedItems.size !== 1 ? 's' : ''}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
