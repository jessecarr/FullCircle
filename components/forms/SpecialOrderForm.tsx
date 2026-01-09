'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase, type SpecialOrderForm as SpecialOrderFormType } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import CustomerSearch from '../CustomerSearch'
import VendorSearch from '../VendorSearch'
import { lookupZipCode, isValidZipCode } from '@/lib/zipLookup'
import { Printer, Search } from 'lucide-react'
import { PrintSubmitDialog } from '@/components/ui/print-submit-dialog'

interface SpecialOrderFormProps {
  initialData?: SpecialOrderFormType
  onSuccess?: () => void
  onCancel?: () => void
}

interface ProductLine {
  sku: string
  description: string
  vendor: string
  quantity: number
  unit_price: number
  total_price: number
}

export function SpecialOrderForm({ initialData, onSuccess, onCancel }: SpecialOrderFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showPrintSubmitDialog, setShowPrintSubmitDialog] = useState(false)
  const [showCustomerDetails, setShowCustomerDetails] = useState(false)
  const [productLines, setProductLines] = useState<ProductLine[]>(() => {
    // If editing existing form with product_lines, use those
    if (initialData?.product_lines && Array.isArray(initialData.product_lines)) {
      return initialData.product_lines.map((line: any) => ({
        sku: line.sku || '',
        description: line.description || '',
        vendor: line.vendor || '',
        quantity: line.quantity || 1,
        unit_price: line.unit_price || 0,
        total_price: line.total_price || 0,
      }))
    }
    // Otherwise, create a single empty line for new orders
    return [{
      sku: '',
      description: '',
      vendor: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    }]
  })
  const [rowHeights, setRowHeights] = useState<{[key: number]: string}>({})
  const [isClient, setIsClient] = useState(false)
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Customer update and creation function
  const updateCustomerRecord = async () => {
    // Only proceed if we have customer phone or email to identify the customer
    if (!formData.customer_phone && !formData.customer_email) {
      return;
    }

    try {
      // Check if customer exists by phone AND/OR email
      let existingCustomer = null;
      
      console.log('Customer lookup - Phone:', formData.customer_phone, 'Email:', formData.customer_email);
      
      // First try to find by phone if provided
      if (formData.customer_phone && formData.customer_phone.trim() !== '') {
        console.log('Looking up customer by phone:', formData.customer_phone);
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('phone', formData.customer_phone)
          .maybeSingle();
        
        if (data) {
          existingCustomer = data;
          console.log('Found existing customer by phone:', data);
        }
      }
      
      // If not found by phone, try by email if provided and not empty
      if (!existingCustomer && formData.customer_email && formData.customer_email.trim() !== '') {
        console.log('Looking up customer by email:', formData.customer_email);
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('email', formData.customer_email)
          .maybeSingle();
        
        if (data) {
          existingCustomer = data;
          console.log('Found existing customer by email:', data);
        }
      }
      
      console.log('Final existingCustomer result:', existingCustomer);

      if (existingCustomer) {
        // Customer exists, update with additional information
        const updateData: any = {};
        
        // Only update fields that have new information
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

        // Only update if there are changes
        if (Object.keys(updateData).length > 0) {
          updateData.updated_at = new Date().toISOString();
          
          const { error } = await supabase
            .from('customers')
            .update(updateData)
            .eq('id', existingCustomer.id);

          if (error) {
            console.error('Failed to update customer record:', error);
            console.error('Update error details:', JSON.stringify(error, null, 2));
          } else {
            console.log('Customer record updated successfully');
          }
        }
      } else {
        // Customer doesn't exist, create new customer with all provided information
        console.log('Creating new customer record...');
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

        // Always include email field - generate unique placeholder if not provided
        if (formData.customer_email && formData.customer_email.trim() !== '') {
          newCustomerData.email = formData.customer_email;
          console.log('Using provided email:', formData.customer_email);
        } else {
          // Generate unique placeholder email to satisfy unique constraint
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(2, 8);
          newCustomerData.email = `no-email-${timestamp}-${random}@placeholder.local`;
          console.log('Generated placeholder email:', newCustomerData.email);
        }

        console.log('New customer data to insert:', newCustomerData);

        const { error: insertError } = await supabase
          .from('customers')
          .insert([newCustomerData]);

        if (insertError) {
          console.error('Failed to create customer record:', insertError);
          console.error('Insert error details:', JSON.stringify(insertError, null, 2));
        } else {
          console.log('Customer record created successfully');
        }
      }
    } catch (error) {
      console.error('Error in customer record operation:', error);
      // Don't throw error - customer operations shouldn't block order creation
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
    delivery_method: initialData?.delivery_method || 'in_store_pickup',
    special_requests: initialData?.special_requests || '',
    status: initialData?.status || 'pending' as const
  })

  const addProductLine = () => {
    setProductLines([...productLines, {
      sku: '',
      description: '',
      vendor: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0
    }])
  }

  const updateProductLine = (index: number, field: keyof ProductLine, value: any) => {
    console.log('Updating product line:', { index, field, value });
    const updated = [...productLines]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total_price = updated[index].quantity * updated[index].unit_price
    }
    setProductLines(updated)
  }

  const clearProductLine = (index: number) => {
    const updated = [...productLines]
    updated[index] = {
      sku: '',
      description: '',
      vendor: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0
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
    const skuField = document.getElementById(`sku-${rowIndex}`) as HTMLTextAreaElement
    const descField = document.getElementById(`description-${rowIndex}`) as HTMLTextAreaElement
    const vendorField = document.querySelector(`[data-vendor-row="${rowIndex}"]`) as HTMLTextAreaElement
    
    let maxHeight = 48
    
    if (skuField) maxHeight = Math.max(maxHeight, skuField.scrollHeight)
    if (descField) maxHeight = Math.max(maxHeight, descField.scrollHeight)
    if (vendorField) maxHeight = Math.max(maxHeight, vendorField.scrollHeight)
    
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

    // Validate vendor is filled for all product lines
    const missingVendor = productLines.some(line => !line.vendor || line.vendor.trim() === '')
    if (missingVendor) {
      toast({
        title: 'Validation Error',
        description: 'Please select a vendor for all product lines',
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
      const totalAmount = productLines.reduce((acc, line) => acc + line.total_price, 0);

      // Update customer record with additional information if provided
      await updateCustomerRecord();

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
          delivery_method: formData.delivery_method,
          special_requests: formData.special_requests,
          status: formData.status
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
              delivery_method: formData.delivery_method,
              special_requests: formData.special_requests,
              status: formData.status
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
            delivery_method: formData.delivery_method,
            special_requests: formData.special_requests,
            status: formData.status
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
    const subtotal = productLines.reduce((acc, line) => acc + line.total_price, 0);
    const tax = subtotal * 0.0795;
    const total = subtotal * 1.0795;

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
        <title>Special Order Form</title>
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
            <div class="print-title">Special Order Form</div>
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
                  <th style="width: 15%">SKU</th>
                  <th style="width: 35%">Description</th>
                  <th style="width: 15%">Vendor</th>
                  <th style="width: 10%">Qty</th>
                  <th style="width: 15%">Unit Price</th>
                  <th style="width: 10%">Total</th>
                </tr>
              </thead>
              <tbody>
                ${productLines.map((line, index) => `
                  <tr key="${index}">
                    <td>${line.sku || '-'}</td>
                    <td>${line.description || '-'}</td>
                    <td>${line.vendor || '-'}</td>
                    <td>${line.quantity || 0}</td>
                    <td>$${(line.unit_price || 0).toFixed(2)}</td>
                    <td>$${((line.unit_price || 0) * (line.quantity || 0)).toFixed(2)}</td>
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
                <span style="font-weight: bold">Tax (7.95%):</span>
                <span>$${(subtotal * 0.0795).toFixed(2)}</span>
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
            <div class="print-title">Special Order Form</div>
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
                  <th style="width: 15%">SKU</th>
                  <th style="width: 35%">Description</th>
                  <th style="width: 15%">Vendor</th>
                  <th style="width: 10%">Qty</th>
                  <th style="width: 15%">Unit Price</th>
                  <th style="width: 10%">Total</th>
                </tr>
              </thead>
              <tbody>
                ${productLines.map((line, index) => `
                  <tr key="${index}">
                    <td>${line.sku || '-'}</td>
                    <td>${line.description || '-'}</td>
                    <td>${line.vendor || '-'}</td>
                    <td>${line.quantity || 0}</td>
                    <td>$${(line.unit_price || 0).toFixed(2)}</td>
                    <td>$${((line.unit_price || 0) * (line.quantity || 0)).toFixed(2)}</td>
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
                <span style="font-weight: bold">Tax (7.95%):</span>
                <span>$${(subtotal * 0.0795).toFixed(2)}</span>
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
          <CardTitle className="font-bold underline text-6xl">Special Order Form</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border rounded-lg p-6 mb-6">
            <div className="space-y-4">
              <div className="p-4 rounded-lg" style={{
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                padding: '1rem',
                borderRadius: '0.5rem'
              }}>
                <div className="text-xl font-semibold flex items-center gap-2 mb-3" style={{ color: '#dbeafe' }}>
                  <Search className="h-6 w-6" />
                  Search Customer Information
                </div>
                <p className="text-base mb-3" style={{ color: '#dbeafe' }}>
                  Search for existing customers by name, email, or phone. Select a customer to auto-fill their information.
                </p>
                <CustomerSearch 
                  onSelect={(customer) => {
                    // Check if email is a placeholder, leave blank if so
                    const isPlaceholderEmail = customer.email && customer.email.includes('@placeholder.local');
                    setFormData({
                      ...formData,
                      customer_name: customer.name || '',
                      customer_email: isPlaceholderEmail ? '' : (customer.email || ''),
                      customer_phone: customer.phone || '',
                      customer_street: customer.street || '',
                      customer_city: customer.city || '',
                      customer_state: customer.state || '',
                      customer_zip: customer.zip || '',
                    })
                  }}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-medium" htmlFor="customer_name">Customer Name *</Label>
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
                  <Label className="text-medium" htmlFor="customer_phone">Customer Phone *</Label>
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
                        document.getElementById('customer_email')?.focus();
                      }
                    }}
                    required
                    maxLength={14}
                    placeholder="(123) 456-7890"
                    className="uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-medium" htmlFor="customer_email">Customer Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => handleInputChange('customer_email', e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('drivers_license')?.focus();
                      }
                    }}
                    className="uppercase"
                  />
                </div>
              </div>
              
              {/* Customer Details Toggle */}
              <div className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCustomerDetails(!showCustomerDetails)}
                  className="w-full text-base"
                  suppressHydrationWarning
                >
                  {showCustomerDetails ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Hide Additional Customer Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show Additional Customer Details
                    </>
                  )}
                </Button>
              </div>

              {/* Customer Details Section - Collapsible */}
              {showCustomerDetails && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                        className="uppercase"
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
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="space-y-2">
                      <Label className="text-medium" htmlFor="customer_street">Street Address</Label>
                      <Textarea
                        id="customer_street"
                        value={formData.customer_street}
                        onChange={(e) => handleInputChange('customer_street', e.target.value.toUpperCase())}
                        className="min-h-[192px] text-base uppercase"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
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
                          placeholder="Enter 5-digit zip code"
                          maxLength={5}
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
              )}
            </div>
          </div>

          <div className="border rounded-lg p-6 mb-6">
            <h3 className="text-xl underline font-bold mb-4">Items</h3>
            <div className="grid grid-cols-14 gap-4 items-end mb-2">
              <div className="col-span-2"><Label className="text-lg">SKU *</Label></div>
              <div className="col-span-5"><Label className="text-lg">Description *</Label></div>
              <div className="col-span-1"><Label className="text-lg">Qty *</Label></div>
              <div className="col-span-1"><Label className="text-lg">Price *</Label></div>
              <div className="col-span-1"><Label className="text-lg">Total *</Label></div>
              <div className="col-span-2"><Label className="text-lg">Vendor *</Label></div>
              <div className="col-span-1"><Label className="text-lg"></Label></div> {/* Clear button */}
              <div className="col-span-1"><Label className="text-lg"></Label></div> {/* Delete button */}
            </div>
            
            {productLines.map((line, index) => (
              <div key={index} className="grid grid-cols-14 gap-4 items-center mb-2">
                <div className="col-span-2">
                  <Textarea
                    id={`sku-${index}`}
                    value={line.sku}
                    onChange={(e) => {
                      console.log('SKU input changed:', e.target.value);
                      updateProductLine(index, 'sku', e.target.value.toUpperCase());
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById(`description-${index}`)?.focus();
                      }
                    }}
                    required
                    className="text-base w-full min-h-[48px] resize-none overflow-hidden uppercase"
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
                      handleFieldHeightChange(index, `sku-${index}`, newHeight);
                      // Recalculate after a short delay to ensure proper shrinking
                      setTimeout(() => recalculateRowHeight(index), 10);
                    }}
                    data-testid={`sku-input-${index}`}
                  />
                </div>

                <div className="col-span-5">
                  <Textarea
                    id={`description-${index}`}
                    value={line.description}
                    onChange={(e) => updateProductLine(index, 'description', e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById(`quantity-${index}`)?.focus();
                      }
                    }}
                    required
                    className="min-h-[48px] w-full text-base resize-none overflow-hidden uppercase"
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
                      handleFieldHeightChange(index, `description-${index}`, newHeight);
                      // Recalculate after a short delay to ensure proper shrinking
                      setTimeout(() => recalculateRowHeight(index), 10);
                    }}
                  />
                </div>

                <div className="col-span-1">
                  <Input
                    id={`quantity-${index}`}
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => updateProductLine(index, 'quantity', parseInt(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById(`unit_price-${index}`)?.focus();
                      }
                    }}
                    required
                    className="w-20 text-base"
                    style={{ height: isClient ? (rowHeights[index] || '48px') : '48px' }}
                  />
                </div>

                <div className="col-span-1">
                  <Input
                    id={`unit_price-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unit_price || ''}
                    onChange={(e) => updateProductLine(index, 'unit_price', e.target.value ? parseFloat(e.target.value) : 0)}
                    placeholder="0"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        // Move to total price field
                        document.getElementById(`total_price-${index}`)?.focus();
                      }
                    }}
                    required
                    className="w-20 text-base text-center text-left"
                    style={{ 
                      height: isClient ? (rowHeights[index] || '48px') : '48px',
                      MozAppearance: 'textfield',
                      WebkitAppearance: 'none'
                    }}
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        // Move to vendor field (find by data attribute)
                        const vendorField = document.querySelector(`[data-vendor-row="${index}"]`) as HTMLElement;
                        vendorField?.focus();
                      }
                    }}
                    className="w-20 text-base"
                    style={{ height: isClient ? (rowHeights[index] || '48px') : '48px' }}
                  />
                </div>

                <div className="col-span-2">
                  <VendorSearch
                    value={line.vendor}
                    onSelect={(vendorName) => updateProductLine(index, 'vendor', vendorName)}
                    placeholder="Select vendor"
                    height={rowHeights[index]}
                    onHeightChange={(newHeight) => handleFieldHeightChange(index, `vendor-${index}`, newHeight)}
                    rowIndex={index}
                  />
                </div>

                <div className="col-span-2 flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => clearProductLine(index)}
                    className="text-base px-6 py-3 border border-gray-400 hover:border-gray-300 h-12"
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeProductLine(index)}
                    disabled={productLines.length <= 1}
                    className="text-base text-white bg-red-600 hover:bg-red-800 px-6 py-3 h-12"
                  >
                    Delete
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
            
            {/* Order Total Summary */}
            <div className="subtotal-section mt-6 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Subtotal:</span>
                  <span>${productLines.reduce((acc, line) => acc + line.total_price, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Tax (7.95%):</span>
                  <span>${(productLines.reduce((acc, line) => acc + line.total_price, 0) * 0.0795).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>${(productLines.reduce((acc, line) => acc + line.total_price, 0) * 1.0795).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-medium" htmlFor="delivery_method">Delivery Method *</Label>
              <Select value={formData.delivery_method} onValueChange={(value) => handleInputChange('delivery_method', value)}>
                <SelectTrigger suppressHydrationWarning>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_store_pickup">In-Store Pickup</SelectItem>
                  <SelectItem value="ship_to_customer">Ship to Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-medium" htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger suppressHydrationWarning>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-medium" htmlFor="special_requests">Special Requests</Label>
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
          backgroundColor: 'rgba(10, 10, 10, 0.9)',
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
            backgroundColor: 'rgba(17, 24, 39, 0.98)',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            maxWidth: '400px',
            width: '100%',
            border: '2px solid rgba(59, 130, 246, 0.3)',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#ffffff',
            margin: '0 0 16px 0'
          }}>
            Confirm Update
          </h3>
          <p style={{ 
            fontSize: '14px', 
            color: '#9ca3af',
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
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '6px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
            >
              Cancel
            </button>
            <button
              onClick={() => performSubmission()}
              disabled={loading}
              style={{
                padding: '8px 16px',
                border: '1px solid rgba(59, 130, 246, 0.5)',
                borderRadius: '6px',
                backgroundColor: loading ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.8)',
                color: '#ffffff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
              onMouseOver={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 1)'
              }}
              onMouseOut={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.8)'
              }}
            >
              {loading ? 'Updating...' : 'Confirm'}
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
