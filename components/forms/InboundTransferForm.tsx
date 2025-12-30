'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase, type InboundTransferForm as InboundTransferFormType } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'

interface InboundTransferFormProps {
  initialData?: InboundTransferFormType
  onSuccess?: () => void
}

export function InboundTransferForm({ initialData, onSuccess }: InboundTransferFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    transferor_name: initialData?.transferor_name || '',
    transferor_ffl: initialData?.transferor_ffl || '',
    transferor_address: initialData?.transferor_address || '',
    transferor_city: initialData?.transferor_city || '',
    transferor_state: initialData?.transferor_state || '',
    transferor_zip: initialData?.transferor_zip || '',
    firearm_type: initialData?.firearm_type || '',
    manufacturer: initialData?.manufacturer || '',
    model: initialData?.model || '',
    caliber: initialData?.caliber || '',
    serial_number: initialData?.serial_number || '',
    transfer_date: initialData?.transfer_date || new Date().toISOString().split('T')[0],
    atf_form_type: initialData?.atf_form_type || '',
    tracking_number: initialData?.tracking_number || '',
    notes: initialData?.notes || '',
    status: initialData?.status || 'pending' as const,
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
          .from('inbound_transfers')
          .update(formData)
          .eq('id', initialData.id)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Inbound transfer updated successfully',
        })
      } else {
        const { error } = await supabase
          .from('inbound_transfers')
          .insert([formData])

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Inbound transfer created successfully',
        })

        setFormData({
          transferor_name: '',
          transferor_ffl: '',
          transferor_address: '',
          transferor_city: '',
          transferor_state: '',
          transferor_zip: '',
          firearm_type: '',
          manufacturer: '',
          model: '',
          caliber: '',
          serial_number: '',
          transfer_date: new Date().toISOString().split('T')[0],
          atf_form_type: '',
          tracking_number: '',
          notes: '',
          status: 'pending',
        })
      }

      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save inbound transfer',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? 'Edit' : 'New'} Inbound Firearm Transfer</CardTitle>
        <CardDescription>Record details of incoming firearm transfers</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Transferor Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transferor_name">Transferor Name *</Label>
                <Input
                  id="transferor_name"
                  value={formData.transferor_name}
                  onChange={(e) => handleInputChange('transferor_name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transferor_ffl">Transferor FFL</Label>
                <Input
                  id="transferor_ffl"
                  value={formData.transferor_ffl}
                  onChange={(e) => handleInputChange('transferor_ffl', e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="transferor_address">Address *</Label>
                <Input
                  id="transferor_address"
                  value={formData.transferor_address}
                  onChange={(e) => handleInputChange('transferor_address', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transferor_city">City *</Label>
                <Input
                  id="transferor_city"
                  value={formData.transferor_city}
                  onChange={(e) => handleInputChange('transferor_city', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transferor_state">State *</Label>
                <Input
                  id="transferor_state"
                  value={formData.transferor_state}
                  onChange={(e) => handleInputChange('transferor_state', e.target.value)}
                  maxLength={2}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transferor_zip">ZIP Code *</Label>
                <Input
                  id="transferor_zip"
                  value={formData.transferor_zip}
                  onChange={(e) => handleInputChange('transferor_zip', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Firearm Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firearm_type">Firearm Type *</Label>
                <Select value={formData.firearm_type} onValueChange={(value) => handleInputChange('firearm_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Handgun">Handgun</SelectItem>
                    <SelectItem value="Rifle">Rifle</SelectItem>
                    <SelectItem value="Shotgun">Shotgun</SelectItem>
                    <SelectItem value="Receiver">Receiver</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer *</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="caliber">Caliber *</Label>
                <Input
                  id="caliber"
                  value={formData.caliber}
                  onChange={(e) => handleInputChange('caliber', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serial_number">Serial Number *</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => handleInputChange('serial_number', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Transfer Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transfer_date">Transfer Date *</Label>
                <Input
                  id="transfer_date"
                  type="date"
                  value={formData.transfer_date}
                  onChange={(e) => handleInputChange('transfer_date', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="atf_form_type">ATF Form Type *</Label>
                <Select value={formData.atf_form_type} onValueChange={(value) => handleInputChange('atf_form_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select form type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Form 3">Form 3</SelectItem>
                    <SelectItem value="Form 4">Form 4</SelectItem>
                    <SelectItem value="Form 4473">Form 4473</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tracking_number">Tracking Number</Label>
                <Input
                  id="tracking_number"
                  value={formData.tracking_number}
                  onChange={(e) => handleInputChange('tracking_number', e.target.value)}
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
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
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
            {loading ? 'Saving...' : initialData ? 'Update Transfer' : 'Create Transfer'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
