'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase, type SuppressorApprovalForm as SuppressorApprovalFormType } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'

interface SuppressorApprovalFormProps {
  initialData?: SuppressorApprovalFormType
  onSuccess?: () => void
}

export function SuppressorApprovalForm({ initialData, onSuccess }: SuppressorApprovalFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    customer_name: initialData?.customer_name || '',
    customer_email: initialData?.customer_email || '',
    customer_phone: initialData?.customer_phone || '',
    customer_address: initialData?.customer_address || '',
    customer_city: initialData?.customer_city || '',
    customer_state: initialData?.customer_state || '',
    customer_zip: initialData?.customer_zip || '',
    suppressor_manufacturer: initialData?.suppressor_manufacturer || '',
    suppressor_model: initialData?.suppressor_model || '',
    suppressor_caliber: initialData?.suppressor_caliber || '',
    suppressor_serial_number: initialData?.suppressor_serial_number || '',
    trust_name: initialData?.trust_name || '',
    form_type: initialData?.form_type || 'Form 4' as const,
    submission_date: initialData?.submission_date || new Date().toISOString().split('T')[0],
    approval_date: initialData?.approval_date || '',
    tax_stamp_number: initialData?.tax_stamp_number || '',
    examiner_name: initialData?.examiner_name || '',
    status: initialData?.status || 'pending' as const,
    notes: initialData?.notes || '',
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (initialData?.id) {
        const { error } = await supabase
          .from('suppressor_approvals')
          .update(formData)
          .eq('id', initialData.id)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Suppressor approval updated successfully',
        })
      } else {
        const { error } = await supabase
          .from('suppressor_approvals')
          .insert([formData])

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Suppressor approval created successfully',
        })

        setFormData({
          customer_name: '',
          customer_email: '',
          customer_phone: '',
          customer_address: '',
          customer_city: '',
          customer_state: '',
          customer_zip: '',
          suppressor_manufacturer: '',
          suppressor_model: '',
          suppressor_caliber: '',
          suppressor_serial_number: '',
          trust_name: '',
          form_type: 'Form 4',
          submission_date: new Date().toISOString().split('T')[0],
          approval_date: '',
          tax_stamp_number: '',
          examiner_name: '',
          status: 'pending',
          notes: '',
        })
      }

      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save suppressor approval',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? 'Edit' : 'New'} Suppressor Approval</CardTitle>
        <CardDescription>Track NFA suppressor approval process</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange('customer_name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_email">Customer Email *</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => handleInputChange('customer_email', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_phone">Customer Phone *</Label>
                <Input
                  id="customer_phone"
                  type="tel"
                  value={formData.customer_phone}
                  onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trust_name">Trust Name (if applicable)</Label>
                <Input
                  id="trust_name"
                  value={formData.trust_name}
                  onChange={(e) => handleInputChange('trust_name', e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="customer_address">Address *</Label>
                <Input
                  id="customer_address"
                  value={formData.customer_address}
                  onChange={(e) => handleInputChange('customer_address', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_city">City *</Label>
                <Input
                  id="customer_city"
                  value={formData.customer_city}
                  onChange={(e) => handleInputChange('customer_city', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_state">State *</Label>
                <Input
                  id="customer_state"
                  value={formData.customer_state}
                  onChange={(e) => handleInputChange('customer_state', e.target.value)}
                  maxLength={2}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_zip">ZIP Code *</Label>
                <Input
                  id="customer_zip"
                  value={formData.customer_zip}
                  onChange={(e) => handleInputChange('customer_zip', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Suppressor Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="suppressor_manufacturer">Manufacturer *</Label>
                <Input
                  id="suppressor_manufacturer"
                  value={formData.suppressor_manufacturer}
                  onChange={(e) => handleInputChange('suppressor_manufacturer', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="suppressor_model">Model *</Label>
                <Input
                  id="suppressor_model"
                  value={formData.suppressor_model}
                  onChange={(e) => handleInputChange('suppressor_model', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="suppressor_caliber">Caliber *</Label>
                <Input
                  id="suppressor_caliber"
                  value={formData.suppressor_caliber}
                  onChange={(e) => handleInputChange('suppressor_caliber', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="suppressor_serial_number">Serial Number *</Label>
                <Input
                  id="suppressor_serial_number"
                  value={formData.suppressor_serial_number}
                  onChange={(e) => handleInputChange('suppressor_serial_number', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Approval Process</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="form_type">Form Type *</Label>
                <Select value={formData.form_type} onValueChange={(value) => handleInputChange('form_type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Form 1">Form 1</SelectItem>
                    <SelectItem value="Form 4">Form 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="submission_date">Submission Date *</Label>
                <Input
                  id="submission_date"
                  type="date"
                  value={formData.submission_date}
                  onChange={(e) => handleInputChange('submission_date', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="approval_date">Approval Date</Label>
                <Input
                  id="approval_date"
                  type="date"
                  value={formData.approval_date}
                  onChange={(e) => handleInputChange('approval_date', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_stamp_number">Tax Stamp Number</Label>
                <Input
                  id="tax_stamp_number"
                  value={formData.tax_stamp_number}
                  onChange={(e) => handleInputChange('tax_stamp_number', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="examiner_name">Examiner Name</Label>
                <Input
                  id="examiner_name"
                  value={formData.examiner_name}
                  onChange={(e) => handleInputChange('examiner_name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                    <SelectItem value="picked_up">Picked Up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Saving...' : initialData ? 'Update Approval' : 'Create Approval'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
