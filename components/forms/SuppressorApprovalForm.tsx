'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase, type SpecialOrderForm as SpecialOrderFormType, type SuppressorApprovalForm } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import CustomerSearch from '../CustomerSearch'
import { lookupZipCode, isValidZipCode } from '@/lib/zipLookup'
import { Printer, Search } from 'lucide-react'
import { PrintSubmitDialog } from '@/components/ui/print-submit-dialog'
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

export function SuppressorApprovalForm({ initialData, onSuccess, onCancel }: SpecialOrderFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
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


  const updateProductLine = (index: number, field: keyof ProductLine, value: any) => {
    console.log('Updating product line:', { index, field, value });
    const updated = [...productLines]
    updated[index] = { ...updated[index], [field]: value }
    setProductLines(updated)
  }

  const clearProductLine = (index: number) => {
    const updated = [...productLines]
    updated[index] = {
      control_number: '',
      manufacturer: '',
      model: '',
      serial_number: '',
      order_type: '',
      unit_price: 0,
      fastbound_item_id: '',
      firearm_type: '',
      caliber: ''
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

    // For new orders, show print/submit dialog
    setShowPrintSubmitDialog(true)
  }

  const performSubmission = async () => {
    setLoading(true)

    try {
      // Calculate total price for all product lines
      const totalAmount = productLines.reduce((acc, line) => acc + line.unit_price, 0);

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
          special_requests: formData.special_requests
        });

        try {
          const { data, error } = await supabase
            .from('suppressor_approvals')
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
        // Generate order number
        let orderNumber = null
        try {
          const orderNumResponse = await fetch('/api/generate-order-number', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formType: 'suppressor_approval' })
          })
          const orderNumData = await orderNumResponse.json()
          if (orderNumData.orderNumber) {
            orderNumber = orderNumData.orderNumber
          }
        } catch (orderNumError) {
          console.error('Failed to generate order number:', orderNumError)
        }

        // Create new order
        const { error } = await supabase
          .from('suppressor_approvals')
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
            special_requests: formData.special_requests,
            status: 'completed'
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

    // Calculate scale factor - scale down based on item count to fit in half page
    const itemCount = productLines.length;
    let scaleFactor = 1.0;
    if (itemCount >= 4) {
      scaleFactor = 0.93;
    }
    if (itemCount >= 5) {
      scaleFactor = 0.90;
    }
    if (itemCount >= 6) {
      scaleFactor = 0.87;
    }
    if (itemCount >= 7) {
      scaleFactor = 0.84;
    }
    if (itemCount >= 8) {
      scaleFactor = 0.80;
    }
    if (itemCount >= 10) {
      scaleFactor = 0.78;
    }

    // Create print content with two copies on one page - each copy takes exactly half the page
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Suppressor Approval Form</title>
        <style>
          @page {
            size: letter portrait;
            margin: 0;
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
            height: 100vh;
            width: 100%;
            display: flex;
            flex-direction: column;
          }
          
          .print-copy {
            height: 50%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 0.15in 0.3in;
            overflow: hidden;
          }
          
          .print-copy:first-child {
            border-bottom: 1px dashed #999;
          }
          
          .form-content {
            width: 100%;
            max-width: 7.5in;
            height: 100%;
            display: flex;
            flex-direction: column;
            border: 1px solid #000;
            padding: 15px 20px;
            transform: scale(${scaleFactor});
            transform-origin: top center;
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
            margin-bottom: 12px;
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
            font-size: 13px;
          }
          
          .print-value {
            flex: 1;
            font-size: 13px;
          }
          
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          
          .print-table th,
          .print-table td {
            border: 1px solid #000;
            padding: 6px 8px;
            text-align: left;
            font-size: 12px;
          }
          
          .print-table th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          
          .print-total-summary {
            margin-top: auto;
            padding: 8px 12px;
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
            padding-top: 2px;
            margin-bottom: 0;
          }
        </style>
      </head>
      <body>
        <div class="page-container">
        <!-- Customer Copy (Top Half) -->
        <div class="print-copy">
          <div class="form-content">
          <div class="print-date">
            ${new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          <div class="print-header">
            <div class="print-title">Suppressor Approval Form</div>
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
                  <th style="width: 25%">Manufacturer</th>
                  <th style="width: 15%">Model</th>
                  <th style="width: 15%">Serial #</th>
                  <th style="width: 15%">Order Type</th>
                  <th style="width: 15%">Unit Price</th>
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
        </div>

        <!-- Merchant Copy (Bottom Half) -->
        <div class="print-copy">
          <div class="form-content">
          <div class="print-date">
            ${new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          <div class="print-header">
            <div class="print-title">Suppressor Approval Form</div>
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
                  <th style="width: 25%">Manufacturer</th>
                  <th style="width: 15%">Model</th>
                  <th style="width: 15%">Serial #</th>
                  <th style="width: 15%">Order Type</th>
                  <th style="width: 15%">Unit Price</th>
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
        formType: 'suppressor_approvals',
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
          <CardTitle className="font-bold underline text-6xl">Suppressor Approval Form</CardTitle>
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
                      drivers_license: customer.drivers_license || '',
                      license_expiration: customer.license_expiration || '',
                    })
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
                      placeholder="(___) ___-____"
                      className="text-base"
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

            <div className="grid grid-cols-10 gap-4 items-end mb-1">
              <div className="col-span-2"><Label className="text-lg">Control # *</Label></div>
              <div className="col-span-2"><Label className="text-lg">Manufacturer *</Label></div>
              <div className="col-span-2"><Label className="text-lg">Model *</Label></div>
              <div className="col-span-2"><Label className="text-lg">Serial # *</Label></div>
              <div className="col-span-1"><Label className="text-lg"></Label></div> {/* Clear button */}
              <div className="col-span-1"><Label className="text-lg"></Label></div> {/* Delete button header */}
            </div>
            
            {productLines.map((line, index) => (
              <div key={index} className="grid grid-cols-10 gap-4 items-center mb-2">
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
                    placeholder=""
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
                    variant="outline"
                    size="sm"
                    onClick={() => clearProductLine(index)}
                    className="text-base border border-gray-400 hover:border-gray-300"
                  >
                    Clear
                  </Button>
                </div>

                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeProductLine(index)}
                    disabled={productLines.length <= 1}
                    className="text-base text-white bg-red-600 hover:bg-red-800"
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
