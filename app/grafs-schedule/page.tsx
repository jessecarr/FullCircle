'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { Calendar, Plus, Trash2, Truck, ArrowLeft } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeliveryDate {
  id: string
  delivery_date: string
  notes: string | null
  created_at: string
}

export default function GrafsSchedulePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [deliveryDates, setDeliveryDates] = useState<DeliveryDate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [dateToDelete, setDateToDelete] = useState<DeliveryDate | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchDeliveryDates()
    }
  }, [user])

  const fetchDeliveryDates = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('grafs_delivery_schedule')
        .select('*')
        .order('delivery_date', { ascending: true })

      if (error) {
        // Table might not exist yet - migration not run
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Graf delivery schedule table not found - run migration first')
          setDeliveryDates([])
          return
        }
        throw error
      }
      setDeliveryDates(data || [])
    } catch (error: any) {
      console.error('Error fetching delivery dates:', error)
      // Don't show error toast if table doesn't exist
      if (!error?.message?.includes('does not exist')) {
        toast({
          title: 'Error',
          description: 'Failed to load delivery schedule. Please run database migration.',
          variant: 'destructive',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddDate = async () => {
    if (!selectedDate) {
      toast({
        title: 'Error',
        description: 'Please select a date',
        variant: 'destructive',
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('grafs_delivery_schedule')
        .insert({
          delivery_date: selectedDate,
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Error',
            description: 'This date is already scheduled',
            variant: 'destructive',
          })
          return
        }
        // Table doesn't exist - migration not run
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          toast({
            title: 'Migration Required',
            description: 'Please run the database migration first to enable this feature.',
            variant: 'destructive',
          })
          return
        }
        throw error
      }

      toast({
        title: 'Success',
        description: 'Delivery date added',
      })

      setDeliveryDates(prev => [...prev, data].sort((a, b) => 
        new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime()
      ))
      setSelectedDate('')
    } catch (error) {
      console.error('Error adding delivery date:', error)
      toast({
        title: 'Error',
        description: 'Failed to add delivery date',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteDate = async () => {
    if (!dateToDelete) return

    try {
      const { error } = await supabase
        .from('grafs_delivery_schedule')
        .delete()
        .eq('id', dateToDelete.id)

      if (error) throw error

      toast({
        title: 'Deleted',
        description: 'Delivery date removed',
      })

      setDeliveryDates(prev => prev.filter(d => d.id !== dateToDelete.id))
    } catch (error) {
      console.error('Error deleting delivery date:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete delivery date',
        variant: 'destructive',
      })
    } finally {
      setDeleteDialogOpen(false)
      setDateToDelete(null)
    }
  }

  const getNextDeliveryDate = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const futureDate = deliveryDates.find(d => {
      const date = new Date(d.delivery_date)
      date.setHours(0, 0, 0, 0)
      return date >= today
    })
    
    return futureDate
  }

  const nextDelivery = getNextDeliveryDate()

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
        {/* Back Button */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => router.push('/settings')}
            className="styled-button flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Graf & Sons Delivery Schedule</h1>
          <p className="text-muted-foreground">
            Manage scheduled delivery dates for Graf & Sons orders.
          </p>
        </div>

        {/* Next Delivery Banner */}
        {nextDelivery && (
          <Card className="mb-6 border-blue-500/50 bg-blue-500/10">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/20">
                  <Truck className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Next Delivery</div>
                  <div className="text-xl font-bold text-blue-400">
                    {new Date(nextDelivery.delivery_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="ml-auto"
                  onClick={() => router.push('/grafs-arriving')}
                >
                  View Arriving Orders
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add New Date */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Add Delivery Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button onClick={handleAddDate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Date
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Dates List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scheduled Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : deliveryDates.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No delivery dates scheduled. Add one above.
              </p>
            ) : (
              <div className="space-y-2">
                {deliveryDates.map((date) => {
                  const deliveryDate = new Date(date.delivery_date)
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  deliveryDate.setHours(0, 0, 0, 0)
                  const isPast = deliveryDate < today
                  const isToday = deliveryDate.getTime() === today.getTime()
                  const isNext = nextDelivery?.id === date.id

                  return (
                    <div
                      key={date.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isToday ? 'border-green-500/50 bg-green-500/10' :
                        isNext ? 'border-blue-500/50 bg-blue-500/10' :
                        isPast ? 'border-slate-700 bg-slate-800/50 opacity-60' :
                        'border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className={`h-5 w-5 ${
                          isToday ? 'text-green-400' :
                          isNext ? 'text-blue-400' :
                          'text-muted-foreground'
                        }`} />
                        <div>
                          <div className={`font-medium ${isPast ? 'line-through' : ''}`}>
                            {deliveryDate.toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          {isToday && (
                            <span className="text-xs text-green-400 font-medium">TODAY</span>
                          )}
                          {isNext && !isToday && (
                            <span className="text-xs text-blue-400 font-medium">NEXT DELIVERY</span>
                          )}
                          {isPast && (
                            <span className="text-xs text-muted-foreground">PAST</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDateToDelete(date)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Delivery Date?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this delivery date from the schedule?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button variant="destructive" onClick={handleDeleteDate}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}
