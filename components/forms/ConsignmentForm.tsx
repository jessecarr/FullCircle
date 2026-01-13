'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase, type ConsignmentForm as ConsignmentFormType } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import CustomerSearch from '../CustomerSearch'
import { lookupZipCode, isValidZipCode } from '@/lib/zipLookup'
import { Printer, Search } from 'lucide-react'
import FastBoundSearch from '../FastBoundSearch'
import { PrintSubmitDialog } from '@/components/ui/print-submit-dialog'

interface FastBoundInventoryItem {
  id: string
  fastbound_item_id: string
  control_number: string | null
  firearm_type: string | null
  manufacturer: string | null
  model: string | null
  caliber: string | null
  serial_number: string | null
  status: string
  price: number | null
}

interface ConsignmentFormProps {
  initialData?: ConsignmentFormType
  onSuccess?: () => void
  onCancel?: () => void
}

interface ProductLine {
  control_number: string
  manufacturer: string
  model: string
  serial_number: string
  type: string
  caliber: string
  method: string
  sale_price: number
  after_fee: number
  check_number: string
  fastbound_item_id?: string
}

export function ConsignmentForm({ initialData, onSuccess, onCancel }: ConsignmentFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [showPrintSubmitDialog, setShowPrintSubmitDialog] = useState(false)
  const [productLines, setProductLines] = useState<ProductLine[]>(() => {
    if (initialData?.product_lines && Array.isArray(initialData.product_lines)) {
      return initialData.product_lines.map((line: any) => ({
        control_number: line.control_number || '',
        manufacturer: line.manufacturer || '',
        model: line.model || '',
        serial_number: line.serial_number || '',
        type: line.type || '',
        caliber: line.caliber || '',
        method: line.method || '',
        sale_price: line.sale_price || 0,
        after_fee: line.after_fee || 0,
        check_number: line.check_number || '',
      }))
    }
    return [{
      control_number: '',
      manufacturer: '',
      model: '',
      serial_number: '',
      type: '',
      caliber: '',
      method: '',
      sale_price: 0,
      after_fee: 0,
      check_number: '',
    }]
  })
  const [rowHeights, setRowHeights] = useState<{[key: number]: string}>({})
  const [isClient, setIsClient] = useState(false)
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient) {
      productLines.forEach((_, index) => {
        setTimeout(() => recalculateRowHeight(index), 100)
      })
    }
  }, [productLines, isClient])

  const updateCustomerRecord = async () => {
    if (!formData.customer_phone && !formData.customer_email) {
      return;
    }

    try {
      let existingCustomer = null;
      
      if (formData.customer_phone && formData.customer_phone.trim() !== '') {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('phone', formData.customer_phone)
          .maybeSingle();
        
        if (data) {
          existingCustomer = data;
        }
      }
      
      if (!existingCustomer && formData.customer_email && formData.customer_email.trim() !== '') {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('email', formData.customer_email)
          .maybeSingle();
        
        if (data) {
          existingCustomer = data;
        }
      }

      if (existingCustomer) {
        const updateData: any = {};
        
        if (formData.customer_name && formData.customer_name !== existingCustomer.name) {
          updateData.name = formData.customer_name;
        }
        if (formData.customer_email && formData.customer_email !== existingCustomer.email) {
          updateData.email = formData.customer_email;
        }
        if (formData.customer_phone && formData.customer_phone !== existingCustomer.phone) {
          updateData.phone = formData.customer_phone;
        }
        if (formData.customer_street && formData.customer_street !== existingCustomer.street) {
          updateData.street = formData.customer_street;
        }
        if (formData.customer_city && formData.customer_city !== existingCustomer.city) {
          updateData.city = formData.customer_city;
        }
        if (formData.customer_state && formData.customer_state !== existingCustomer.state) {
          updateData.state = formData.customer_state;
        }
        if (formData.customer_zip && formData.customer_zip !== existingCustomer.zip) {
          updateData.zip = formData.customer_zip;
        }
        if (formData.drivers_license && formData.drivers_license !== existingCustomer.drivers_license) {
          updateData.drivers_license = formData.drivers_license;
        }
        if (formData.license_expiration && formData.license_expiration !== existingCustomer.license_expiration) {
          updateData.license_expiration = formData.license_expiration;
        }

        if (Object.keys(updateData).length > 0) {
          updateData.updated_at = new Date().toISOString();
          
          const { error } = await supabase
            .from('customers')
            .update(updateData)
            .eq('id', existingCustomer.id);

          if (error) {
            console.error('Failed to update customer record:', error);
          }
        }
      } else {
        const newCustomerData: any = {
          name: formData.customer_name,
          phone: formData.customer_phone,
          street: formData.customer_street || null,
          city: formData.customer_city || null,
          state: formData.customer_state || null,
          zip: formData.customer_zip || null,
          drivers_license: formData.drivers_license || null,
          license_expiration: formData.license_expiration || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        if (formData.customer_email && formData.customer_email.trim() !== '') {
          newCustomerData.email = formData.customer_email;
        } else {
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(2, 8);
          newCustomerData.email = `no-email-${timestamp}-${random}@placeholder.local`;
        }

        const { error: insertError } = await supabase
          .from('customers')
          .insert([newCustomerData]);

        if (insertError) {
          console.error('Failed to create customer record:', insertError);
        }
      }
    } catch (error) {
      console.error('Error in customer record operation:', error);
    }
  };
  
  const [formData, setFormData] = useState({
    customer_name: initialData?.customer_name || '',
    customer_email: initialData?.customer_email || '',
    customer_phone: initialData?.customer_phone || '',
    drivers_license: initialData?.drivers_license || '',
    license_expiration: initialData?.license_expiration || '',
    customer_street: initialData?.customer_street || '',
    customer_city: initialData?.customer_city || '',
    customer_state: initialData?.customer_state || '',
    customer_zip: initialData?.customer_zip || '',
    special_requests: initialData?.special_requests || ''
  })

  const addProductLine = () => {
    setProductLines([...productLines, {
      control_number: '',
      manufacturer: '',
      model: '',
      serial_number: '',
      type: '',
      caliber: '',
      method: '',
      sale_price: 0,
      after_fee: 0,
      check_number: '',
      fastbound_item_id: ''
    }])
  }

  const handleFastBoundSelect = (index: number, item: FastBoundInventoryItem) => {
    const updated = [...productLines]
    updated[index] = {
      ...updated[index],
      control_number: item.control_number || item.serial_number || '',
      manufacturer: item.manufacturer || '',
      model: item.model || '',
      serial_number: item.serial_number || '',
      type: item.firearm_type || '',
      caliber: item.caliber || '',
      fastbound_item_id: item.fastbound_item_id
    }
    setProductLines(updated)
  }

  const calculateAfterFee = (salePrice: number, method: string): number => {
    if (method === 'In-Store') {
      return salePrice * 0.80
    } else if (method === 'Gunbroker') {
      return salePrice * 0.75
    }
    return 0
  }

  const updateProductLine = (index: number, field: keyof ProductLine, value: any) => {
    const updated = [...productLines]
    updated[index] = { ...updated[index], [field]: value }
    
    // Recalculate after_fee when sale_price or method changes
    if (field === 'sale_price' || field === 'method') {
      const salePrice = field === 'sale_price' ? value : updated[index].sale_price
      const method = field === 'method' ? value : updated[index].method
      updated[index].after_fee = calculateAfterFee(salePrice, method)
    }
    
    setProductLines(updated)
  }

  const clearProductLine = (index: number) => {
    const updated = [...productLines]
    updated[index] = {
      control_number: '',
      manufacturer: '',
      model: '',
      serial_number: '',
      type: '',
      caliber: '',
      method: '',
      sale_price: 0,
      after_fee: 0,
      check_number: '',
      fastbound_item_id: ''
    }
    setProductLines(updated)
  }

  const removeProductLine = (index: number) => {
    if (productLines.length > 1 && confirm('Are you sure you want to remove this product line?')) {
      setProductLines(productLines.filter((_, i) => i !== index))
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFieldHeightChange = (rowIndex: number, fieldId: string, height: string) => {
    if (!isClient) return
    
    setRowHeights(prev => {
      const newHeight = `${Math.max(48, parseInt(height.replace('px', '')))}px`
      return {
        ...prev,
        [rowIndex]: newHeight
      }
    })
  }

  const recalculateRowHeight = (rowIndex: number) => {
    if (!isClient) return
    
    const controlNumberField = document.getElementById(`control_number-${rowIndex}`) as HTMLTextAreaElement
    const manufacturerField = document.getElementById(`manufacturer-${rowIndex}`) as HTMLTextAreaElement
    const modelField = document.getElementById(`model-${rowIndex}`) as HTMLTextAreaElement
    const serialNumberField = document.getElementById(`serial_number-${rowIndex}`) as HTMLTextAreaElement
    
    let maxHeight = 40
    
    if (controlNumberField) maxHeight = Math.max(maxHeight, controlNumberField.scrollHeight)
    if (manufacturerField) maxHeight = Math.max(maxHeight, manufacturerField.scrollHeight)
    if (modelField) maxHeight = Math.max(maxHeight, modelField.scrollHeight)
    if (serialNumberField) maxHeight = Math.max(maxHeight, serialNumberField.scrollHeight)
    
    setRowHeights(prev => ({
      ...prev,
      [rowIndex]: `${maxHeight}px`
    }))
  }

  const handleZipCodeChange = async (zip: string) => {
    setFormData(prev => ({ ...prev, customer_zip: zip }))
    
    if (isValidZipCode(zip)) {
      try {
        const zipData = await lookupZipCode(zip)
        if (zipData) {
          setFormData(prev => ({
            ...prev,
            customer_city: zipData.city,
            customer_state: zipData.state
          }))
        }
      } catch (error) {
        console.error('Failed to lookup zip code:', error)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.customer_name || !formData.customer_phone) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required customer fields',
        variant: 'destructive',
      })
      return
    }

    // Validate that all product lines have method and sale_price
    const invalidLines = productLines.filter((line, index) => {
      const hasData = line.control_number || line.manufacturer || line.model || line.serial_number
      if (hasData) {
        return !line.method || !line.sale_price
      }
      return false
    })

    if (invalidLines.length > 0) {
      toast({
        title: 'Validation Error',
        description: 'Method and Sale Price are required for all items',
        variant: 'destructive',
      })
      return
    }

    if (initialData) {
      setShowUpdateDialog(true)
      return
    }

    setShowPrintSubmitDialog(true)
  }

  const performSubmission = async () => {
    setLoading(true)

    try {
      const totalAmount = productLines.reduce((acc, line) => acc + line.after_fee, 0);

      await updateCustomerRecord();

      if (initialData) {
        if (!initialData.id) {
          throw new Error('Cannot update order: No ID provided');
        }

        const { data, error } = await supabase
          .from('consignment_forms')
          .update({
            customer_name: formData.customer_name,
            customer_email: formData.customer_email,
            customer_phone: formData.customer_phone,
            customer_street: formData.customer_street,
            customer_city: formData.customer_city,
            customer_state: formData.customer_state,
            customer_zip: formData.customer_zip,
            product_lines: productLines,
            total_price: totalAmount,
            special_requests: formData.special_requests
          })
          .eq('id', initialData.id)
          .select();

        if (error) {
          throw new Error(`Update failed: ${error.message || 'Unknown error'}`);
        }

        if (!data || (Array.isArray(data) && data.length === 0)) {
          throw new Error('No records were updated');
        }

        toast({ title: 'Success', description: 'Consignment updated successfully' });
      } else {
        // Generate order number
        let orderNumber = null
        try {
          const orderNumResponse = await fetch('/api/generate-order-number', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formType: 'consignment' })
          })
          if (!orderNumResponse.ok) {
            console.error('Order number API error:', orderNumResponse.status, orderNumResponse.statusText)
          }
          const orderNumData = await orderNumResponse.json()
          console.log('Order number API response:', orderNumData)
          if (orderNumData.orderNumber) {
            orderNumber = orderNumData.orderNumber
          } else if (orderNumData.error) {
            console.error('Order number generation error:', orderNumData.error)
          }
        } catch (orderNumError) {
          console.error('Failed to generate order number:', orderNumError)
        }

        const { error } = await supabase
          .from('consignment_forms')
          .insert([{
            order_number: orderNumber,
            customer_name: formData.customer_name,
            customer_email: formData.customer_email,
            customer_phone: formData.customer_phone,
            customer_street: formData.customer_street,
            customer_city: formData.customer_city,
            customer_state: formData.customer_state,
            customer_zip: formData.customer_zip,
            drivers_license: formData.drivers_license,
            license_expiration: formData.license_expiration,
            product_lines: productLines,
            total_price: totalAmount,
            special_requests: formData.special_requests
          }])

        if (error) {
          throw error;
        }

        toast({ title: 'Success', description: 'Consignment created successfully' });
      }

      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save consignment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setShowUpdateDialog(false);
    }
  }

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6,10)}`;
  };

  const handlePrint = () => {
    const totalAfterFee = productLines.reduce((acc, line) => acc + line.after_fee, 0);

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Consignment Form</title>
        <style>
          @page {
            size: landscape;
            margin: 0.3in;
          }
          
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          html, body {
            height: 100%;
            width: 100%;
            font-family: 'Arial', sans-serif;
            color: #000;
            background: white;
          }
          
          .page-container {
            width: 100%;
            padding: 15px;
          }
          
          .print-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 12px;
            margin-bottom: 15px;
          }
          
          .print-date {
            text-align: left;
            font-size: 11px;
            margin-bottom: 8px;
          }
          
          .print-title {
            font-size: 22px;
            font-weight: bold;
          }
          
          .print-section {
            margin-bottom: 15px;
          }
          
          .print-section-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 6px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 3px;
          }
          
          .print-field {
            margin-bottom: 4px;
            display: flex;
          }
          
          .print-label {
            font-weight: bold;
            width: 90px;
            flex-shrink: 0;
            font-size: 12px;
          }
          
          .print-value {
            flex: 1;
            font-size: 12px;
          }
          
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          
          .print-table th,
          .print-table td {
            border: 1px solid #000;
            padding: 4px 6px;
            text-align: left;
            font-size: 10px;
          }
          
          .print-table th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          
          .print-total-summary {
            margin-top: 15px;
            padding: 8px 12px;
            background-color: #f5f5f5;
            border: 1px solid #000;
            width: 300px;
            margin-left: auto;
          }
          
          .print-total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 12px;
          }
          
          .print-total-row.final {
            font-size: 14px;
            font-weight: bold;
            border-top: 1px solid #000;
            padding-top: 2px;
            margin-bottom: 0;
          }
        </style>
      </head>
      <body>
        <div class="page-container">
          <div class="print-date">
            ${new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          <div class="print-header">
            <div class="print-title">Consignment Form</div>
          </div>

          <div class="print-section">
            <div class="print-section-title">Customer Information</div>
            <div class="print-field">
              <div class="print-label">Name:</div>
              <div class="print-value">${formData.customer_name}</div>
            </div>
            <div class="print-field">
              <div class="print-label">Phone:</div>
              <div class="print-value">${formatPhoneNumber(formData.customer_phone)}</div>
            </div>
            ${formData.customer_street ? `
              <div class="print-field">
                <div class="print-label">Address:</div>
                <div class="print-value">
                  ${formData.customer_street}
                  ${formData.customer_city ? `, ${formData.customer_city}` : ''}
                  ${formData.customer_state ? ` ${formData.customer_state}` : ''}
                  ${formData.customer_zip ? ` ${formData.customer_zip}` : ''}
                </div>
              </div>
            ` : ''}
          </div>

          <div class="print-section">
            <div class="print-section-title">Consignment Items</div>
            <table class="print-table">
              <thead>
                <tr>
                  <th>Control #</th>
                  <th>Manufacturer</th>
                  <th>Model</th>
                  <th>Serial #</th>
                  <th>Type</th>
                  <th>Caliber</th>
                  <th>Method</th>
                  <th>Sale Price</th>
                  <th>After Fee</th>
                  <th>Check #</th>
                </tr>
              </thead>
              <tbody>
                ${productLines.map((line) => `
                  <tr>
                    <td>${line.control_number || '-'}</td>
                    <td>${line.manufacturer || '-'}</td>
                    <td>${line.model || '-'}</td>
                    <td>${line.serial_number || '-'}</td>
                    <td>${line.type || '-'}</td>
                    <td>${line.caliber || '-'}</td>
                    <td>${line.method || '-'}</td>
                    <td>$${(line.sale_price || 0).toFixed(2)}</td>
                    <td>$${(line.after_fee || 0).toFixed(2)}</td>
                    <td>${line.check_number || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="print-total-summary">
              <div class="print-total-row final">
                <span>Total After Fees:</span>
                <span>$${totalAfterFee.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(printContent);
      iframeDoc.close();

      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      };
    }
  };

  const handleEmail = async () => {
    if (!formData.customer_email) {
      toast({ title: 'No Email Available', description: 'Please enter a customer email address before sending.', variant: 'destructive' });
      return;
    }
    setEmailLoading(true);
    try {
      const { sendFormEmail } = await import('@/lib/emailUtils');
      const result = await sendFormEmail({
        customerEmail: formData.customer_email,
        customerName: formData.customer_name || 'Customer',
        formType: 'consignment_forms',
        formData: { ...formData, product_lines: productLines },
      });
      if (result.success) {
        toast({ title: 'Email Sent', description: result.message });
      } else {
        toast({ title: 'Email Failed', description: result.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Email Failed', description: error instanceof Error ? error.message : 'Failed to send email', variant: 'destructive' });
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <>
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="font-bold underline text-6xl">Consignment Form</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="border rounded-lg p-6 mb-6">
            <h3 className="text-xl underline font-bold mb-4">Customer</h3>
            
            {/* Customer Search */}
            <div className="p-4 rounded-lg mb-6" style={{
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              padding: '1rem',
              borderRadius: '0.5rem'
            }}>
              <div className="text-xl font-semibold flex items-center gap-2 mb-3" style={{ color: '#dbeafe' }}>
                <Search className="h-6 w-6" />
                Search Existing Customers
              </div>
              <p className="text-base mb-3" style={{ color: '#dbeafe' }}>
                Search by phone number or name to auto-fill customer information.
              </p>
              <CustomerSearch
                onSelect={(customer) => {
                  setFormData(prev => ({
                    ...prev,
                    customer_name: customer.name || '',
                    customer_email: customer.email || '',
                    customer_phone: customer.phone || '',
                    customer_street: customer.street || '',
                    customer_city: customer.city || '',
                    customer_state: customer.state || '',
                    customer_zip: customer.zip || '',
                    drivers_license: customer.drivers_license || '',
                    license_expiration: customer.license_expiration || ''
                  }))
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-medium" htmlFor="customer_name">Name *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => handleInputChange('customer_name', e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('customer_phone')?.focus();
                      }
                    }}
                    required
                    className="text-base uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-medium" htmlFor="customer_phone">Phone *</Label>
                  <Input
                    id="customer_phone"
                    value={formData.customer_phone}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value)
                      handleInputChange('customer_phone', formatted)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('customer_email')?.focus();
                      }
                    }}
                    required
                    className="text-base"
                    placeholder="(___) ___-____"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-medium" htmlFor="customer_email">Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => handleInputChange('customer_email', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('drivers_license')?.focus();
                      }
                    }}
                    className="text-base"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-medium" htmlFor="drivers_license">Driver's License</Label>
                    <Input
                      id="drivers_license"
                      value={formData.drivers_license}
                      onChange={(e) => handleInputChange('drivers_license', e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          document.getElementById('license_expiration')?.focus();
                        }
                      }}
                      className="text-base uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-medium" htmlFor="license_expiration">Expiration Date</Label>
                    <Input
                      id="license_expiration"
                      type="date"
                      value={formData.license_expiration}
                      onChange={(e) => handleInputChange('license_expiration', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          document.getElementById('customer_street')?.focus();
                        }
                      }}
                      className="text-base"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-medium" htmlFor="customer_street">Street Address</Label>
                  <Textarea
                    id="customer_street"
                    value={formData.customer_street}
                    onChange={(e) => handleInputChange('customer_street', e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('customer_zip')?.focus();
                      }
                    }}
                    rows={2}
                    className="text-base uppercase resize-none"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label className="text-medium" htmlFor="customer_zip">Zip</Label>
                    <Input
                      id="customer_zip"
                      value={formData.customer_zip}
                      onChange={(e) => handleZipCodeChange(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          document.getElementById('customer_state')?.focus();
                        }
                      }}
                      className="text-base uppercase"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-medium" htmlFor="customer_state">State</Label>
                    <Input
                      id="customer_state"
                      value={formData.customer_state}
                      onChange={(e) => handleInputChange('customer_state', e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          document.getElementById('customer_city')?.focus();
                        }
                      }}
                      className="text-base uppercase"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-medium" htmlFor="customer_city">City</Label>
                    <Input
                      id="customer_city"
                      value={formData.customer_city}
                      onChange={(e) => handleInputChange('customer_city', e.target.value.toUpperCase())}
                      className="text-base uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-6 mb-6">
            <h3 className="text-xl underline font-bold mb-4">Items</h3>
            
            {/* FastBound Inventory Search */}
            <div className="p-4 rounded-lg mb-6" style={{
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              padding: '1rem',
              borderRadius: '0.5rem'
            }}>
              <div className="text-xl font-semibold flex items-center gap-2 mb-3" style={{ color: '#dbeafe' }}>
                <Search className="h-6 w-6" />
                Search FastBound Inventory
              </div>
              <p className="text-base mb-3" style={{ color: '#dbeafe' }}>
                Search your FastBound inventory to auto-fill item details. Select an item to add it to the form.
              </p>
              <FastBoundSearch
                onSelect={(item) => {
                  const firstLine = productLines[0]
                  const isFirstLineEmpty = !firstLine.control_number && !firstLine.manufacturer && !firstLine.model && !firstLine.serial_number
                  
                  const newLineData: ProductLine = {
                    control_number: item.control_number || item.serial_number || '',
                    manufacturer: item.manufacturer || '',
                    model: item.model || '',
                    serial_number: item.serial_number || '',
                    type: item.firearm_type || '',
                    caliber: item.caliber || '',
                    method: '',
                    sale_price: 0,
                    after_fee: 0,
                    check_number: '',
                    fastbound_item_id: item.fastbound_item_id
                  }
                  
                  if (isFirstLineEmpty) {
                    const updated = [...productLines]
                    updated[0] = newLineData
                    setProductLines(updated)
                    setTimeout(() => recalculateRowHeight(0), 100)
                  } else {
                    setProductLines([...productLines, newLineData])
                    setTimeout(() => {
                      const newIndex = productLines.length
                      recalculateRowHeight(newIndex)
                    }, 100)
                  }
                }}
                placeholder="Search by serial number, manufacturer, or model..."
              />
            </div>

            {/* Wide layout for items - 10 columns total */}
            <div className="overflow-x-auto">
              <div className="min-w-[1400px]">
                <div className="grid grid-cols-[1fr_1.2fr_1fr_1fr_0.8fr_0.8fr_0.9fr_0.8fr_0.8fr_0.8fr_0.6fr] gap-2 items-end mb-1">
                  <div><Label className="text-sm font-semibold">Control #</Label></div>
                  <div><Label className="text-sm font-semibold">Manufacturer</Label></div>
                  <div><Label className="text-sm font-semibold">Model</Label></div>
                  <div><Label className="text-sm font-semibold">Serial #</Label></div>
                  <div><Label className="text-sm font-semibold">Type</Label></div>
                  <div><Label className="text-sm font-semibold">Caliber</Label></div>
                  <div><Label className="text-sm font-semibold">Method</Label></div>
                  <div><Label className="text-sm font-semibold">Sale Price</Label></div>
                  <div><Label className="text-sm font-semibold">After Fee</Label></div>
                  <div><Label className="text-sm font-semibold">Check #</Label></div>
                  <div><Label className="text-sm font-semibold"></Label></div>
                </div>
                
                {productLines.map((line, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1.2fr_1fr_1fr_0.8fr_0.8fr_0.9fr_0.8fr_0.8fr_0.8fr_0.6fr] gap-2 items-end mb-2">
                    <div>
                      <Textarea
                        id={`control_number-${index}`}
                        value={line.control_number}
                        onChange={(e) => updateProductLine(index, 'control_number', e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById(`manufacturer-${index}`)?.focus();
                          }
                        }}
                        className="text-sm w-full min-h-[40px] resize-none overflow-hidden uppercase"
                        rows={1}
                        style={{
                          height: isClient ? (rowHeights[index] || '40px') : '40px',
                          minHeight: '40px'
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          const newHeight = `${target.scrollHeight}px`;
                          target.style.height = newHeight;
                          handleFieldHeightChange(index, `control_number-${index}`, newHeight);
                          setTimeout(() => recalculateRowHeight(index), 10);
                        }}
                      />
                    </div>

                    <div>
                      <Textarea
                        id={`manufacturer-${index}`}
                        value={line.manufacturer}
                        onChange={(e) => updateProductLine(index, 'manufacturer', e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById(`model-${index}`)?.focus();
                          }
                        }}
                        className="min-h-[40px] w-full text-sm resize-none overflow-hidden uppercase"
                        rows={1}
                        style={{
                          height: isClient ? (rowHeights[index] || '40px') : '40px',
                          minHeight: '40px'
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          const newHeight = `${target.scrollHeight}px`;
                          target.style.height = newHeight;
                          handleFieldHeightChange(index, `manufacturer-${index}`, newHeight);
                          setTimeout(() => recalculateRowHeight(index), 10);
                        }}
                      />
                    </div>

                    <div>
                      <Textarea
                        id={`model-${index}`}
                        value={line.model}
                        onChange={(e) => updateProductLine(index, 'model', e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById(`serial_number-${index}`)?.focus();
                          }
                        }}
                        className="min-h-[40px] w-full text-sm resize-none overflow-hidden uppercase"
                        rows={1}
                        style={{
                          height: isClient ? (rowHeights[index] || '40px') : '40px',
                          minHeight: '40px'
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          const newHeight = `${target.scrollHeight}px`;
                          target.style.height = newHeight;
                          handleFieldHeightChange(index, `model-${index}`, newHeight);
                          setTimeout(() => recalculateRowHeight(index), 10);
                        }}
                      />
                    </div>

                    <div>
                      <Textarea
                        id={`serial_number-${index}`}
                        value={line.serial_number}
                        onChange={(e) => updateProductLine(index, 'serial_number', e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById(`type-${index}`)?.focus();
                          }
                        }}
                        className="min-h-[40px] w-full text-sm resize-none overflow-hidden uppercase"
                        rows={1}
                        style={{
                          height: isClient ? (rowHeights[index] || '40px') : '40px',
                          minHeight: '40px'
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          const newHeight = `${target.scrollHeight}px`;
                          target.style.height = newHeight;
                          handleFieldHeightChange(index, `serial_number-${index}`, newHeight);
                          setTimeout(() => recalculateRowHeight(index), 10);
                        }}
                      />
                    </div>

                    <div>
                      <Input
                        id={`type-${index}`}
                        value={line.type}
                        onChange={(e) => updateProductLine(index, 'type', e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById(`caliber-${index}`)?.focus();
                          }
                        }}
                        className="text-sm uppercase"
                        style={{ 
                          height: isClient ? (rowHeights[index] || '40px') : '40px',
                          minHeight: '40px'
                        }}
                      />
                    </div>

                    <div>
                      <Input
                        id={`caliber-${index}`}
                        value={line.caliber}
                        onChange={(e) => updateProductLine(index, 'caliber', e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                          }
                        }}
                        className="text-sm uppercase"
                        style={{ 
                          height: isClient ? (rowHeights[index] || '40px') : '40px',
                          minHeight: '40px'
                        }}
                      />
                    </div>

                    <div>
                      <Select 
                        value={line.method} 
                        onValueChange={(value) => updateProductLine(index, 'method', value)}
                      >
                        <SelectTrigger 
                          suppressHydrationWarning
                          style={{ 
                            height: isClient ? (rowHeights[index] || '40px') : '40px',
                            minHeight: '40px'
                          }}
                        >
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="In-Store">IN-STORE</SelectItem>
                          <SelectItem value="Gunbroker">GUNBROKER</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Input
                        id={`sale_price-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.sale_price || ''}
                        onChange={(e) => updateProductLine(index, 'sale_price', e.target.value ? parseFloat(e.target.value) : 0)}
                        placeholder="0"
                        className="text-sm"
                        style={{ 
                          height: isClient ? (rowHeights[index] || '40px') : '40px',
                          minHeight: '40px',
                          MozAppearance: 'textfield',
                          WebkitAppearance: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <Input
                        id={`after_fee-${index}`}
                        type="number"
                        value={line.after_fee.toFixed(2)}
                        readOnly
                        className="text-sm bg-gray-100"
                        style={{ 
                          height: isClient ? (rowHeights[index] || '40px') : '40px',
                          minHeight: '40px'
                        }}
                      />
                    </div>

                    <div>
                      <Input
                        id={`check_number-${index}`}
                        value={line.check_number}
                        onChange={(e) => updateProductLine(index, 'check_number', e.target.value.toUpperCase())}
                        className="text-sm uppercase"
                        style={{ 
                          height: isClient ? (rowHeights[index] || '40px') : '40px',
                          minHeight: '40px'
                        }}
                      />
                    </div>

                    <div className="flex flex-col gap-1 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => clearProductLine(index)}
                        className="text-xs border border-gray-400 hover:border-gray-300 h-[18px] px-2"
                      >
                        Clear
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProductLine(index)}
                        disabled={productLines.length <= 1}
                        className="text-xs text-white bg-red-600 hover:bg-red-800 h-[18px] px-2"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={addProductLine}
              className="w-full text-base mt-4"
            >
              + Add Product Line
            </Button>
            
            {/* Order Total Summary */}
            <div className="subtotal-section mt-6 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total Sale Price:</span>
                  <span>${productLines.reduce((acc, line) => acc + line.sale_price, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold border-t pt-2">
                  <span>Total After Fees:</span>
                  <span>${productLines.reduce((acc, line) => acc + line.after_fee, 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          
          <div className="space-y-2">
            <Label className="text-lg" htmlFor="special_requests">Special Requests</Label>
            <Textarea
              id="special_requests"
              value={formData.special_requests}
              onChange={(e) => handleInputChange('special_requests', e.target.value.toUpperCase())}
              rows={4}
              suppressHydrationWarning
              className="uppercase"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => window.location.href = '/landing'}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white border-red-600"
              suppressHydrationWarning
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handlePrint}
              disabled={loading}
              className="w-full"
              suppressHydrationWarning
              data-print-form="true"
            >
              <Printer className="h-6 w-6 mr-2" />
              Print
            </Button>
            <Button type="submit" disabled={loading} className="w-full" suppressHydrationWarning>
              {loading ? 'Saving...' : initialData ? 'Update Consignment' : 'Create Consignment'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    
    {/* Update Confirmation Dialog */}
    {showUpdateDialog && (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={() => setShowUpdateDialog(false)}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxWidth: '400px',
            width: '100%',
            border: '2px solid #d1d5db',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#111827',
            margin: '0 0 16px 0'
          }}>
            Confirm Update
          </h3>
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            margin: '0 0 24px 0',
            lineHeight: '1.5'
          }}>
            Are you sure you want to accept the changes to this consignment? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowUpdateDialog(false)}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                color: '#374151',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
            >
              Cancel
            </button>
            <button
              onClick={() => performSubmission()}
              disabled={loading}
              style={{
                padding: '8px 16px',
                border: '1px solid #2563eb',
                borderRadius: '6px',
                backgroundColor: loading ? '#9ca3af' : '#2563eb',
                color: '#ffffff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {loading ? 'Updating...' : 'Accept Changes'}
            </button>
          </div>
        </div>
      </div>
    )}
    
    {/* Print/Submit Dialog */}
    <PrintSubmitDialog
      open={showPrintSubmitDialog}
      onOpenChange={setShowPrintSubmitDialog}
      onPrint={handlePrint}
      onSubmit={performSubmission}
      onEmail={handleEmail}
      isEditing={!!initialData}
      loading={loading}
      emailLoading={emailLoading}
      customerEmail={formData.customer_email}
      customerName={formData.customer_name}
    />
    </>
  )
}
