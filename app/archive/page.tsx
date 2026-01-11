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
import { Trash2, Search, RotateCcw, FileText, Package, Shield, ArrowLeft } from 'lucide-react'
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

        {/* Forms List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredForms.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No archived forms found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredForms.map((form) => (
              <Card key={`${form._tableName}-${form.id}`} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-slate-700/50">
                        {getFormIcon(form._formType)}
                      </div>
                      <div>
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
                    <div className="flex gap-2">
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
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently Delete Form?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the form for{' '}
                <strong>{selectedForm?.customer_name}</strong> from the database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button variant="destructive" onClick={handlePermanentDelete}>
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
      </main>
    </div>
  )
}
