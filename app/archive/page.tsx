'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { Trash2, Search, RotateCcw, FileText, Package, Shield, ArrowLeft, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ArchivedForm {
  id: string
  customer_name: string
  customer_phone: string
  deleted_at: string
  deleted_by: string
  created_at: string
  _formType: string
  _tableName: string
  fullData?: any
}

export default function ArchivePage() {
  const { user, loading, userRole } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [archivedForms, setArchivedForms] = useState<ArchivedForm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [selectedForm, setSelectedForm] = useState<ArchivedForm | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewingForm, setViewingForm] = useState<ArchivedForm | null>(null)
  const [viewingFormIndex, setViewingFormIndex] = useState<number>(-1)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [bulkRestoreDialogOpen, setBulkRestoreDialogOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchArchivedForms()
    }
  }, [user])

  const fetchArchivedForms = async () => {
    setIsLoading(true)
    try {
      const tables = [
        { name: 'special_orders', type: 'Special Order' },
        { name: 'inbound_transfers', type: 'Inbound Transfer' },
        { name: 'outbound_transfers', type: 'Outbound Transfer' },
        { name: 'suppressor_approvals', type: 'Suppressor Approval' },
        { name: 'consignment_forms', type: 'Consignment' },
      ]

      const allForms: ArchivedForm[] = []

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table.name)
          .select('id, customer_name, customer_phone, deleted_at, deleted_by, created_at')
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false })

        if (error) {
          // Column might not exist yet - migration not run
          // This is expected if deleted_at column doesn't exist
          if (error.message?.includes('deleted_at') || error.code === '42703') {
            console.warn(`${table.name}: deleted_at column not found - run migration first`)
            continue
          }
          console.error(`Error fetching ${table.name}:`, error)
          continue
        }

        if (data) {
          allForms.push(...data.map(form => ({
            ...form,
            _formType: table.type,
            _tableName: table.name,
          })))
        }
      }

      // Sort by deleted_at
      allForms.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime())
      setArchivedForms(allForms)
    } catch (error) {
      console.error('Error fetching archived forms:', error)
      toast({
        title: 'Error',
        description: 'Failed to load archived forms',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePermanentDelete = async () => {
    if (!selectedForm) return

    try {
      const { error } = await supabase
        .from(selectedForm._tableName)
        .delete()
        .eq('id', selectedForm.id)

      if (error) throw error

      toast({
        title: 'Permanently Deleted',
        description: 'The form has been permanently deleted.',
      })

      setArchivedForms(prev => prev.filter(f => f.id !== selectedForm.id))
    } catch (error) {
      console.error('Error deleting form:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete the form',
        variant: 'destructive',
      })
    } finally {
      setDeleteDialogOpen(false)
      setSelectedForm(null)
    }
  }

  const handleRestore = async () => {
    if (!selectedForm) return

    try {
      const { error } = await supabase
        .from(selectedForm._tableName)
        .update({ deleted_at: null, deleted_by: null })
        .eq('id', selectedForm.id)

      if (error) throw error

      toast({
        title: 'Restored',
        description: 'The form has been restored.',
      })

      setArchivedForms(prev => prev.filter(f => f.id !== selectedForm.id))
    } catch (error) {
      console.error('Error restoring form:', error)
      toast({
        title: 'Error',
        description: 'Failed to restore the form',
        variant: 'destructive',
      })
    } finally {
      setRestoreDialogOpen(false)
      setSelectedForm(null)
    }
  }

  const getFormIcon = (formType: string) => {
    switch (formType) {
      case 'Special Order':
        return <FileText className="h-4 w-4" />
      case 'Inbound Transfer':
      case 'Outbound Transfer':
        return <Package className="h-4 w-4" />
      case 'Suppressor Approval':
        return <Shield className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
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
    if (selectedIds.size === filteredForms.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredForms.map(f => `${f._tableName}-${f.id}`)))
    }
  }

  // Viewing handlers
  const viewForm = async (form: ArchivedForm, index: number) => {
    // Fetch full form data
    const { data, error } = await supabase
      .from(form._tableName)
      .select('*')
      .eq('id', form.id)
      .single()
    
    if (!error && data) {
      setViewingForm({ ...form, fullData: data })
      setViewingFormIndex(index)
    } else {
      setViewingForm(form)
      setViewingFormIndex(index)
    }
  }

  const closeViewer = () => {
    setViewingForm(null)
    setViewingFormIndex(-1)
  }

  const navigateForm = async (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? viewingFormIndex - 1 : viewingFormIndex + 1
    if (newIndex >= 0 && newIndex < filteredForms.length) {
      await viewForm(filteredForms[newIndex], newIndex)
    }
  }

  // Bulk restore handler
  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return

    try {
      // Group by table name for batch updates
      const byTable = new Map<string, string[]>()
      selectedIds.forEach(id => {
        const [tableName, formId] = id.split('-')
        if (!byTable.has(tableName)) {
          byTable.set(tableName, [])
        }
        byTable.get(tableName)!.push(formId)
      })

      for (const [tableName, ids] of byTable) {
        const { error } = await supabase
          .from(tableName)
          .update({ deleted_at: null, deleted_by: null })
          .in('id', ids)

        if (error) throw error
      }

      toast({
        title: 'Restored',
        description: `${selectedIds.size} form(s) have been restored.`,
      })

      setArchivedForms(prev => prev.filter(f => !selectedIds.has(`${f._tableName}-${f.id}`)))
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Error restoring forms:', error)
      toast({
        title: 'Error',
        description: 'Failed to restore forms',
        variant: 'destructive',
      })
    } finally {
      setBulkRestoreDialogOpen(false)
    }
  }

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || bulkDeleteConfirmation.toLowerCase() !== 'delete') return

    try {
      // Group by table name for batch deletes
      const byTable = new Map<string, string[]>()
      selectedIds.forEach(id => {
        const [tableName, formId] = id.split('-')
        if (!byTable.has(tableName)) {
          byTable.set(tableName, [])
        }
        byTable.get(tableName)!.push(formId)
      })

      for (const [tableName, ids] of byTable) {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .in('id', ids)

        if (error) throw error
      }

      toast({
        title: 'Deleted',
        description: `${selectedIds.size} form(s) have been permanently deleted.`,
      })

      setArchivedForms(prev => prev.filter(f => !selectedIds.has(`${f._tableName}-${f.id}`)))
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Error deleting forms:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete forms',
        variant: 'destructive',
      })
    } finally {
      setBulkDeleteDialogOpen(false)
      setBulkDeleteConfirmation('')
    }
  }

  const filteredForms = archivedForms.filter(form => {
    const matchesSearch = form.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      form.customer_phone?.includes(searchQuery)
    const matchesType = filterType === 'all' || form._formType === filterType
    return matchesSearch && matchesType
  })

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
          <h1 className="text-3xl font-bold text-foreground mb-2">Deleted Forms Archive</h1>
          <p className="text-muted-foreground">
            View and manage deleted forms. You can restore forms or permanently delete them.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Special Order">Special Orders</SelectItem>
              <SelectItem value="Inbound Transfer">Inbound Transfers</SelectItem>
              <SelectItem value="Outbound Transfer">Outbound Transfers</SelectItem>
              <SelectItem value="Suppressor Approval">Suppressor Approvals</SelectItem>
              <SelectItem value="Consignment">Consignment Forms</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions Bar */}
        {filteredForms.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredForms.length && filteredForms.length > 0}
                onChange={selectAll}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
              </span>
            </div>
            {selectedIds.size > 0 && (
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setBulkRestoreDialogOpen(true)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore {selectedIds.size} Selected
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedIds.size} Selected
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Forms List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredForms.length === 0 ? (
          <Card className="landing-card">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No archived forms found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredForms.map((form, index) => (
              <Card 
                key={`${form._tableName}-${form.id}`} 
                className={`landing-card hover:shadow-md transition-shadow cursor-pointer ${selectedIds.has(`${form._tableName}-${form.id}`) ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => viewForm(form, index)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(`${form._tableName}-${form.id}`)}
                        onChange={() => toggleSelection(`${form._tableName}-${form.id}`)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded"
                      />
                      <div className="p-2 rounded-lg bg-slate-700/50">
                        {getFormIcon(form._formType)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{form.customer_name || 'No Name'}</div>
                        <div className="text-sm text-muted-foreground">
                          {form._formType} • {form.customer_phone || 'No Phone'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Deleted: {new Date(form.deleted_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedForm(form)
                          setRestoreDialogOpen(true)
                        }}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                        onClick={() => {
                          setSelectedForm(form)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete Forever
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Permanent Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) setDeleteConfirmation('')
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently Delete Form?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the form for{' '}
                <strong>{selectedForm?.customer_name}</strong> from the database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <label className="text-sm text-muted-foreground">
                Type <span className="text-red-500 font-bold">"delete"</span> to confirm:
              </label>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && deleteConfirmation.toLowerCase() === 'delete') {
                    handlePermanentDelete()
                  }
                }}
                placeholder="Type delete to confirm"
                className="mt-2"
                autoFocus
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>Cancel</AlertDialogCancel>
              <Button 
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                onClick={handlePermanentDelete}
                disabled={deleteConfirmation.toLowerCase() !== 'delete'}
              >
                Delete Forever
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Restore Dialog */}
        <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restore Form?</AlertDialogTitle>
              <AlertDialogDescription>
                This will restore the form for <strong>{selectedForm?.customer_name}</strong> back to the main forms list.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button onClick={handleRestore}>Restore</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete Dialog */}
        <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={(open) => {
          setBulkDeleteDialogOpen(open)
          if (!open) setBulkDeleteConfirmation('')
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently Delete {selectedIds.size} Forms?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete {selectedIds.size} selected form(s) from the database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <label className="text-sm text-muted-foreground">
                Type <span className="text-red-500 font-bold">"delete"</span> to confirm:
              </label>
              <Input
                value={bulkDeleteConfirmation}
                onChange={(e) => setBulkDeleteConfirmation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && bulkDeleteConfirmation.toLowerCase() === 'delete') {
                    handleBulkDelete()
                  }
                }}
                placeholder="Type delete to confirm"
                className="mt-2"
                autoFocus
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setBulkDeleteConfirmation('')}>Cancel</AlertDialogCancel>
              <Button 
                variant="destructive" 
                onClick={handleBulkDelete}
                disabled={bulkDeleteConfirmation.toLowerCase() !== 'delete'}
              >
                Delete {selectedIds.size} Forms Forever
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Restore Confirmation Dialog */}
        <AlertDialog open={bulkRestoreDialogOpen} onOpenChange={setBulkRestoreDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restore {selectedIds.size} Form{selectedIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will restore the selected form(s) back to the main forms list.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button onClick={handleBulkRestore}>
                Restore {selectedIds.size} Form{selectedIds.size > 1 ? 's' : ''}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Form Viewer Dialog */}
        <AlertDialog open={!!viewingForm} onOpenChange={(open) => !open && closeViewer()}>
          <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
            <AlertDialogHeader>
              <div className="flex items-center justify-between">
                <AlertDialogTitle>Form Details</AlertDialogTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateForm('prev')}
                    disabled={viewingFormIndex <= 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {viewingFormIndex + 1} of {filteredForms.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateForm('next')}
                    disabled={viewingFormIndex >= filteredForms.length - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </AlertDialogHeader>
            
            {viewingForm && (
              <div className="space-y-4 py-4">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Customer Name</div>
                    <div className="font-medium">{viewingForm.customer_name || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Phone</div>
                    <div className="font-medium">{viewingForm.customer_phone || 'N/A'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Form Type</div>
                    <div className="font-medium">{viewingForm._formType}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Deleted</div>
                    <div className="font-medium">
                      {new Date(viewingForm.deleted_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>

                {/* Full Form Data */}
                {viewingForm.fullData && (
                  <>
                    {viewingForm.fullData.status && (
                      <div>
                        <div className="text-sm text-muted-foreground">Status</div>
                        <div className="font-medium capitalize">{viewingForm.fullData.status}</div>
                      </div>
                    )}

                    {viewingForm.fullData.product_lines && viewingForm.fullData.product_lines.length > 0 && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-2">Order Items</div>
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-slate-800">
                              <tr>
                                <th className="text-left p-2 text-sm">Description</th>
                                <th className="text-left p-2 text-sm">SKU</th>
                                <th className="text-right p-2 text-sm">Qty</th>
                                <th className="text-right p-2 text-sm">Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {viewingForm.fullData.product_lines.map((line: any, idx: number) => (
                                <tr key={idx} className="border-t border-slate-700">
                                  <td className="p-2 text-sm">{line.description || 'N/A'}</td>
                                  <td className="p-2 text-sm">{line.sku || 'N/A'}</td>
                                  <td className="p-2 text-sm text-right">{line.quantity || 1}</td>
                                  <td className="p-2 text-sm text-right">${(line.total_price || 0).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {viewingForm.fullData.notes && (
                      <div>
                        <div className="text-sm text-muted-foreground">Notes</div>
                        <div className="p-3 bg-slate-800/50 rounded-lg mt-1">{viewingForm.fullData.notes}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeViewer}>Close</AlertDialogCancel>
              <Button 
                variant="outline"
                onClick={() => {
                  if (viewingForm) {
                    setSelectedForm(viewingForm)
                    setRestoreDialogOpen(true)
                    closeViewer()
                  }
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore
              </Button>
              <Button 
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                onClick={() => {
                  if (viewingForm) {
                    setSelectedForm(viewingForm)
                    setDeleteDialogOpen(true)
                    closeViewer()
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Forever
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}
