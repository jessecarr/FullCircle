'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { Package, Calendar, AlertCircle, Truck, ArrowLeft, Download, Eye, ChevronLeft, ChevronRight, X, Check } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { PageNavigation } from '@/components/PageNavigation'

interface GrafsOrder {
  id: string
  special_order_id: string
  product_line_index: number
  expected_delivery_date: string
  arrived: boolean
  arrived_at: string | null
  created_at: string
  // Joined data from special_orders
  customer_name: string
  customer_phone: string
  customer_email: string
  product_lines: any[]
  order_status: string
  // Full special order data for viewing
  fullOrderData?: any
}

export default function GrafsArrivingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [orders, setOrders] = useState<GrafsOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [markArrivedDialogOpen, setMarkArrivedDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<GrafsOrder | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewingOrder, setViewingOrder] = useState<GrafsOrder | null>(null)
  const [viewingOrderIndex, setViewingOrderIndex] = useState<number>(-1)
  const [bulkMarkDialogOpen, setBulkMarkDialogOpen] = useState(false)
  const [emailPromptOpen, setEmailPromptOpen] = useState(false)
  const [orderToEmail, setOrderToEmail] = useState<GrafsOrder | null>(null)
  const [emailSending, setEmailSending] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchOrders()
    }
  }, [user])

  const fetchOrders = async () => {
    setIsLoading(true)
    try {
      // Get all non-arrived Graf tracking records
      const { data: trackingData, error: trackingError } = await supabase
        .from('grafs_order_tracking')
        .select('*')
        .eq('arrived', false)
        .order('expected_delivery_date', { ascending: true })

      if (trackingError) throw trackingError

      if (!trackingData || trackingData.length === 0) {
        setOrders([])
        setIsLoading(false)
        return
      }

      // Get the special orders data (exclude deleted orders)
      const specialOrderIds = [...new Set(trackingData.map(t => t.special_order_id))]
      const { data: specialOrders, error: ordersError } = await supabase
        .from('special_orders')
        .select('id, customer_name, customer_phone, customer_email, product_lines, status')
        .in('id', specialOrderIds)
        .is('deleted_at', null)

      if (ordersError) throw ordersError

      // Merge the data - filter out tracking for deleted special orders
      const mergedOrders = trackingData
        .map(tracking => {
          const specialOrder = specialOrders?.find(so => so.id === tracking.special_order_id)
          if (!specialOrder) return null // Skip if special order was deleted
          return {
            ...tracking,
            customer_name: specialOrder.customer_name || 'Unknown',
            customer_phone: specialOrder.customer_phone || '',
            customer_email: specialOrder.customer_email || '',
            product_lines: specialOrder.product_lines || [],
            order_status: specialOrder.status || 'pending',
          }
        })
        .filter((order): order is NonNullable<typeof order> => order !== null)

      setOrders(mergedOrders)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast({
        title: 'Error',
        description: 'Failed to load arriving orders',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkArrived = async () => {
    if (!selectedOrder) return

    try {
      // 1. Mark the tracking record as arrived
      const { error } = await supabase
        .from('grafs_order_tracking')
        .update({
          arrived: true,
          arrived_at: new Date().toISOString(),
          arrived_by: user?.id,
        })
        .eq('id', selectedOrder.id)

      if (error) throw error

      // 2. Update the product line item as completed in the special order
      const updatedProductLines = [...selectedOrder.product_lines]
      if (updatedProductLines[selectedOrder.product_line_index]) {
        updatedProductLines[selectedOrder.product_line_index] = {
          ...updatedProductLines[selectedOrder.product_line_index],
          completed: true
        }
      }

      // 3. Check if all items are now completed
      const allItemsCompleted = updatedProductLines.every((line: any) => line.completed === true)

      // 4. Update the special order with completed items and potentially update status
      const updateData: any = { product_lines: updatedProductLines }
      if (allItemsCompleted) {
        updateData.status = 'completed'
      }

      const { error: updateError } = await supabase
        .from('special_orders')
        .update(updateData)
        .eq('id', selectedOrder.special_order_id)

      if (updateError) throw updateError

      toast({
        title: 'Marked as Arrived',
        description: allItemsCompleted 
          ? 'All items arrived! Order marked as completed.'
          : 'The item has been marked as arrived.',
      })

      // 5. If all items completed and customer has email, prompt to send email
      if (allItemsCompleted && selectedOrder.customer_email) {
        setOrderToEmail(selectedOrder)
        setEmailPromptOpen(true)
      }

      setOrders(prev => prev.filter(o => o.id !== selectedOrder.id))
    } catch (error) {
      console.error('Error marking order as arrived:', error)
      toast({
        title: 'Error',
        description: 'Failed to mark order as arrived',
        variant: 'destructive',
      })
    } finally {
      setMarkArrivedDialogOpen(false)
      setSelectedOrder(null)
    }
  }

  const handleSendPickupEmail = async () => {
    if (!orderToEmail) return

    setEmailSending(true)
    try {
      // Fetch full order data for the email
      const { data: fullOrder, error: fetchError } = await supabase
        .from('special_orders')
        .select('*')
        .eq('id', orderToEmail.special_order_id)
        .single()

      if (fetchError) throw fetchError

      const { sendFormEmail } = await import('@/lib/emailUtils')
      
      // Create custom email content for pickup notification
      const pickupMessage = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }
            .highlight { background: #e8f4e8; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Full Circle Reloading</h1>
            </div>
            <div class="content">
              <p>Dear ${orderToEmail.customer_name || 'Valued Customer'},</p>
              <div class="highlight">
                <p><strong>Great news!</strong> Your special order has arrived and is ready for pickup at your earliest convenience.</p>
              </div>
              <p><strong>Store Hours:</strong><br>
              Tuesday - Saturday: 9am - 5pm</p>
              <p><strong>Questions?</strong><br>
              Give us a call at <strong>636-946-7468</strong></p>
              <p>Thank you for your business!</p>
              <p>Best regards,<br>Full Circle Reloading</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `

      // Generate form image for attachment
      const { generateFormImageBase64 } = await import('@/lib/printUtils')
      const imageBase64 = await generateFormImageBase64(fullOrder, 'special_orders')

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: orderToEmail.customer_email,
          subject: 'Your Special Order is Ready for Pickup - Full Circle Reloading',
          htmlContent: pickupMessage,
          imageBase64,
          imageFilename: `Special_Order_${fullOrder.id}.jpg`,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Email Sent',
          description: `Pickup notification sent to ${orderToEmail.customer_email}`,
        })
      } else {
        throw new Error(result.error || 'Failed to send email')
      }
    } catch (error) {
      console.error('Error sending pickup email:', error)
      toast({
        title: 'Email Failed',
        description: error instanceof Error ? error.message : 'Failed to send email',
        variant: 'destructive',
      })
    } finally {
      setEmailSending(false)
      setEmailPromptOpen(false)
      setOrderToEmail(null)
    }
  }

  const getProductInfo = (order: GrafsOrder) => {
    const productLine = order.product_lines[order.product_line_index]
    if (!productLine) return { description: 'Unknown Item', sku: '', quantity: 0 }
    return {
      description: productLine.description || 'No Description',
      sku: productLine.sku || '',
      quantity: productLine.quantity || 1,
    }
  }

  // Selection handlers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const selectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(orders.map(o => o.id)))
    }
  }

  // Viewing handlers
  const viewOrder = async (order: GrafsOrder, index: number) => {
    // Fetch full special order data
    const { data, error } = await supabase
      .from('special_orders')
      .select('*')
      .eq('id', order.special_order_id)
      .single()
    
    if (!error && data) {
      setViewingOrder({ ...order, fullOrderData: data })
      setViewingOrderIndex(index)
    } else {
      setViewingOrder(order)
      setViewingOrderIndex(index)
    }
  }

  const closeViewer = () => {
    setViewingOrder(null)
    setViewingOrderIndex(-1)
  }

  const navigateOrder = async (direction: 'prev' | 'next') => {
    const flatOrders = orders
    const newIndex = direction === 'prev' ? viewingOrderIndex - 1 : viewingOrderIndex + 1
    if (newIndex >= 0 && newIndex < flatOrders.length) {
      await viewOrder(flatOrders[newIndex], newIndex)
    }
  }

  // Bulk mark arrived
  const handleBulkMarkArrived = async () => {
    if (selectedIds.size === 0) return

    try {
      const { error } = await supabase
        .from('grafs_order_tracking')
        .update({
          arrived: true,
          arrived_at: new Date().toISOString(),
          arrived_by: user?.id,
        })
        .in('id', Array.from(selectedIds))

      if (error) throw error

      toast({
        title: 'Marked as Arrived',
        description: `${selectedIds.size} order(s) have been marked as arrived.`,
      })

      setOrders(prev => prev.filter(o => !selectedIds.has(o.id)))
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Error marking orders as arrived:', error)
      toast({
        title: 'Error',
        description: 'Failed to mark orders as arrived',
        variant: 'destructive',
      })
    } finally {
      setBulkMarkDialogOpen(false)
    }
  }

  const parseLocalDate = (dateStr: string) => {
    // Parse date string as local date to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const isOverdue = (date: string) => {
    const deliveryDate = parseLocalDate(date)
    const today = new Date()
    deliveryDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    return deliveryDate < today
  }

  const isToday = (date: string) => {
    const deliveryDate = parseLocalDate(date)
    const today = new Date()
    deliveryDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    return deliveryDate.getTime() === today.getTime()
  }

  const exportToExcel = () => {
    if (orders.length === 0) {
      toast({
        title: 'No Data',
        description: 'No orders to export',
        variant: 'destructive',
      })
      return
    }

    // Build CSV data
    const headers = ['Customer Name', 'Phone', 'Product', 'SKU', 'Quantity', 'Expected Delivery Date']
    const rows = orders.map(order => {
      const product = getProductInfo(order)
      const [year, month, day] = order.expected_delivery_date.split('-').map(Number)
      const formattedDate = new Date(year, month - 1, day).toLocaleDateString('en-US')
      return [
        order.customer_name,
        order.customer_phone,
        product.description,
        product.sku,
        product.quantity.toString(),
        formattedDate
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `grafs-arriving-orders-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: 'Exported',
      description: `${orders.length} orders exported to CSV`,
    })
  }

  // Group orders by expected delivery date
  const groupedOrders = orders.reduce((acc, order) => {
    const date = order.expected_delivery_date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(order)
    return acc
  }, {} as Record<string, GrafsOrder[]>)

  const sortedDates = Object.keys(groupedOrders).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <PageNavigation backButtonText="Back to Dashboard" />

        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Graf & Sons Arriving Orders</h1>
              <p className="text-muted-foreground">
                Track special orders from Graf & Sons that are expected to arrive.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToExcel} disabled={orders.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
              <Button variant="outline" onClick={() => router.push('/grafs-schedule')}>
                <Calendar className="h-4 w-4 mr-2" />
                Manage Schedule
              </Button>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {orders.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedIds.size === orders.length && orders.length > 0}
                onChange={selectAll}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
              </span>
            </div>
            {selectedIds.size > 0 && (
              <Button 
                size="sm" 
                onClick={() => setBulkMarkDialogOpen(true)}
              >
                Mark {selectedIds.size} as Arrived
              </Button>
            )}
          </div>
        )}

        {/* Orders List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : orders.length === 0 ? (
          <Card className="landing-card">
            <CardContent className="py-12 text-center">
              <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No pending Graf & Sons orders.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Orders will appear here when special orders with Graf & Sons vendor are created.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => {
              const dateOrders = groupedOrders[date]
              const overdue = isOverdue(date)
              const today = isToday(date)

              return (
                <div key={date}>
                  {/* Date Header */}
                  <div className={`flex items-center gap-3 mb-3 p-3 rounded-lg ${
                    overdue ? 'bg-red-500/10 border border-red-500/30' :
                    today ? 'bg-green-500/10 border border-green-500/30' :
                    'bg-slate-800/50 border border-slate-700'
                  }`}>
                    {overdue ? (
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    ) : today ? (
                      <Truck className="h-5 w-5 text-green-400" />
                    ) : (
                      <Calendar className="h-5 w-5 text-blue-400" />
                    )}
                    <div>
                      <div className={`font-semibold ${
                        overdue ? 'text-red-400' :
                        today ? 'text-green-400' :
                        'text-foreground'
                      }`}>
                        {parseLocalDate(date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {overdue ? 'OVERDUE - Should have arrived' :
                         today ? 'TODAY - Expected delivery' :
                         'Upcoming delivery'}
                        {' • '}{dateOrders.length} item{dateOrders.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Orders for this date */}
                  <div className="space-y-2 ml-4">
                    {dateOrders.map((order, orderIndex) => {
                      const product = getProductInfo(order)
                      const globalIndex = orders.findIndex(o => o.id === order.id)
                      return (
                        <Card 
                          key={order.id} 
                          className={`landing-card cursor-pointer ${
                            overdue ? 'border-red-500/30' : ''
                          } ${selectedIds.has(order.id) ? 'ring-2 ring-blue-500' : ''}`}
                          onClick={() => viewOrder(order, globalIndex)}
                        >
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(order.id)}
                                  onChange={() => toggleSelection(order.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 rounded"
                                />
                                <div 
                                  className={`p-2 rounded-lg ${
                                    overdue ? 'bg-red-500/20' : 'bg-slate-700/50'
                                  }`}
                                >
                                  <Package className={`h-4 w-4 ${
                                    overdue ? 'text-red-400' : 'text-muted-foreground'
                                  }`} />
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium">{order.customer_name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {product.description}
                                    {product.sku && ` (${product.sku})`}
                                    {product.quantity > 1 && ` × ${product.quantity}`}
                                  </div>
                                  {order.customer_phone && (
                                    <div className="text-xs text-muted-foreground">
                                      {order.customer_phone}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedOrder(order)
                                    setMarkArrivedDialogOpen(true)
                                  }}
                                >
                                  Mark Arrived
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Mark Arrived Dialog */}
        <AlertDialog open={markArrivedDialogOpen} onOpenChange={setMarkArrivedDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark as Arrived?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark the order for <strong>{selectedOrder?.customer_name}</strong> as arrived.
                It will be removed from this tracking list.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button onClick={handleMarkArrived}>
                Mark Arrived
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Mark Arrived Dialog */}
        <AlertDialog open={bulkMarkDialogOpen} onOpenChange={setBulkMarkDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark {selectedIds.size} Orders as Arrived?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark {selectedIds.size} selected order(s) as arrived.
                They will be removed from this tracking list.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button onClick={handleBulkMarkArrived}>
                Mark All as Arrived
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Order Viewer Dialog - uses Dialog component which closes on outside click */}
        <Dialog open={!!viewingOrder} onOpenChange={(open) => !open && closeViewer()}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Order Details</DialogTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateOrder('prev')}
                    disabled={viewingOrderIndex <= 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {viewingOrderIndex + 1} of {orders.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateOrder('next')}
                    disabled={viewingOrderIndex >= orders.length - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>
            
            {viewingOrder && (
              <div className="space-y-4 py-4">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Customer Name</div>
                    <div className="font-medium">{viewingOrder.customer_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Phone</div>
                    <div className="font-medium">{viewingOrder.customer_phone || 'N/A'}</div>
                  </div>
                </div>

                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Expected Delivery</div>
                    <div className="font-medium">
                      {parseLocalDate(viewingOrder.expected_delivery_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div className="font-medium">
                      {isOverdue(viewingOrder.expected_delivery_date) ? (
                        <span className="text-red-400">OVERDUE</span>
                      ) : isToday(viewingOrder.expected_delivery_date) ? (
                        <span className="text-green-400">DUE TODAY</span>
                      ) : (
                        <span className="text-blue-400">UPCOMING</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Product Lines */}
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Order Items</div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-800">
                        <tr>
                          <th className="text-left p-2 text-sm">Description</th>
                          <th className="text-left p-2 text-sm">SKU</th>
                          <th className="text-left p-2 text-sm">Vendor</th>
                          <th className="text-right p-2 text-sm">Qty</th>
                          <th className="text-right p-2 text-sm">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingOrder.product_lines?.map((line: any, idx: number) => (
                          <tr key={idx} className={`border-t border-slate-700 ${idx === viewingOrder.product_line_index ? 'bg-blue-500/20' : ''}`}>
                            <td className="p-2 text-sm">{line.description || 'N/A'}</td>
                            <td className="p-2 text-sm">{line.sku || 'N/A'}</td>
                            <td className="p-2 text-sm">{line.vendor_name || line.vendor || 'N/A'}</td>
                            <td className="p-2 text-sm text-right">{line.quantity || 1}</td>
                            <td className="p-2 text-sm text-right">${(line.total_price || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    * Highlighted row is the Graf & Sons item being tracked
                  </p>
                </div>

                {/* Full Order Data if available */}
                {viewingOrder.fullOrderData && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Order Status</div>
                      <div className="font-medium capitalize">{viewingOrder.fullOrderData.status || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Payment Method</div>
                      <div className="font-medium capitalize">{viewingOrder.fullOrderData.payment?.replace('_', ' ') || 'N/A'}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={closeViewer}>Close</Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  if (viewingOrder) {
                    setSelectedOrder(viewingOrder)
                    setMarkArrivedDialogOpen(true)
                    closeViewer()
                  }
                }}
              >
                Mark Arrived
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Email Prompt Dialog */}
        <AlertDialog open={emailPromptOpen} onOpenChange={setEmailPromptOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Send Pickup Notification?</AlertDialogTitle>
              <AlertDialogDescription>
                All items for this order have arrived. Would you like to send an email to{' '}
                <strong>{orderToEmail?.customer_name}</strong> at{' '}
                <strong>{orderToEmail?.customer_email}</strong> to notify them that their order is ready for pickup?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setEmailPromptOpen(false)
                setOrderToEmail(null)
              }}>
                Skip
              </AlertDialogCancel>
              <Button 
                onClick={handleSendPickupEmail}
                disabled={emailSending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {emailSending ? 'Sending...' : 'Send Email'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}
