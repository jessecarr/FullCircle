'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Eye, Edit, Trash2, Printer, Download, RefreshCw } from 'lucide-react'
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
}

type FormType = 'special_orders' | 'inbound_transfers' | 'suppressor_approvals' | 'outbound_transfers'

const FORM_TYPE_LABELS: Record<FormType, string> = {
  special_orders: 'Special Order',
  inbound_transfers: 'Inbound Transfer',
  suppressor_approvals: 'Suppressor Approval',
  outbound_transfers: 'Outbound Transfer',
}

const ALL_STATUSES = ['pending', 'ordered', 'received', 'completed', 'cancelled', 'shipped', 'delivered']

export function FormsList({ tableName, title, onEdit, onView, refreshTrigger }: FormsListProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFormType, setSelectedFormType] = useState<FormType>('special_orders')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['pending', 'ordered'])
  const [statusUpdateItem, setStatusUpdateItem] = useState<any>(null)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const { toast } = useToast()
  const printRef = useRef<HTMLDivElement>(null)

  const fetchAllItems = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(selectedFormType)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Filter by selected statuses
      const filteredData = (data || []).filter(item => 
        selectedStatuses.length === 0 || selectedStatuses.includes(item.status)
      )
      
      // Add form type to each item for reference
      const itemsWithType = filteredData.map(item => ({
        ...item,
        _formType: selectedFormType
      }))
      
      setItems(itemsWithType)
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
  }, [selectedFormType, selectedStatuses, refreshTrigger])

  const handleDelete = async (item: any) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const { error } = await supabase
        .from(item._formType)
        .delete()
        .eq('id', item.id)

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

  const handlePrint = (item: any) => {
    // Store the item data and trigger print via the parent component
    if (onView) {
      onView(item, item._formType)
      // Delay to allow dialog to open, then trigger print
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }

  const handleDownloadPDF = async (item: any) => {
    // For now, use print to PDF functionality
    handlePrint(item)
    toast({
      title: 'Download PDF',
      description: 'Use your browser\'s "Save as PDF" option in the print dialog',
    })
  }

  const openStatusDialog = (item: any) => {
    setStatusUpdateItem(item)
    setNewStatus(item.status)
    setShowStatusDialog(true)
  }

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
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

  const getVendor = (item: any) => {
    // Check product_lines for vendor info
    if (item.product_lines && Array.isArray(item.product_lines) && item.product_lines.length > 0) {
      const vendor = item.product_lines[0]?.vendor_name || item.product_lines[0]?.vendor
      if (vendor) return vendor
    }
    return null
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
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Form Type Filter */}
            <div className="space-y-2">
              <Label className="text-lg">Form Type</Label>
              <Select 
                value={selectedFormType} 
                onValueChange={(value) => setSelectedFormType(value as FormType)}
              >
                <SelectTrigger className="w-[200px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="special_orders">Special Order</SelectItem>
                  <SelectItem value="inbound_transfers">Inbound Transfer</SelectItem>
                  <SelectItem value="suppressor_approvals">Suppressor Approval</SelectItem>
                  <SelectItem value="outbound_transfers">Outbound Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Multi-Select Filter */}
            <div className="space-y-2">
              <Label className="text-lg">Status Filter</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_STATUSES.map(status => (
                  <Button
                    key={status}
                    variant={selectedStatuses.includes(status) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleStatus(status)}
                    className="capitalize"
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        Showing {items.length} {FORM_TYPE_LABELS[selectedFormType]}(s)
      </p>

      {/* Items List */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">No forms found matching the selected filters</p>
          </CardContent>
        </Card>
      ) : (
        items.map((item) => (
          <Card key={`${item._formType}-${item.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{getCustomerName(item)}</CardTitle>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span><strong>Created:</strong> {formatDate(item.created_at)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {item.status?.charAt(0).toUpperCase() + item.status?.slice(1) || 'N/A'}
                    </span>
                    {getVendor(item) && (
                      <span><strong>Vendor:</strong> {getVendor(item)}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {onView && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onView(item, item._formType)}
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onEdit(item, item._formType)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(item)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePrint(item)}
                    title="Print"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDownloadPDF(item)}
                    title="Download PDF"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openStatusDialog(item)}
                    title="Update Status"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))
      )}

      {/* Status Update Dialog */}
      <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Update Status</AlertDialogTitle>
            <AlertDialogDescription>
              Select a new status for this form.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-white">
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
            <AlertDialogAction onClick={handleStatusUpdate}>Update</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
