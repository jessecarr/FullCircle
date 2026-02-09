'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { Calendar as CalendarIcon, Plus, Trash2, Truck, ArrowLeft, X, Pencil, Check } from 'lucide-react'
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
import { Calendar } from '@/components/ui/calendar'

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
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false)
  const [selectedCalendarDates, setSelectedCalendarDates] = useState<Date[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [dateToDelete, setDateToDelete] = useState<DeliveryDate | null>(null)
  const [selectedDateIds, setSelectedDateIds] = useState<Set<string>>(new Set())
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [editingDateId, setEditingDateId] = useState<string | null>(null)
  const [editingDateValue, setEditingDateValue] = useState<string>('')
  const [editCalendarOpen, setEditCalendarOpen] = useState(false)
  const [editSelectedDate, setEditSelectedDate] = useState<Date | null>(null)

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

  const handleAddDates = async () => {
    if (selectedCalendarDates.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one date',
        variant: 'destructive',
      })
      return
    }

    try {
      const insertData = selectedCalendarDates.map(date => ({
        delivery_date: date.toISOString().split('T')[0],
        created_by: user?.id,
      }))
      
      const { data, error } = await supabase
        .from('grafs_delivery_schedule')
        .insert(insertData)
        .select()

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Error',
            description: 'One or more dates are already scheduled',
            variant: 'destructive',
          })
          return
        }
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
        description: `${data.length} delivery date${data.length > 1 ? 's' : ''} added`,
      })

      setDeliveryDates(prev => [...prev, ...data].sort((a, b) => 
        new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime()
      ))
      setSelectedCalendarDates([])
      setCalendarDialogOpen(false)

      // Sync arriving orders - update to sooner dates if applicable
      for (const addedDate of data) {
        await fetch('/api/sync-grafs-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add', newDate: addedDate.delivery_date })
        })
      }
    } catch (error) {
      console.error('Error adding delivery dates:', error)
      toast({
        title: 'Error',
        description: 'Failed to add delivery dates',
        variant: 'destructive',
      })
    }
  }

  const toggleDateSelection = (id: string) => {
    setSelectedDateIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedDateIds.size === deliveryDates.length) {
      setSelectedDateIds(new Set())
    } else {
      setSelectedDateIds(new Set(deliveryDates.map(d => d.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedDateIds.size === 0) return

    try {
      const { error } = await supabase
        .from('grafs_delivery_schedule')
        .delete()
        .in('id', Array.from(selectedDateIds))

      if (error) throw error

      toast({
        title: 'Deleted',
        description: `${selectedDateIds.size} delivery date${selectedDateIds.size > 1 ? 's' : ''} removed`,
      })

      setDeliveryDates(prev => prev.filter(d => !selectedDateIds.has(d.id)))
      setSelectedDateIds(new Set())
    } catch (error) {
      console.error('Error deleting delivery dates:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete delivery dates',
        variant: 'destructive',
      })
    } finally {
      setBulkDeleteDialogOpen(false)
    }
  }

  const startEditing = (date: DeliveryDate) => {
    setEditingDateId(date.id)
    setEditingDateValue(date.delivery_date)
    // Parse the date string to a Date object for the calendar
    const [year, month, day] = date.delivery_date.split('-').map(Number)
    setEditSelectedDate(new Date(year, month - 1, day))
    setEditCalendarOpen(true)
  }

  const cancelEditing = () => {
    setEditingDateId(null)
    setEditingDateValue('')
    setEditCalendarOpen(false)
    setEditSelectedDate(null)
  }

  const saveEditedDate = async () => {
    if (!editingDateId || !editingDateValue) return

    try {
      const { data, error } = await supabase
        .from('grafs_delivery_schedule')
        .update({ delivery_date: editingDateValue })
        .eq('id', editingDateId)
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
        throw error
      }

      toast({
        title: 'Success',
        description: 'Delivery date updated',
      })

      // Get old date before updating state
      const oldDate = deliveryDates.find(d => d.id === editingDateId)?.delivery_date

      setDeliveryDates(prev => 
        prev.map(d => d.id === editingDateId ? data : d)
          .sort((a, b) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime())
      )
      setEditingDateId(null)
      setEditingDateValue('')
      setEditCalendarOpen(false)
      setEditSelectedDate(null)

      // Sync arriving orders - update orders from old date to new date
      if (oldDate && oldDate !== editingDateValue) {
        await fetch('/api/sync-grafs-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'change', 
            changedDate: { oldDate, newDate: editingDateValue } 
          })
        })
      }
    } catch (error) {
      console.error('Error updating delivery date:', error)
      toast({
        title: 'Error',
        description: 'Failed to update delivery date',
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

      const deletedDateValue = dateToDelete.delivery_date
      setDeliveryDates(prev => prev.filter(d => d.id !== dateToDelete.id))

      // Sync arriving orders - move orders from deleted date to next available
      await fetch('/api/sync-grafs-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', deletedDate: deletedDateValue })
      })
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
      // Parse date string as local date to avoid timezone issues
      const [year, month, day] = d.delivery_date.split('-').map(Number)
      const date = new Date(year, month - 1, day)
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
                    {(() => {
                      const [year, month, day] = nextDelivery.delivery_date.split('-').map(Number)
                      return new Date(year, month - 1, day).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    })()}
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

        {/* Add New Dates Button */}
        <div className="mb-6">
          <Button 
            onClick={() => setCalendarDialogOpen(true)} 
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Delivery Dates
          </Button>
        </div>

        {/* Delivery Dates List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Scheduled Deliveries</CardTitle>
              {deliveryDates.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                  >
                    {selectedDateIds.size === deliveryDates.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  {selectedDateIds.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setBulkDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedDateIds.size})
                    </Button>
                  )}
                </div>
              )}
            </div>
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
                  const [year, month, day] = date.delivery_date.split('-').map(Number)
                  const deliveryDate = new Date(year, month - 1, day)
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  deliveryDate.setHours(0, 0, 0, 0)
                  const isPast = deliveryDate < today
                  const isToday = deliveryDate.getTime() === today.getTime()
                  const isNext = nextDelivery?.id === date.id
                  const isEditing = editingDateId === date.id
                  const isSelected = selectedDateIds.has(date.id)

                  // Calculate cutoff date (2 days before delivery at noon CST)
                  const cutoffDate = new Date(year, month - 1, day)
                  cutoffDate.setDate(cutoffDate.getDate() - 2)
                  const cutoffStr = cutoffDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })

                  return (
                    <div
                      key={date.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isSelected ? 'border-primary bg-primary/10' :
                        isToday ? 'border-green-500/50 bg-green-500/10' :
                        isNext ? 'border-blue-500/50 bg-blue-500/10' :
                        isPast ? 'border-slate-700 bg-slate-800/50 opacity-60' :
                        'border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleDateSelection(date.id)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <CalendarIcon className={`h-5 w-5 ${
                          isToday ? 'text-green-400' :
                          isNext ? 'text-blue-400' :
                          'text-muted-foreground'
                        }`} />
                        <div>
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                value={editingDateValue}
                                onChange={(e) => setEditingDateValue(e.target.value)}
                                className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              />
                              <Button variant="ghost" size="sm" onClick={saveEditedDate}>
                                <Check className="h-4 w-4 text-green-400" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={cancelEditing}>
                                <X className="h-4 w-4 text-red-400" />
                              </Button>
                            </div>
                          ) : (
                            <>
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
                              {!isPast && (
                                <div className="text-xs text-muted-foreground">
                                  Order cutoff: {cutoffStr} at 12:00 PM CST
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {!isEditing && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(date)}
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>
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
                      )}
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

        {/* Bulk Delete Confirmation Dialog */}
        <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedDateIds.size} Delivery Date{selectedDateIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove the selected delivery dates from the schedule? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button variant="destructive" onClick={handleBulkDelete}>
                Delete {selectedDateIds.size} Date{selectedDateIds.size > 1 ? 's' : ''}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Calendar Dialog for Adding Multiple Dates */}
        <Dialog open={calendarDialogOpen} onOpenChange={setCalendarDialogOpen}>
          <DialogContent className="max-w-md bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle>Select Delivery Dates</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Calendar
                selectedDates={selectedCalendarDates}
                onDatesChange={setSelectedCalendarDates}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setCalendarDialogOpen(false)
                setSelectedCalendarDates([])
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddDates}
                disabled={selectedCalendarDates.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Check className="h-4 w-4 mr-2" />
                Add {selectedCalendarDates.length} Date{selectedCalendarDates.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Calendar Dialog for Editing a Date */}
        <Dialog open={editCalendarOpen} onOpenChange={(open) => {
          if (!open) cancelEditing()
        }}>
          <DialogContent className="max-w-md bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle>Select New Date</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Calendar
                selectedDates={editSelectedDate ? [editSelectedDate] : []}
                onDatesChange={(dates) => {
                  if (dates.length > 0) {
                    const selectedDate = dates[dates.length - 1]
                    setEditSelectedDate(selectedDate)
                    setEditingDateValue(selectedDate.toISOString().split('T')[0])
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={cancelEditing}>
                Cancel
              </Button>
              <Button 
                onClick={saveEditedDate}
                disabled={!editSelectedDate}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Check className="h-4 w-4 mr-2" />
                Save Date
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
