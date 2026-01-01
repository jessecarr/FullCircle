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
import CustomerSearch from '../CustomerSearch'
import { lookupZipCode, isValidZipCode } from '@/lib/zipLookup'
import { Printer, Search } from 'lucide-react'
import FastBoundSearch from '../FastBoundSearch'

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

interface SpecialOrderFormProps {
  initialData?: SpecialOrderFormType
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

export function InboundTransferForm({ initialData, onSuccess, onCancel }: SpecialOrderFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
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
    special_requests: initialData?.special_requests || ''
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.customer_name || !formData.customer_phone) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required customer fields',
        variant: 'destructive',
      })
      return
    }

    // Show confirmation dialog for updates
    if (initialData) {
      setShowUpdateDialog(true)
      return
    }

    // For new orders, proceed directly
    await performSubmission()
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
          special_requests: formData.special_requests
        });

        try {
          const { data, error } = await supabase
            .from('special_orders')
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
          .from('special_orders')
          .insert([{
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
    // Calculate totals
    const subtotal = productLines.reduce((acc, line) => acc + line.unit_price, 0);
    const tax = 0; // No tax as requested
    const total = subtotal;

    // Determine scale factor based on number of items
    const itemCount = productLines.length;
    let scaleFactor = 1.0;
    if (itemCount > 3) {
      scaleFactor = 0.85;
    }
    if (itemCount > 5) {
      scaleFactor = 0.75;
    }
    if (itemCount > 7) {
      scaleFactor = 0.65;
    }

    // Create print content with two copies on one page
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inbound Transfer Form</title>
        <style>
          @page {
            size: portrait;
            margin: 0.25in;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            color: #000;
            background: white;
            padding: 10px;
            max-width: 8in;
            margin: 0 auto;
            transform: scale(${scaleFactor});
            transform-origin: top center;
          }
          
          .print-copy {
            border: 1px solid #000;
            padding: 15px;
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          
          .print-copy:last-child {
            margin-bottom: 0;
          }
          
          .copy-label {
            text-align: center;
            font-size: 10px;
            color: #666;
            margin-bottom: 5px;
            font-weight: bold;
          }
          
          .print-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          
          .print-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 8px;
          }
          
          .print-subtitle {
            font-size: 12px;
            color: #666;
          }
          
          .print-section {
            margin-bottom: 20px;
          }
          
          .print-section-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 8px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 3px;
          }
          
          .print-field {
            margin-bottom: 6px;
            display: flex;
          }
          
          .print-label {
            font-weight: bold;
            width: 120px;
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
            margin-bottom: 15px;
          }
          
          .print-table th,
          .print-table td {
            border: 1px solid #000;
            padding: 6px;
            text-align: left;
            font-size: 11px;
          }
          
          .print-table th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          
          .print-total-summary {
            margin-top: 15px;
            padding: 8px;
            background-color: #f5f5f5;
            border: 1px solid #000;
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
            padding-top: 3px;
            margin-bottom: 0;
          }
        </style>
      </head>
      <body>
        <!-- Customer Copy (Top) -->
        <div class="print-copy">
          <div style="text-align: left; font-size: 10px; margin-bottom: 10px;">
            ${new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          <div class="print-header">
            <div class="print-title">Inbound Transfer Form</div>
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
            <div class="print-section-title">Order Items</div>
            <table class="print-table">
              <thead>
                <tr>
                  <th style="width: 15%">Control #</th>
                  <th style="width: 30%">Manufacturer</th>
                  <th style="width: 15%">Model</th>
                  <th style="width: 15%">Serial #</th>
                  <th style="width: 15%">Order Type</th>
                  <th style="width: 10%">Unit Price</th>
                </tr>
              </thead>
              <tbody>
                ${productLines.map((line, index) => `
                  <tr key="${index}">
                    <td>${line.control_number || '-'}</td>
                    <td>${line.manufacturer || '-'}</td>
                    <td>${line.model || '-'}</td>
                    <td>${line.serial_number || '-'}</td>
                    <td>${line.order_type || '-'}</td>
                    <td>$${(line.unit_price || 0).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="print-total-summary">
              <div class="print-total-row">
                <span style="font-weight: bold">Subtotal:</span>
                <span>$${subtotal.toFixed(2)}</span>
              </div>
              <div class="print-total-row">
                <span style="font-weight: bold">Tax:</span>
                <span>$${tax.toFixed(2)}</span>
              </div>
              <div class="print-total-row final">
                <span>Total:</span>
                <span>$${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Merchant Copy (Bottom) -->
        <div class="print-copy">
          <div style="text-align: left; font-size: 10px; margin-bottom: 10px;">
            ${new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          <div class="print-header">
            <div class="print-title">Inbound Transfer Form</div>
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
            <div class="print-section-title">Order Items</div>
            <table class="print-table">
              <thead>
                <tr>
                  <th style="width: 15%">Control #</th>
                  <th style="width: 30%">Manufacturer</th>
                  <th style="width: 15%">Model</th>
                  <th style="width: 15%">Serial #</th>
                  <th style="width: 15%">Order Type</th>
                  <th style="width: 10%">Unit Price</th>
                </tr>
              </thead>
              <tbody>
                ${productLines.map((line, index) => `
                  <tr key="${index}">
                    <td>${line.control_number || '-'}</td>
                    <td>${line.manufacturer || '-'}</td>
                    <td>${line.model || '-'}</td>
                    <td>${line.serial_number || '-'}</td>
                    <td>${line.order_type || '-'}</td>
                    <td>$${(line.unit_price || 0).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="print-total-summary">
              <div class="print-total-row">
                <span style="font-weight: bold">Subtotal:</span>
                <span>$${subtotal.toFixed(2)}</span>
              </div>
              <div class="print-total-row">
                <span style="font-weight: bold">Tax:</span>
                <span>$${tax.toFixed(2)}</span>
              </div>
              <div class="print-total-row final">
                <span>Total:</span>
                <span>$${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
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
          <CardTitle className="font-bold underline text-5xl">Inbound Transfer Form</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border rounded-lg p-6 mb-6">
            <div className="space-y-4">
              <h3 className="text-xl font-bold underline mb-4">Customer Information</h3>
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
                  <Label className="text-lg" htmlFor="customer_street">Street Address</Label>
                  <Textarea
                    id="customer_street"
                    value={formData.customer_street}
                    onChange={(e) => handleInputChange('customer_street', e.target.value.toUpperCase())}
                    className="min-h-[192px] text-base uppercase"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className="text-lg" htmlFor="customer_zip">Zip</Label>
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
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-lg" htmlFor="customer_state">State</Label>
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
                    <Label className="text-lg" htmlFor="customer_city">City</Label>
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
            <div className="mb-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Label className="text-lg font-semibold flex items-center gap-2 mb-2">
                <Search className="h-5 w-5" />
                Search FastBound Inventory
              </Label>
              <p className="text-sm text-gray-600 mb-3">
                Search your FastBound inventory to auto-fill item details. Select an item to add it to the form.
              </p>
              <FastBoundSearch
                onSelect={(item) => {
                  // Check if first line is empty (all required fields are empty)
                  const firstLine = productLines[0]
                  const isFirstLineEmpty = !firstLine.control_number && !firstLine.manufacturer && !firstLine.model && !firstLine.serial_number
                  
                  const newLineData: ProductLine = {
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
                  
                  if (isFirstLineEmpty) {
                    // Fill the first line instead of creating a new one
                    const updated = [...productLines]
                    updated[0] = newLineData
                    setProductLines(updated)
                    // Recalculate height for the first row after a short delay
                    setTimeout(() => recalculateRowHeight(0), 100)
                  } else {
                    // Add a new line with the FastBound item data
                    setProductLines([...productLines, newLineData])
                    // Recalculate height for the newly added row after a short delay
                    setTimeout(() => {
                      const newIndex = productLines.length
                      recalculateRowHeight(newIndex)
                    }, 100)
                  }
                }}
                placeholder="Search by serial number, manufacturer, or model..."
              />
            </div>

            <div className="grid grid-cols-13 gap-4 items-end mb-1">
              <div className="col-span-2"><Label className="text-lg">Control # *</Label></div>
              <div className="col-span-2"><Label className="text-lg">Manufacturer *</Label></div>
              <div className="col-span-2"><Label className="text-lg">Model *</Label></div>
              <div className="col-span-2"><Label className="text-lg">Serial # *</Label></div>
              <div className="col-span-2"><Label className="text-lg">Order Type *</Label></div>
              <div className="col-span-1"><Label className="text-lg">Price *</Label></div>
              <div className="col-span-1"><Label className="text-lg"></Label></div> {/* Delete button header */}
            </div>
            
            {productLines.map((line, index) => (
              <div key={index} className="grid grid-cols-13 gap-4 items-end mb-2">
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

                <div className="col-span-2">
                  <Select 
                    value={line.order_type} 
                    onValueChange={(value) => {
                    // Calculate new price based on order type
                    const newPrice = value === 'Transfer' ? 40 : 0
                    // Update all fields in a single state update
                    const updated = [...productLines]
                    updated[index] = {
                      ...updated[index],
                      order_type: value,
                      unit_price: newPrice
                    }
                    setProductLines(updated)
                    // Recalculate row height after value change to sync all fields
                    setTimeout(() => recalculateRowHeight(index), 10)
                  }}
                  >
                    <SelectTrigger 
                      className="bg-white text-black border" 
                      suppressHydrationWarning
                      style={{ 
                        height: isClient ? (rowHeights[index] || '48px') : '48px',
                        minHeight: '48px',
                        whiteSpace: 'normal',
                        wordWrap: 'break-word'
                      }}
                      data-order-type-row={index}
                    >
                      <div style={{ whiteSpace: 'normal', wordWrap: 'break-word', width: '100%' }}>
                        <SelectValue placeholder="Select order type" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-300 text-black" style={{ maxWidth: '200px' }}>
                      <SelectItem value="Transfer" className="hover:bg-gray-100" style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>TRANSFER</SelectItem>
                      <SelectItem value="Purchased From FCR" className="hover:bg-gray-100" style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>PURCHASED FROM FCR</SelectItem>
                    </SelectContent>
                  </Select>
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
                    className="w-24 text-base text-center text-left"
                    style={{ height: isClient ? (rowHeights[index] || '48px') : '48px' }}
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

                <div className="col-span-2"></div> {/* Extra space */}
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
            
            {/* Order Total Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <div className="space-y-2">
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Subtotal:</span>
                  <span>${productLines.reduce((acc, line) => acc + line.unit_price, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>${productLines.reduce((acc, line) => acc + line.unit_price, 0).toFixed(2)}</span>
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
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button type="submit" disabled={loading} className="w-full border border-input" suppressHydrationWarning>
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
    </>
  )
}
