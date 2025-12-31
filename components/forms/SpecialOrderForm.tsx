'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase, type SpecialOrderForm as SpecialOrderFormType } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'

interface SpecialOrderFormProps {
  initialData?: SpecialOrderFormType
  onSuccess?: () => void
}

interface ProductLine {
  sku: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
}

export function SpecialOrderForm({ initialData, onSuccess }: SpecialOrderFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [productLines, setProductLines] = useState<ProductLine[]>([{
    sku: initialData?.sku || '',
    description: initialData?.description || '',
    quantity: initialData?.quantity || 1,
    unit_price: initialData?.unit_price || 0,
    total_price: initialData?.total_price || 0,
  }])
  
  const [formData, setFormData] = useState({
    customer_name: initialData?.customer_name || '',
    customer_email: initialData?.customer_email || '',
    customer_phone: initialData?.customer_phone || '',
    customer_street: initialData?.customer_street || '',
    customer_city: initialData?.customer_city || '',
    customer_state: initialData?.customer_state || '',
    customer_zip: initialData?.customer_zip || '',
    sku: initialData?.sku || '',
    description: initialData?.description || '',
    quantity: initialData?.quantity || 1,
    unit_price: initialData?.unit_price || 0,
    total_price: initialData?.total_price || 0,
    special_requests: initialData?.special_requests || '',
    status: initialData?.status || 'pending' as const
  })

  const addProductLine = () => {
    setProductLines([...productLines, {
      sku: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0
    }])
  }

  const updateProductLine = (index: number, field: keyof ProductLine, value: any) => {
    const updated = [...productLines]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total_price = updated[index].quantity * updated[index].unit_price
    }
    setProductLines(updated)
  }

  const removeProductLine = (index: number) => {
    if (productLines.length > 1 && confirm('Are you sure you want to remove this product line?')) {
      setProductLines(productLines.filter((_, i) => i !== index))
    }
  }

  useEffect(() => {
    const total = productLines.reduce((acc, line) => acc + line.total_price, 0)
    setFormData(prev => ({ ...prev, total_price: total }))
  }, [productLines])

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const orderData = {
        ...formData,
        products: productLines,
        total_price: productLines.reduce((sum, line) => sum + line.total_price, 0)
      }

      if (initialData?.id) {
        const { error } = await supabase
          .from('special_orders')
          .update(orderData)
          .eq('id', initialData.id)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Special order updated successfully',
        })
      } else {
        const { error } = await supabase
          .from('special_orders')
          .insert([orderData])

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Special order created successfully',
        })

        // Reset form
        setProductLines([{
          sku: '',
          description: '',
          quantity: 1,
          unit_price: 0,
          total_price: 0
        }])
        setFormData({
          customer_name: '',
          customer_email: '',
          customer_phone: '',
          customer_street: '',
          customer_city: '',
          customer_state: '',
          customer_zip: '',
          sku: '',
          description: '',
          quantity: 1,
          unit_price: 0,
          total_price: 0,
          special_requests: '',
          status: 'pending',
        })
      }

      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save special order',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6,10)}`;
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="font-bold underline text-5xl">Special Order Form</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border rounded-lg p-6 mb-6">
            <h3 className="text-2xl underline font-bold mb-4">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-lg" htmlFor="customer_name">Customer Name *</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange('customer_name', e.target.value)}
                  required
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-lg" htmlFor="customer_email">Customer Email *</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => handleInputChange('customer_email', e.target.value)}
                  required
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-lg" htmlFor="customer_phone">Customer Phone *</Label>
                <Input
                  id="customer_phone"
                  type="tel"
                  value={formatPhoneNumber(formData.customer_phone)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    handleInputChange('customer_phone', digits);
                  }}
                  required
                  maxLength={14}
                  placeholder="(123) 456-7890"
                  className="text-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="space-y-2">
                <Label className="text-lg" htmlFor="customer_street">Street Address</Label>
                <Textarea
                  id="customer_street"
                  value={formData.customer_street}
                  onChange={(e) => handleInputChange('customer_street', e.target.value)}
                  className="min-h-[192px] text-base"
                />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-lg" htmlFor="customer_city">City</Label>
                  <Input
                    id="customer_city"
                    value={formData.customer_city}
                    onChange={(e) => handleInputChange('customer_city', e.target.value)}
                    className="text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-lg" htmlFor="customer_state">State</Label>
                  <Input
                    id="customer_state"
                    value={formData.customer_state}
                    onChange={(e) => handleInputChange('customer_state', e.target.value)}
                    className="text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-lg" htmlFor="customer_zip">ZIP Code</Label>
                  <Input
                    id="customer_zip"
                    value={formData.customer_zip}
                    onChange={(e) => handleInputChange('customer_zip', e.target.value)}
                    className="text-base"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-6 mb-6">
            <h3 className="text-xl underline font-bold mb-4">Items</h3>
            <div className="grid grid-cols-12 gap-4 items-end">
              <div className="col-span-1"><Label className="text-lg">SKU *</Label></div>
              <div className="col-span-7"><Label className="text-lg">Description *</Label></div>
              <div className="col-span-1"><Label className="text-lg">Qty *</Label></div>
              <div className="col-span-1"><Label className="text-lg">Price *</Label></div>
              <div className="col-span-1"><Label className="text-lg">Total *</Label></div>
              <div className="col-span-1"></div> {/* Delete button */}
            </div>
            
            {productLines.map((line, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-1">
                  <Input
                    id={`sku-${index}`}
                    value={line.sku}
                    onChange={(e) => updateProductLine(index, 'sku', e.target.value)}
                    required
                    className="text-base"
                  />
                </div>

                <div className="col-span-7">
                  <Input
                    id={`description-${index}`}
                    value={line.description}
                    onChange={(e) => updateProductLine(index, 'description', e.target.value)}
                    required
                    className="whitespace-normal min-h-[40px] w-full text-base"
                  />
                </div>

                <div className="col-span-1">
                  <Input
                    id={`quantity-${index}`}
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => updateProductLine(index, 'quantity', parseInt(e.target.value))}
                    required
                    className="w-20 text-base"
                  />
                </div>

                <div className="col-span-1">
                  <Input
                    id={`unit_price-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unit_price}
                    onChange={(e) => updateProductLine(index, 'unit_price', parseFloat(e.target.value))}
                    required
                    className="w-24 text-base"
                  />
                </div>

                <div className="col-span-1">
                  <Input
                    id={`total_price-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.total_price}
                    readOnly
                    className="w-24 text-base"
                  />
                </div>

                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeProductLine(index)}
                    disabled={productLines.length <= 1}
                    className="h-10 w-10 text-red-600 hover:text-red-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" y2="17"></line>
                    </svg>
                  </Button>
                </div>
              </div>
            ))}
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={addProductLine}
              className="w-full text-base mt-4"
            >
              + Add Product Line
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger className="bg-[#7e7e7e] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#7e7e7e] border border-gray-200 text-white">
                  <SelectItem value="pending" className="hover:bg-[#6e6e6e]">Pending</SelectItem>
                  <SelectItem value="ordered" className="hover:bg-[#6e6e6e]">Ordered</SelectItem>
                  <SelectItem value="received" className="hover:bg-[#6e6e6e]">Received</SelectItem>
                  <SelectItem value="completed" className="hover:bg-[#6e6e6e]">Completed</SelectItem>
                  <SelectItem value="cancelled" className="hover:bg-[#6e6e6e]">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="special_requests">Special Requests</Label>
            <Textarea
              id="special_requests"
              value={formData.special_requests}
              onChange={(e) => handleInputChange('special_requests', e.target.value)}
              rows={4}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Saving...' : initialData ? 'Update Order' : 'Create Order'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
