'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase, type SpecialOrderForm as SpecialOrderFormType, type OutboundTransferForm } from '@/lib/supabase'
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

interface OutboundTransferFormProps {
  initialData?: OutboundTransferForm
  onSuccess?: () => void
  onCancel?: () => void
}

interface ProductLine {
  control_number: string
  manufacturer: string
  model: string
  serial_number: string
  order_type: string
  unit_price: number
  fastbound_item_id?: string
  firearm_type?: string
  caliber?: string
}

export function OutboundTransferForm({ initialData, onSuccess, onCancel }: OutboundTransferFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showPrintSubmitDialog, setShowPrintSubmitDialog] = useState(false)
  const [productLines, setProductLines] = useState<ProductLine[]>(() => {
    // If editing existing form with product_lines, use those
    if (initialData?.product_lines && Array.isArray(initialData.product_lines)) {
      return initialData.product_lines.map((line: any) => ({
        control_number: line.control_number || '',
        manufacturer: line.manufacturer || '',
        model: line.model || '',
        serial_number: line.serial_number || '',
        order_type: line.order_type || '',
        unit_price: line.unit_price || 0,
      }))
    }
    // Otherwise, create a single empty line for new orders
    return [{
      control_number: '',
      manufacturer: '',
      model: '',
      serial_number: '',
      order_type: '',
      unit_price: 0,
    }]
  })
  const [rowHeights, setRowHeights] = useState<{[key: number]: string}>({})
  const [isClient, setIsClient] = useState(false)
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Trigger height recalculation when productLines change
  useEffect(() => {
    if (isClient) {
      productLines.forEach((_, index) => {
        setTimeout(() => recalculateRowHeight(index), 100)
      })
    }
  }, [productLines, isClient])
  
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
    transferee_name: initialData?.transferee_name || '',
    transferee_phone: initialData?.transferee_phone || '',
    transferee_ffl_name: initialData?.transferee_ffl_name || '',
    transferee_ffl_phone: initialData?.transferee_ffl_phone || '',
    transferee_ffl_address: initialData?.transferee_ffl_address || '',
    transferee_ffl_zip: initialData?.transferee_ffl_zip || '',
    transferee_ffl_state: initialData?.transferee_ffl_state || '',
    transferee_ffl_city: initialData?.transferee_ffl_city || '',
    disposition_date: initialData?.disposition_date || ''
  })

  const addProductLine = () => {
    setProductLines([...productLines, {
      control_number: '',
      manufacturer: '',
      model: '',
      serial_number: '',
      order_type: '',
      unit_price: 0,
      fastbound_item_id: '',
      firearm_type: '',
      caliber: ''
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
      // Don't override price - let it be determined by order type
      fastbound_item_id: item.fastbound_item_id,
      firearm_type: item.firearm_type || '',
      caliber: item.caliber || ''
    }
    setProductLines(updated)
  }

  const handleControlNumberSearch = async (index: number, controlNumber: string) => {
    if (!controlNumber.trim()) return
    
    try {
      const response = await fetch(`/api/control-number?controlNumber=${encodeURIComponent(controlNumber.trim())}`)
      if (!response.ok) {
        if (response.status === 404) {
          // Control number not found, don't show error to user, just don't auto-fill
          return
        }
        throw new Error('Search failed')
      }
      
      const item = await response.json()
      if (item) {
        // Auto-fill the fields with the found item data
        const updated = [...productLines]
        updated[index] = {
          ...updated[index],
          manufacturer: item.manufacturer || '',
          model: item.model || '',
          serial_number: item.serial_number || '',
          fastbound_item_id: item.fastbound_item_id,
          firearm_type: item.firearm_type || '',
          caliber: item.caliber || ''
        }
        setProductLines(updated)
        
        toast({
          title: 'Item Found',
          description: 'Auto-filled manufacturer, model, and serial number',
        })
      }
    } catch (error) {
      console.error('Error searching control number:', error)
      // Don't show error to user for failed searches, just log it
    }
  }

  const updateProductLine = (index: number, field: keyof ProductLine, value: any) => {
    console.log('Updating product line:', { index, field, value });
    const updated = [...productLines]
    updated[index] = { ...updated[index], [field]: value }
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
      
      // Update all fields in this row to the new height
      return {
        ...prev,
        [rowIndex]: newHeight
      }
    })
  }

  const recalculateRowHeight = (rowIndex: number) => {
    if (!isClient) return
    
    // Get all textarea elements in this row and find the max height
    const controlNumberField = document.getElementById(`control_number-${rowIndex}`) as HTMLTextAreaElement
    const manufacturerField = document.getElementById(`manufacturer-${rowIndex}`) as HTMLTextAreaElement
    const modelField = document.getElementById(`model-${rowIndex}`) as HTMLTextAreaElement
    const serialNumberField = document.getElementById(`serial_number-${rowIndex}`) as HTMLTextAreaElement
    const orderTypeField = document.querySelector(`[data-order-type-row="${rowIndex}"]`) as HTMLElement
    
    let maxHeight = 48
    
    if (controlNumberField) maxHeight = Math.max(maxHeight, controlNumberField.scrollHeight)
    if (manufacturerField) maxHeight = Math.max(maxHeight, manufacturerField.scrollHeight)
    if (modelField) maxHeight = Math.max(maxHeight, modelField.scrollHeight)
    if (serialNumberField) maxHeight = Math.max(maxHeight, serialNumberField.scrollHeight)
    if (orderTypeField) maxHeight = Math.max(maxHeight, orderTypeField.scrollHeight || orderTypeField.offsetHeight)
    
    setRowHeights(prev => ({
      ...prev,
      [rowIndex]: `${maxHeight}px`
    }))
  }

  const handleZipCodeChange = async (zip: string) => {
    setFormData(prev => ({ ...prev, customer_zip: zip }))
    
    // Auto-fill city and state if valid zip code
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

  const handleTransfereeZipCodeChange = async (zip: string) => {
    setFormData(prev => ({ ...prev, transferee_ffl_zip: zip }))
    
    // Auto-fill city and state if valid zip code
    if (isValidZipCode(zip)) {
      try {
        const zipData = await lookupZipCode(zip)
        if (zipData) {
          setFormData(prev => ({
            ...prev,
            transferee_ffl_city: zipData.city,
            transferee_ffl_state: zipData.state
          }))
        }
      } catch (error) {
        console.error('Failed to lookup zip code:', error)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.customer_name || !formData.customer_phone || !formData.customer_street || !formData.customer_city || !formData.customer_state || !formData.customer_zip) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required transferor fields',
        variant: 'destructive',
      })
      return
    }

    // Validate transferee required fields
    if (!formData.transferee_name || !formData.transferee_phone || !formData.transferee_ffl_name || !formData.transferee_ffl_phone || !formData.transferee_ffl_address || !formData.transferee_ffl_zip || !formData.transferee_ffl_state || !formData.transferee_ffl_city) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required transferee fields',
        variant: 'destructive',
      })
      return
    }

    // Show confirmation dialog for updates
    if (initialData) {
      setShowUpdateDialog(true)
      return
    }

    // For new orders, show print/submit dialog
    setShowPrintSubmitDialog(true)
  }

  const performSubmission = async () => {
    setLoading(true)

    try {
      // Calculate total price for all product lines
      const totalAmount = productLines.reduce((acc, line) => acc + line.unit_price, 0);

      if (initialData) {
        // Update existing order
        console.log('Initial data:', initialData);
        console.log('Initial data ID:', initialData.id);
        
        if (!initialData.id) {
          console.error('No ID found in initialData');
          throw new Error('Cannot update order: No ID provided');
        }

        console.log('Updating order with ID:', initialData.id);
        console.log('Update data:', {
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone,
          customer_street: formData.customer_street,
          customer_city: formData.customer_city,
          customer_state: formData.customer_state,
          customer_zip: formData.customer_zip,
          product_lines: productLines,
          total_price: totalAmount,
          disposition_date: formData.disposition_date
        });

        try {
          const { data, error } = await supabase
            .from('outbound_transfers')
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
              disposition_date: formData.disposition_date
            })
            .eq('id', initialData.id)
            .select();

          console.log('Supabase update completed');
          console.log('Update response data:', data);
          console.log('Update response error:', error);

          if (error) {
            console.error('Supabase error object:', error);
            console.error('Supabase error details:', {
              message: error.message,
              details: error.details,
              code: error.code,
              hint: error.hint
            });
            throw new Error(`Update failed: ${error.message || 'Unknown error'}`);
          }

          if (!data) {
            console.error('No data returned from update - data is null/undefined');
            throw new Error('No data returned from update operation');
          }

          if (Array.isArray(data) && data.length === 0) {
            console.error('Empty array returned from update');
            throw new Error('No records were updated');
          }

          console.log('Order updated successfully:', data);
          toast({ title: 'Success', description: 'Order updated successfully' });
        } catch (supabaseError) {
          console.error('Supabase operation failed:', supabaseError);
          throw supabaseError;
        }
      } else {
        // Create new order
        const { error } = await supabase
          .from('outbound_transfers')
          .insert([{
            customer_name: formData.customer_name,
            customer_email: formData.customer_email,
            customer_phone: formData.customer_phone,
            customer_street: formData.customer_street,
            customer_city: formData.customer_city,
            customer_state: formData.customer_state,
            customer_zip: formData.customer_zip,
            transferee_name: formData.transferee_name,
            transferee_phone: formData.transferee_phone,
            transferee_ffl_name: formData.transferee_ffl_name,
            transferee_ffl_phone: formData.transferee_ffl_phone,
            transferee_ffl_address: formData.transferee_ffl_address,
            transferee_ffl_city: formData.transferee_ffl_city,
            transferee_ffl_state: formData.transferee_ffl_state,
            transferee_ffl_zip: formData.transferee_ffl_zip,
            drivers_license: formData.drivers_license,
            license_expiration: formData.license_expiration,
            product_lines: productLines,
            total_price: totalAmount,
            disposition_date: formData.disposition_date || null
          }])

        if (error) {
          console.error('Supabase error:', {
            message: error.message,
            details: error.details,
            code: error.code
          });
          throw error;
        }

        toast({ title: 'Success', description: 'Order created successfully' });
      }

      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save order',
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
    // Create print content with bordered sections matching the form layout
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Outbound Transfer Form</title>
        <style>
          @page {
            size: portrait;
            margin: 0.4in;
          }
          
          * {
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            color: #000;
            background: white;
            padding: 15px;
            max-width: 8in;
            margin: 0 auto;
            font-size: 12px;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 20px;
          }
          
          .print-date {
            text-align: left;
            font-size: 10px;
            color: #666;
            margin-bottom: 5px;
          }
          
          .print-title {
            font-size: 22px;
            font-weight: bold;
          }
          
          .section-box {
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
          }
          
          .section-title {
            font-size: 16px;
            font-weight: bold;
            text-decoration: underline;
            margin-bottom: 12px;
          }
          
          .two-column {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          
          .field-group {
            margin-bottom: 10px;
          }
          
          .field-label {
            font-size: 11px;
            font-weight: bold;
            color: #333;
            margin-bottom: 3px;
          }
          
          .field-value {
            font-size: 12px;
            padding: 6px 8px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 4px;
            min-height: 28px;
          }
          
          .field-value.address {
            min-height: 60px;
            white-space: pre-wrap;
          }
          
          .address-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          
          .address-right {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          
          .items-table th,
          .items-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-size: 11px;
          }
          
          .items-table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <div class="print-date">
            ${new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          <div class="print-title">Outbound Transfer Form</div>
        </div>

        <!-- Transferor Section -->
        <div class="section-box">
          <div class="section-title">Transferor</div>
          <div class="two-column">
            <div class="field-group">
              <div class="field-label">Name</div>
              <div class="field-value">${formData.customer_name || ''}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Phone</div>
              <div class="field-value">${formatPhoneNumber(formData.customer_phone) || ''}</div>
            </div>
          </div>
        </div>

        <!-- Transferee Section -->
        <div class="section-box">
          <div class="section-title">Transferee</div>
          <div class="two-column">
            <div class="field-group">
              <div class="field-label">Transferee Name</div>
              <div class="field-value">${formData.transferee_name || ''}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Transferee Phone</div>
              <div class="field-value">${formatPhoneNumber(formData.transferee_phone) || ''}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Transferee FFL Name</div>
              <div class="field-value">${formData.transferee_ffl_name || ''}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Transferee FFL Phone</div>
              <div class="field-value">${formatPhoneNumber(formData.transferee_ffl_phone) || ''}</div>
            </div>
          </div>
          <div class="address-grid" style="margin-top: 15px;">
            <div class="field-group">
              <div class="field-label">Street Address</div>
              <div class="field-value address">${formData.transferee_ffl_address || ''}</div>
            </div>
            <div class="address-right">
              <div class="field-group">
                <div class="field-label">Zip</div>
                <div class="field-value">${formData.transferee_ffl_zip || ''}</div>
              </div>
              <div class="field-group">
                <div class="field-label">State</div>
                <div class="field-value">${formData.transferee_ffl_state || ''}</div>
              </div>
              <div class="field-group">
                <div class="field-label">City</div>
                <div class="field-value">${formData.transferee_ffl_city || ''}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Transfer Items Section -->
        <div class="section-box">
          <div class="section-title">Transfer Items</div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 20%">Control #</th>
                <th style="width: 25%">Manufacturer</th>
                <th style="width: 25%">Model</th>
                <th style="width: 30%">Serial #</th>
              </tr>
            </thead>
            <tbody>
              ${productLines.map((line, index) => `
                <tr>
                  <td>${line.control_number || '-'}</td>
                  <td>${line.manufacturer || '-'}</td>
                  <td>${line.model || '-'}</td>
                  <td>${line.serial_number || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${formData.disposition_date ? `
        <div class="section-box">
          <div class="section-title">Disposition</div>
          <div class="field-group">
            <div class="field-label">Disposition Date</div>
            <div class="field-value">${new Date(formData.disposition_date).toLocaleDateString()}</div>
          </div>
        </div>
        ` : ''}
      </body>
      </html>
    `;

    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    document.body.appendChild(iframe);

    // Write content to iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(printContent);
      iframeDoc.close();

      // Wait for content to load, then print
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.print();
          // Remove iframe after printing
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      };
    } else {
      // Fallback: try popup method
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
          printWindow.close();
        };
      } else {
        toast({
          title: 'Error',
          description: 'Please allow pop-ups for this site to print',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="font-bold underline text-6xl">Outbound Transfer Form</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border rounded-lg p-6 mb-6">
            <div className="space-y-4">
              <h3 className="text-xl font-bold underline mb-4">Transferor</h3>
              <CustomerSearch 
                onSelect={(customer) => {
                  setFormData({
                    ...formData,
                    customer_name: customer.name,
                    customer_email: customer.email,
                    customer_phone: customer.phone,
                    customer_street: customer.street || '',
                    customer_city: customer.city || '',
                    customer_state: customer.state || '',
                    customer_zip: customer.zip || ''
                  });
                }}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-lg" htmlFor="customer_name">Customer Name *</Label>
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
                    className="uppercase"
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('drivers_license')?.focus();
                      }
                    }}
                    required
                    maxLength={14}
                    placeholder="(123) 456-7890"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-lg" htmlFor="drivers_license">Driver's License</Label>
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
                    className="uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-lg" htmlFor="license_expiration">Expiration Date</Label>
                  <Input
                    id="license_expiration"
                    type="date"
                    value={formData.license_expiration}
                    onChange={(e) => handleInputChange('license_expiration', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('customer_email')?.focus();
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-lg" htmlFor="customer_email">Customer Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => handleInputChange('customer_email', e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('customer_street')?.focus();
                      }
                    }}
                    className="uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="space-y-2">
                  <Label className="text-lg" htmlFor="customer_street">Street Address *</Label>
                  <Textarea
                    id="customer_street"
                    value={formData.customer_street}
                    onChange={(e) => handleInputChange('customer_street', e.target.value.toUpperCase())}
                    className="min-h-[192px] text-base uppercase"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className="text-lg" htmlFor="customer_zip">Zip *</Label>
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
                      placeholder="Enter 5-digit zip code"
                      maxLength={5}
                      className="text-base uppercase"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-lg" htmlFor="customer_state">State *</Label>
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
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-lg" htmlFor="customer_city">City *</Label>
                    <Input
                      id="customer_city"
                      value={formData.customer_city}
                      onChange={(e) => handleInputChange('customer_city', e.target.value.toUpperCase())}
                      className="text-base uppercase"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-6 mb-6">
            <div className="space-y-4">
              <h3 className="text-xl font-bold underline mb-4">Transferee</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-lg" htmlFor="transferee_name">Transferee Name *</Label>
                  <Input
                    id="transferee_name"
                    value={formData.transferee_name}
                    onChange={(e) => handleInputChange('transferee_name', e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('transferee_phone')?.focus();
                      }
                    }}
                    required
                    className="uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-lg" htmlFor="transferee_phone">Transferee Phone *</Label>
                  <Input
                    id="transferee_phone"
                    type="tel"
                    value={formatPhoneNumber(formData.transferee_phone)}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      handleInputChange('transferee_phone', digits);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('transferee_ffl_name')?.focus();
                      }
                    }}
                    required
                    maxLength={14}
                    placeholder="(123) 456-7890"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-lg" htmlFor="transferee_ffl_name">Transferee FFL Name *</Label>
                  <Input
                    id="transferee_ffl_name"
                    value={formData.transferee_ffl_name}
                    onChange={(e) => handleInputChange('transferee_ffl_name', e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('transferee_ffl_phone')?.focus();
                      }
                    }}
                    required
                    className="uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-lg" htmlFor="transferee_ffl_phone">Transferee FFL Phone *</Label>
                  <Input
                    id="transferee_ffl_phone"
                    type="tel"
                    value={formatPhoneNumber(formData.transferee_ffl_phone)}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      handleInputChange('transferee_ffl_phone', digits);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('transferee_ffl_address')?.focus();
                      }
                    }}
                    required
                    maxLength={14}
                    placeholder="(123) 456-7890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="space-y-2">
                  <Label className="text-lg" htmlFor="transferee_ffl_address">Street Address *</Label>
                  <Textarea
                    id="transferee_ffl_address"
                    value={formData.transferee_ffl_address}
                    onChange={(e) => handleInputChange('transferee_ffl_address', e.target.value.toUpperCase())}
                    className="min-h-[192px] text-base uppercase"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className="text-lg" htmlFor="transferee_ffl_zip">Zip *</Label>
                    <Input
                      id="transferee_ffl_zip"
                      value={formData.transferee_ffl_zip}
                      onChange={(e) => handleTransfereeZipCodeChange(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          document.getElementById('transferee_ffl_state')?.focus();
                        }
                      }}
                      placeholder="Enter 5-digit zip code"
                      maxLength={5}
                      className="text-base uppercase"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-lg" htmlFor="transferee_ffl_state">State *</Label>
                    <Input
                      id="transferee_ffl_state"
                      value={formData.transferee_ffl_state}
                      onChange={(e) => handleInputChange('transferee_ffl_state', e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          document.getElementById('transferee_ffl_city')?.focus();
                        }
                      }}
                      className="text-base uppercase"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-lg" htmlFor="transferee_ffl_city">City *</Label>
                    <Input
                      id="transferee_ffl_city"
                      value={formData.transferee_ffl_city}
                      onChange={(e) => handleInputChange('transferee_ffl_city', e.target.value.toUpperCase())}
                      className="text-base uppercase"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-6 mb-6">
            <h3 className="text-xl underline font-bold mb-4">Items</h3>
            
            {/* FastBound Inventory Search */}
            <div className="subtotal-section mb-2 p-4 rounded-lg">
              <Label className="text-lg font-semibold flex items-center gap-2 mb-2">
                <Search className="h-5 w-5" />
                Search FastBound Inventory
              </Label>
              <p className="text-sm text-[#9ca3af] mb-3">
                Search your FastBound inventory to auto-fill item details. Select an item to add it to the form.
              </p>
              <FastBoundSearch
                onSelect={(item) => {
                  // Create new line data from FastBound item
                  const newLine: ProductLine = {
                    control_number: item.control_number || item.serial_number || '',
                    manufacturer: item.manufacturer || '',
                    model: item.model || '',
                    serial_number: item.serial_number || '',
                    order_type: '',
                    unit_price: 0, // Will be updated when order type is selected
                    fastbound_item_id: item.fastbound_item_id,
                    firearm_type: item.firearm_type || '',
                    caliber: item.caliber || ''
                  }
                  
                  // Check if first line is empty - if so, fill it instead of adding new line
                  const isFirstLineEmpty = productLines.length > 0 && 
                    !productLines[0].control_number && 
                    !productLines[0].manufacturer && 
                    !productLines[0].model && 
                    !productLines[0].serial_number
                  
                  if (isFirstLineEmpty) {
                    // Fill the first empty line
                    const updatedLines = [...productLines]
                    updatedLines[0] = newLine
                    setProductLines(updatedLines)
                    setTimeout(() => recalculateRowHeight(0), 100)
                  } else {
                    // Add a new line
                    setProductLines([...productLines, newLine])
                    setTimeout(() => {
                      const newIndex = productLines.length
                      recalculateRowHeight(newIndex)
                    }, 100)
                  }
                }}
                placeholder="Search by serial number, manufacturer, or model..."
              />
            </div>

            <div className="grid grid-cols-9 gap-4 items-end mb-1">
              <div className="col-span-2"><Label className="text-lg">Control # *</Label></div>
              <div className="col-span-2"><Label className="text-lg">Manufacturer *</Label></div>
              <div className="col-span-2"><Label className="text-lg">Model *</Label></div>
              <div className="col-span-2"><Label className="text-lg">Serial # *</Label></div>
              <div className="col-span-1"><Label className="text-lg"></Label></div> {/* Delete button header */}
            </div>
            
            {productLines.map((line, index) => (
              <div key={index} className="grid grid-cols-9 gap-4 items-end mb-2">
                <div className="col-span-2">
                  <Textarea
                    id={`control_number-${index}`}
                    value={line.control_number}
                    onChange={(e) => {
                      console.log('Control Number input changed:', e.target.value);
                      updateProductLine(index, 'control_number', e.target.value.toUpperCase());
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        // Move focus to manufacturer field
                        const manufacturerField = document.getElementById(`manufacturer-${index}`) as HTMLTextAreaElement;
                        if (manufacturerField) {
                          manufacturerField.focus();
                        }
                      }
                    }}
                    onBlur={(e) => {
                      handleControlNumberSearch(index, e.target.value);
                    }}
                    required
                    className="text-base w-full min-h-[48px] resize-none overflow-hidden uppercase text-center text-left"
                    rows={1}
                    style={{
                      height: isClient ? (rowHeights[index] || '48px') : '48px',
                      minHeight: '48px'
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      const newHeight = `${target.scrollHeight}px`;
                      target.style.height = newHeight;
                      handleFieldHeightChange(index, `control_number-${index}`, newHeight);
                      // Recalculate after a short delay to ensure proper shrinking
                      setTimeout(() => recalculateRowHeight(index), 10);
                    }}
                    data-testid={`control-number-input-${index}`}
                    placeholder="ENTER CONTROL #"
                  />
                </div>

                <div className="col-span-2">
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
                    required
                    className="min-h-[48px] w-full text-base resize-none overflow-hidden uppercase text-left"
                    rows={1}
                    style={{
                      height: isClient ? (rowHeights[index] || '48px') : '48px',
                      minHeight: '48px'
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      const newHeight = `${target.scrollHeight}px`;
                      target.style.height = newHeight;
                      handleFieldHeightChange(index, `manufacturer-${index}`, newHeight);
                      // Recalculate after a short delay to ensure proper shrinking
                      setTimeout(() => recalculateRowHeight(index), 10);
                    }}
                  />
                </div>

                <div className="col-span-2">
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
                    required
                    className="min-h-[48px] w-full text-base resize-none overflow-hidden uppercase text-left"
                    rows={1}
                    style={{
                      height: isClient ? (rowHeights[index] || '48px') : '48px',
                      minHeight: '48px'
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      const newHeight = `${target.scrollHeight}px`;
                      target.style.height = newHeight;
                      handleFieldHeightChange(index, `model-${index}`, newHeight);
                      // Recalculate after a short delay to ensure proper shrinking
                      setTimeout(() => recalculateRowHeight(index), 10);
                    }}
                  />
                </div>

                <div className="col-span-2">
                  <Textarea
                    id={`serial_number-${index}`}
                    value={line.serial_number}
                    onChange={(e) => updateProductLine(index, 'serial_number', e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const nextIndex = index + 1;
                        if (nextIndex < productLines.length) {
                          document.getElementById(`control_number-${nextIndex}`)?.focus();
                        }
                      }
                    }}
                    required
                    className="min-h-[48px] w-full text-base resize-none overflow-hidden uppercase text-left"
                    rows={1}
                    style={{
                      height: isClient ? (rowHeights[index] || '48px') : '48px',
                      minHeight: '48px'
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      const newHeight = `${target.scrollHeight}px`;
                      target.style.height = newHeight;
                      handleFieldHeightChange(index, `serial_number-${index}`, newHeight);
                      // Recalculate after a short delay to ensure proper shrinking
                      setTimeout(() => recalculateRowHeight(index), 10);
                    }}
                  />
                </div>

                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeProductLine(index)}
                    disabled={productLines.length <= 1}
                    className="h-14 w-14 text-red-600 hover:text-red-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

          
          <div className="grid grid-cols-9 gap-4">
            <div className="col-span-2 space-y-2">
              <Label className="text-lg" htmlFor="disposition_date">Disposition Date</Label>
              <Input
                id="disposition_date"
                type="date"
                value={formData.disposition_date}
                onChange={(e) => handleInputChange('disposition_date', e.target.value)}
                suppressHydrationWarning
                className="text-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onCancel ? onCancel() : window.history.back()}
              disabled={loading}
              className="w-full"
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
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button type="submit" disabled={loading} className="w-full" suppressHydrationWarning>
              {loading ? 'Saving...' : initialData ? 'Update Order' : 'Create Order'}
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
            Are you sure you want to accept the changes to this order? This action cannot be undone.
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
      isEditing={!!initialData}
      loading={loading}
    />
    </>
  )
}
