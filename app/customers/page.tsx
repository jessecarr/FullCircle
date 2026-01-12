'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/Header'
import { ArrowLeft, Search, Edit, Trash2, User, Phone, Mail, MapPin, CreditCard, X } from 'lucide-react'
import { PageNavigation } from '@/components/PageNavigation'

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  street: string
  city: string
  state: string
  zip: string
  drivers_license: string
  license_expiration: string
  created_at: string
  updated_at: string
}

export default function CustomersPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    drivers_license: '',
    license_expiration: ''
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchCustomers()
    }
  }, [user])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = customers.filter(customer => 
        customer.name?.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.includes(query) ||
        customer.city?.toLowerCase().includes(query) ||
        customer.state?.toLowerCase().includes(query)
      )
      setFilteredCustomers(filtered)
    }
  }, [searchQuery, customers])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setCustomers(data || [])
      setFilteredCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch customers',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer)
    setEditForm({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      street: customer.street || '',
      city: customer.city || '',
      state: customer.state || '',
      zip: customer.zip || '',
      drivers_license: customer.drivers_license || '',
      license_expiration: customer.license_expiration || ''
    })
    setShowEditDialog(true)
  }

  const handleSaveEdit = async () => {
    if (!editingCustomer) return

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          street: editForm.street,
          city: editForm.city,
          state: editForm.state,
          zip: editForm.zip,
          drivers_license: editForm.drivers_license,
          license_expiration: editForm.license_expiration,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCustomer.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Customer updated successfully'
      })

      setShowEditDialog(false)
      setEditingCustomer(null)
      fetchCustomers()
    } catch (error) {
      console.error('Error updating customer:', error)
      toast({
        title: 'Error',
        description: 'Failed to update customer',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteClick = (customer: Customer) => {
    setDeleteCustomer(customer)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!deleteCustomer) return

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', deleteCustomer.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Customer deleted successfully'
      })

      setShowDeleteDialog(false)
      setDeleteCustomer(null)
      fetchCustomers()
    } catch (error) {
      console.error('Error deleting customer:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete customer',
        variant: 'destructive'
      })
    }
  }

  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  const formatDate = (dateString: string): string => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto py-8 px-4">
        <PageNavigation backButtonText="Back to Dashboard" />
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Customer Management</h1>
          <p className="text-muted-foreground">View, search, and edit customer information</p>
        </div>

        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, city, or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {filteredCustomers.length} of {customers.length} customers
            </p>
          </CardContent>
        </Card>

        {/* Customers List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="landing-card hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-400" />
                    <CardTitle className="text-lg">{customer.name || 'No Name'}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(customer)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(customer)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {customer.email && !customer.email.includes('@placeholder.local') && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{formatPhoneNumber(customer.phone)}</span>
                  </div>
                )}
                {(customer.city || customer.state) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {[customer.city, customer.state].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {customer.drivers_license && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span>DL: {customer.drivers_license}</span>
                    {customer.license_expiration && (
                      <span className="text-xs">Exp: {customer.license_expiration}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCustomers.length === 0 && (
          <Card className="landing-card">
            <CardContent className="py-8 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No customers found matching your search.' : 'No customers in the database.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Customer</AlertDialogTitle>
              <AlertDialogDescription>
                Update customer information below.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value.toUpperCase() })}
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formatPhoneNumber(editForm.phone)}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, '') })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email?.includes('@placeholder.local') ? '' : editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-street">Street Address</Label>
                <Input
                  id="edit-street"
                  value={editForm.street}
                  onChange={(e) => setEditForm({ ...editForm, street: e.target.value.toUpperCase() })}
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value.toUpperCase() })}
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-state">State</Label>
                <Input
                  id="edit-state"
                  value={editForm.state}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value.toUpperCase() })}
                  className="uppercase"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-zip">ZIP Code</Label>
                <Input
                  id="edit-zip"
                  value={editForm.zip}
                  onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-drivers-license">Driver's License</Label>
                <Input
                  id="edit-drivers-license"
                  value={editForm.drivers_license}
                  onChange={(e) => setEditForm({ ...editForm, drivers_license: e.target.value.toUpperCase() })}
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-license-expiration">License Expiration</Label>
                <Input
                  id="edit-license-expiration"
                  type="date"
                  value={editForm.license_expiration}
                  onChange={(e) => setEditForm({ ...editForm, license_expiration: e.target.value })}
                />
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowEditDialog(false)}>Cancel</AlertDialogCancel>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Customer</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {deleteCustomer?.name}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}
