'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { Check, Package, Calendar, AlertCircle, Truck } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
  product_lines: any[]
}

export default function GrafsArrivingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [orders, setOrders] = useState<GrafsOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [markArrivedDialogOpen, setMarkArrivedDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<GrafsOrder | null>(null)

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

      // Get the special orders data
      const specialOrderIds = [...new Set(trackingData.map(t => t.special_order_id))]
      const { data: specialOrders, error: ordersError } = await supabase
        .from('special_orders')
        .select('id, customer_name, customer_phone, product_lines')
        .in('id', specialOrderIds)
        .is('deleted_at', null)

      if (ordersError) throw ordersError

      // Merge the data
      const mergedOrders = trackingData.map(tracking => {
        const specialOrder = specialOrders?.find(so => so.id === tracking.special_order_id)
        return {
          ...tracking,
          customer_name: specialOrder?.customer_name || 'Unknown',
          customer_phone: specialOrder?.customer_phone || '',
          product_lines: specialOrder?.product_lines || [],
        }
      })

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
      const { error } = await supabase
        .from('grafs_order_tracking')
        .update({
          arrived: true,
          arrived_at: new Date().toISOString(),
          arrived_by: user?.id,
        })
        .eq('id', selectedOrder.id)

      if (error) throw error

      toast({
        title: 'Marked as Arrived',
        description: 'The order has been marked as arrived.',
      })

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

  const getProductInfo = (order: GrafsOrder) => {
    const productLine = order.product_lines[order.product_line_index]
    if (!productLine) return { description: 'Unknown Item', sku: '', quantity: 0 }
    return {
      description: productLine.description || 'No Description',
      sku: productLine.sku || '',
      quantity: productLine.quantity || 1,
    }
  }

  const isOverdue = (date: string) => {
    const deliveryDate = new Date(date)
    const today = new Date()
    deliveryDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    return deliveryDate < today
  }

  const isToday = (date: string) => {
    const deliveryDate = new Date(date)
    const today = new Date()
    deliveryDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    return deliveryDate.getTime() === today.getTime()
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
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Graf & Sons Arriving Orders</h1>
              <p className="text-muted-foreground">
                Track special orders from Graf & Sons that are expected to arrive.
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push('/grafs-schedule')}>
              <Calendar className="h-4 w-4 mr-2" />
              Manage Schedule
            </Button>
          </div>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : orders.length === 0 ? (
          <Card>
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
                        {new Date(date).toLocaleDateString('en-US', {
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
                    {dateOrders.map((order) => {
                      const product = getProductInfo(order)
                      return (
                        <Card key={order.id} className={`${
                          overdue ? 'border-red-500/30' : ''
                        }`}>
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${
                                  overdue ? 'bg-red-500/20' : 'bg-slate-700/50'
                                }`}>
                                  <Package className={`h-4 w-4 ${
                                    overdue ? 'text-red-400' : 'text-muted-foreground'
                                  }`} />
                                </div>
                                <div>
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
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedOrder(order)
                                  setMarkArrivedDialogOpen(true)
                                }}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Mark Arrived
                              </Button>
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
                <Check className="h-4 w-4 mr-2" />
                Mark Arrived
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}
