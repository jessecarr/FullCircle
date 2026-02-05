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
import FFLSearch from '../FFLSearch'
import { PrintSubmitDialog } from '@/components/ui/print-submit-dialog'
import { FFLContact } from '@/lib/fflTypes'
import { COMPANY_FFL_BASE64 } from '@/lib/imageConstants'
import { useFormValidation, isNotEmpty } from '@/hooks/useFormValidation'

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
  const { collectFieldErrors, collectProductLineErrors, setErrors, hasError, clearFieldError, formatErrorMessage } = useFormValidation()
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
      unit_price: 0
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

  // Handle FFL selection from search
  const handleFFLSelect = (ffl: FFLContact) => {
    setFormData(prev => ({
      ...prev,
      transferee_ffl_name: ffl.trade_name || ffl.license_name || '',
      transferee_ffl_phone: ffl.phone || '',
      transferee_ffl_address: ffl.premise_address || '',
      transferee_ffl_city: ffl.premise_city || '',
      transferee_ffl_state: ffl.premise_state || '',
      transferee_ffl_zip: ffl.premise_zip || ''
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Collect all validation errors first, then set them all at once
    const allErrors: { field: string; label: string }[] = []

    // Define required field validations for transferor
    const transferorValidations = [
      { field: 'customer_name', label: 'Transferor Name', validate: isNotEmpty },
      { field: 'customer_phone', label: 'Transferor Phone', validate: isNotEmpty },
      { field: 'customer_street', label: 'Transferor Street', validate: isNotEmpty },
      { field: 'customer_city', label: 'Transferor City', validate: isNotEmpty },
      { field: 'customer_state', label: 'Transferor State', validate: isNotEmpty },
      { field: 'customer_zip', label: 'Transferor Zip', validate: isNotEmpty },
    ]
    allErrors.push(...collectFieldErrors(transferorValidations, formData))

    // Define required field validations for transferee
    const transfereeValidations = [
      { field: 'transferee_name', label: 'Transferee Name', validate: isNotEmpty },
      { field: 'transferee_phone', label: 'Transferee Phone', validate: isNotEmpty },
      { field: 'transferee_ffl_name', label: 'FFL Name', validate: isNotEmpty },
      { field: 'transferee_ffl_phone', label: 'FFL Phone', validate: isNotEmpty },
      { field: 'transferee_ffl_address', label: 'FFL Address', validate: isNotEmpty },
      { field: 'transferee_ffl_city', label: 'FFL City', validate: isNotEmpty },
      { field: 'transferee_ffl_state', label: 'FFL State', validate: isNotEmpty },
      { field: 'transferee_ffl_zip', label: 'FFL Zip', validate: isNotEmpty },
    ]
    allErrors.push(...collectFieldErrors(transfereeValidations, formData))

    // Validate product line required fields
    const productLineValidations = [
      { field: 'control_number', label: 'Control #', validate: isNotEmpty },
      { field: 'manufacturer', label: 'Manufacturer', validate: isNotEmpty },
      { field: 'model', label: 'Model', validate: isNotEmpty },
      { field: 'serial_number', label: 'Serial #', validate: isNotEmpty },
    ]
    const checkHasData = (line: any) => line.control_number || line.manufacturer || line.model || line.serial_number
    allErrors.push(...collectProductLineErrors(productLines, productLineValidations, checkHasData, true))

    // If there are any errors, set them all and show toast
    if (allErrors.length > 0) {
      setErrors(allErrors)
      toast({
        title: 'Validation Error',
        description: formatErrorMessage(allErrors),
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
        // Generate order number
        let orderNumber = null
        try {
          const orderNumResponse = await fetch('/api/generate-order-number', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formType: 'outbound_transfer' })
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
          .from('outbound_transfers')
          .insert([{
            order_number: orderNumber,
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

  const handlePrint = async () => {
    // Use embedded base64 FFL - guaranteed to work in print window
    const fflSrc = COMPANY_FFL_BASE64;
    
    // Helper to generate transferor section (full or limited for packing slip)
    const generateTransferorSection = (isPackingSlip: boolean) => {
      if (isPackingSlip) {
        // Packing Slip: Only name and phone in clean 2-column layout
        return `
          <div class="section-box">
            <div class="section-title">Transferor</div>
            <div class="form-grid">
              <div class="form-field">
                <label>Name</label>
                <div class="input-box">${formData.customer_name || ''}</div>
              </div>
              <div class="form-field">
                <label>Phone</label>
                <div class="input-box">${formatPhoneNumber(formData.customer_phone) || ''}</div>
              </div>
            </div>
          </div>
        `
      }
      // Full Circle Copy / Customer Copy: All fields in clean layout matching the form
      return `
        <div class="section-box">
          <div class="section-title">Transferor</div>
          <div class="form-grid">
            <div class="form-column">
              <div class="form-field">
                <label>Name</label>
                <div class="input-box">${formData.customer_name || ''}</div>
              </div>
              <div class="form-field">
                <label>Phone</label>
                <div class="input-box">${formatPhoneNumber(formData.customer_phone) || ''}</div>
              </div>
              <div class="form-field">
                <label>Email</label>
                <div class="input-box">${formData.customer_email || ''}</div>
              </div>
              <div class="form-field-row">
                <div class="form-field half">
                  <label>Driver's License</label>
                  <div class="input-box">${formData.drivers_license || ''}</div>
                </div>
                <div class="form-field half">
                  <label>License Expiration</label>
                  <div class="input-box">${formData.license_expiration ? new Date(formData.license_expiration).toLocaleDateString() : ''}</div>
                </div>
              </div>
            </div>
            <div class="form-column">
              <div class="form-field">
                <label>Street Address</label>
                <div class="input-box textarea">${formData.customer_street || ''}</div>
              </div>
              <div class="form-field-row thirds">
                <div class="form-field">
                  <label>Zip</label>
                  <div class="input-box">${formData.customer_zip || ''}</div>
                </div>
                <div class="form-field">
                  <label>State</label>
                  <div class="input-box">${formData.customer_state || ''}</div>
                </div>
                <div class="form-field">
                  <label>City</label>
                  <div class="input-box">${formData.customer_city || ''}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `
    }

    // Helper to generate transferee section - matches form layout
    const generateTransfereeSection = () => `
      <div class="section-box">
        <div class="section-title">Transferee</div>
        <div class="form-grid">
          <div class="form-field">
            <label>Transferee Name</label>
            <div class="input-box">${formData.transferee_name || ''}</div>
          </div>
          <div class="form-field">
            <label>Transferee Phone</label>
            <div class="input-box">${formatPhoneNumber(formData.transferee_phone) || ''}</div>
          </div>
        </div>
        <div class="subsection-title">FFL Information</div>
        <div class="form-grid">
          <div class="form-column">
            <div class="form-field">
              <label>FFL Name</label>
              <div class="input-box">${formData.transferee_ffl_name || ''}</div>
            </div>
            <div class="form-field">
              <label>FFL Phone</label>
              <div class="input-box">${formatPhoneNumber(formData.transferee_ffl_phone) || ''}</div>
            </div>
          </div>
          <div class="form-column">
            <div class="form-field">
              <label>Street Address</label>
              <div class="input-box textarea">${formData.transferee_ffl_address || ''}</div>
            </div>
            <div class="form-field-row thirds">
              <div class="form-field">
                <label>Zip</label>
                <div class="input-box">${formData.transferee_ffl_zip || ''}</div>
              </div>
              <div class="form-field">
                <label>State</label>
                <div class="input-box">${formData.transferee_ffl_state || ''}</div>
              </div>
              <div class="form-field">
                <label>City</label>
                <div class="input-box">${formData.transferee_ffl_city || ''}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `

    // Helper to generate items section
    const generateItemsSection = () => `
      <div class="section-box">
        <div class="section-title">Transfer Items</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Control #</th>
              <th>Manufacturer</th>
              <th>Model</th>
              <th>Serial #</th>
            </tr>
          </thead>
          <tbody>
            ${productLines.map((line) => `
              <tr>
                <td>${line.control_number || ''}</td>
                <td>${line.manufacturer || ''}</td>
                <td>${line.model || ''}</td>
                <td>${line.serial_number || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `

    // Helper to generate disposition section (always shows with space for handwriting)
    const generateDispositionSection = () => `
      <div class="section-box">
        <div class="section-title">Disposition</div>
        <div class="form-field" style="max-width: 250px;">
          <label>Disposition Date</label>
          <div class="input-box">${formData.disposition_date ? new Date(formData.disposition_date).toLocaleDateString() : ''}</div>
        </div>
      </div>
    `

    // Helper to generate a complete page
    const generatePage = (copyType: string, isPackingSlip: boolean = false) => `
      <div class="page">
        <div class="print-header">
          <div class="print-date">
            ${new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          <div class="print-title">Outbound Transfer Form</div>
          <div class="copy-type">${copyType}</div>
        </div>

        ${generateTransferorSection(isPackingSlip)}
        ${generateTransfereeSection()}
        ${generateItemsSection()}
        ${generateDispositionSection()}
      </div>
    `

    // Helper to generate the Company FFL page (FFL image only, no header)
    const generateCompanyFFLPage = () => `
      <div class="page ffl-page">
        ${fflSrc ? `
          <div class="ffl-image-container" style="margin-top: 0; padding-top: 20px;">
            <img src="${fflSrc}" alt="Company FFL" />
          </div>
        ` : `
          <div class="ffl-notice">
            <p>Please attach a copy of your company's FFL document here, or configure it in:</p>
            <p><strong>public/company-ffl.png</strong></p>
            <p class="ffl-instructions">To add your FFL: Save your FFL as an image file named "company-ffl.png" in the public folder of your project.</p>
          </div>
          <div class="ffl-image-container">
            <div class="ffl-placeholder" style="display:flex;">
              <p>FFL Image Not Found</p>
              <p class="small">Add your FFL image to: public/company-ffl.png</p>
            </div>
          </div>
        `}
      </div>
    `

    // Create print content with 4 pages
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Outbound Transfer Form</title>
        <style>
          @page {
            size: portrait;
            margin: 0.5in;
          }
          
          @media print {
            .page {
              page-break-after: always;
            }
            .page:last-child {
              page-break-after: avoid;
            }
          }
          
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #1a1a1a;
            background: white;
            font-size: 11px;
            line-height: 1.4;
          }
          
          .page {
            padding: 20px;
            max-width: 8in;
            margin: 0 auto;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 2px solid #e5e5e5;
          }
          
          .print-date {
            font-size: 9px;
            color: #666;
            margin-bottom: 4px;
          }
          
          .print-title {
            font-size: 20px;
            font-weight: 700;
            color: #111;
            margin-bottom: 4px;
          }
          
          .copy-type {
            font-size: 12px;
            font-weight: 600;
            color: #555;
            background: #f5f5f5;
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
          }
          
          .section-box {
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 12px 14px;
            margin-bottom: 12px;
            background: #fafafa;
          }
          
          .section-title {
            font-size: 13px;
            font-weight: 700;
            color: #111;
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 1px solid #ddd;
          }
          
          .subsection-title {
            font-size: 11px;
            font-weight: 600;
            color: #444;
            margin: 12px 0 8px 0;
            padding-top: 8px;
            border-top: 1px dashed #ddd;
          }
          
          .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          
          .form-column {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .form-field {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
          
          .form-field label {
            font-size: 9px;
            font-weight: 600;
            color: #555;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          
          .input-box {
            background: white;
            border: 1px solid #d0d0d0;
            border-radius: 4px;
            padding: 6px 8px;
            font-size: 11px;
            min-height: 28px;
            color: #111;
          }
          
          .input-box.textarea {
            min-height: 50px;
            white-space: pre-wrap;
          }
          
          .form-field-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          
          .form-field-row.thirds {
            grid-template-columns: 1fr 1fr 1fr;
          }
          
          .form-field.half {
            flex: 1;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 10px;
          }
          
          .items-table th,
          .items-table td {
            border: 1px solid #d0d0d0;
            padding: 8px 10px;
            text-align: left;
          }
          
          .items-table th {
            background: #f0f0f0;
            font-weight: 600;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            color: #444;
          }
          
          .items-table td {
            background: white;
          }
          
          .items-table tr:nth-child(even) td {
            background: #fafafa;
          }
          
          /* Company FFL Page Styles */
          .ffl-page .print-header {
            border-bottom: 2px solid #3b82f6;
          }
          
          .ffl-page .copy-type {
            background: #dbeafe;
            color: #1e40af;
          }
          
          .ffl-notice {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 11px;
          }
          
          .ffl-notice p {
            margin: 8px 0;
          }
          
          .ffl-instructions {
            font-size: 10px;
            color: #888;
            font-style: italic;
          }
          
          .ffl-image-container {
            text-align: center;
            padding: 20px;
            border: 2px dashed #ddd;
            border-radius: 8px;
            margin: 20px 0;
            min-height: 400px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .ffl-image-container img {
            max-width: 100%;
            max-height: 900px;
            border: 1px solid #ddd;
          }
          
          .ffl-placeholder {
            display: none;
            flex-direction: column;
            align-items: center;
            color: #999;
          }
          
          .ffl-placeholder .small {
            font-size: 10px;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        ${generatePage('Full Circle Copy', false)}
        ${generatePage('Customer Copy', false)}
        ${generatePage('Packing Slip', true)}
        ${generateCompanyFFLPage()}
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
        formType: 'outbound_transfers',
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
          <CardTitle className="font-bold underline text-6xl">Outbound Transfer Form</CardTitle>
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
                  Search Transferor Information
                </div>
                <p className="text-base mb-3" style={{ color: '#dbeafe' }}>
                  Search for existing transferors by name, email, or phone. Select a transferor to auto-fill their information.
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
                    <div className="field-error-wrapper">
                      {hasError('customer_name') && <span className="field-error-tooltip">Required</span>}
                      <Input
                        id="customer_name"
                        value={formData.customer_name}
                        onChange={(e) => {
                          handleInputChange('customer_name', e.target.value.toUpperCase())
                          clearFieldError('customer_name')
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById('customer_phone')?.focus();
                          }
                        }}
                        className={`text-base uppercase ${hasError('customer_name') ? 'field-error' : ''}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-medium" htmlFor="customer_phone">Phone *</Label>
                    <div className="field-error-wrapper">
                      {hasError('customer_phone') && <span className="field-error-tooltip">Required</span>}
                      <Input
                        id="customer_phone"
                        type="tel"
                        value={formatPhoneNumber(formData.customer_phone)}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          handleInputChange('customer_phone', digits);
                          clearFieldError('customer_phone')
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById('customer_email')?.focus();
                          }
                        }}
                        maxLength={14}
                        placeholder="(___) ___-____"
                        className={`text-base ${hasError('customer_phone') ? 'field-error' : ''}`}
                      />
                    </div>
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
                    <Label className="text-medium" htmlFor="customer_street">Street Address *</Label>
                    <div className="field-error-wrapper">
                      {hasError('customer_street') && <span className="field-error-tooltip">Required</span>}
                      <Textarea
                        id="customer_street"
                        value={formData.customer_street}
                        onChange={(e) => {
                          handleInputChange('customer_street', e.target.value.toUpperCase())
                          clearFieldError('customer_street')
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById('customer_zip')?.focus();
                          }
                        }}
                        rows={2}
                        className={`text-base uppercase resize-none ${hasError('customer_street') ? 'field-error' : ''}`}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label className="text-medium" htmlFor="customer_zip">Zip *</Label>
                      <div className="field-error-wrapper">
                        {hasError('customer_zip') && <span className="field-error-tooltip">Required</span>}
                        <Input
                          id="customer_zip"
                          value={formData.customer_zip}
                          onChange={(e) => {
                            handleZipCodeChange(e.target.value.toUpperCase())
                            clearFieldError('customer_zip')
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              document.getElementById('customer_state')?.focus();
                            }
                          }}
                          className={`text-base uppercase ${hasError('customer_zip') ? 'field-error' : ''}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-medium" htmlFor="customer_state">State *</Label>
                      <div className="field-error-wrapper">
                        {hasError('customer_state') && <span className="field-error-tooltip">Required</span>}
                        <Input
                          id="customer_state"
                          value={formData.customer_state}
                          onChange={(e) => {
                            handleInputChange('customer_state', e.target.value.toUpperCase())
                            clearFieldError('customer_state')
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              document.getElementById('customer_city')?.focus();
                            }
                          }}
                          className={`text-base uppercase ${hasError('customer_state') ? 'field-error' : ''}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-medium" htmlFor="customer_city">City *</Label>
                      <div className="field-error-wrapper">
                        {hasError('customer_city') && <span className="field-error-tooltip">Required</span>}
                        <Input
                          id="customer_city"
                          value={formData.customer_city}
                          onChange={(e) => {
                            handleInputChange('customer_city', e.target.value.toUpperCase())
                            clearFieldError('customer_city')
                          }}
                          className={`text-base uppercase ${hasError('customer_city') ? 'field-error' : ''}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-6 mb-6">
            <div className="space-y-4">
              <h3 className="text-xl font-bold underline mb-4">Transferee</h3>
              
              {/* Transferee Name and Phone - First */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label className="text-medium" htmlFor="transferee_name">Transferee Name *</Label>
                  <div className="field-error-wrapper">
                    {hasError('transferee_name') && <span className="field-error-tooltip">Required</span>}
                    <Input
                      id="transferee_name"
                      value={formData.transferee_name}
                      onChange={(e) => {
                        handleInputChange('transferee_name', e.target.value.toUpperCase())
                        clearFieldError('transferee_name')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          document.getElementById('transferee_phone')?.focus();
                        }
                      }}
                      className={`uppercase text-base ${hasError('transferee_name') ? 'field-error' : ''}`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-medium" htmlFor="transferee_phone">Transferee Phone *</Label>
                  <div className="field-error-wrapper">
                    {hasError('transferee_phone') && <span className="field-error-tooltip">Required</span>}
                    <Input
                      id="transferee_phone"
                      type="tel"
                      value={formatPhoneNumber(formData.transferee_phone)}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '');
                        handleInputChange('transferee_phone', digits);
                        clearFieldError('transferee_phone')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          document.getElementById('transferee_ffl_name')?.focus();
                        }
                      }}
                      maxLength={14}
                      placeholder="(123) 456-7890"
                      className={`text-base ${hasError('transferee_phone') ? 'field-error' : ''}`}
                    />
                  </div>
                </div>
              </div>

              {/* FFL Search - Styled like FastBound search */}
              <div className="p-4 rounded-lg mb-4" style={{
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                padding: '1rem',
                borderRadius: '0.5rem'
              }}>
                <div className="text-xl font-semibold flex items-center gap-2 mb-3" style={{ color: '#dbeafe' }}>
                  <Search className="h-6 w-6" />
                  Search FFL Database
                </div>
                <p className="text-base mb-3" style={{ color: '#dbeafe' }}>
                  Search for an FFL by number (X-XX-XXXXX) or business name. Select an FFL to auto-fill the information below.
                </p>
                <FFLSearch
                  onSelect={handleFFLSelect}
                  label=""
                  placeholder="Search by FFL number or business name..."
                  showSyncButton={true}
                />
              </div>

              {/* FFL Information - Styled like Customer Info section */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-medium" htmlFor="transferee_ffl_name">FFL Name *</Label>
                    <div className="field-error-wrapper">
                      {hasError('transferee_ffl_name') && <span className="field-error-tooltip">Required</span>}
                      <Input
                        id="transferee_ffl_name"
                        value={formData.transferee_ffl_name}
                        onChange={(e) => {
                          handleInputChange('transferee_ffl_name', e.target.value.toUpperCase())
                          clearFieldError('transferee_ffl_name')
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById('transferee_ffl_phone')?.focus();
                          }
                        }}
                        className={`text-base uppercase ${hasError('transferee_ffl_name') ? 'field-error' : ''}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-medium" htmlFor="transferee_ffl_phone">FFL Phone *</Label>
                    <div className="field-error-wrapper">
                      {hasError('transferee_ffl_phone') && <span className="field-error-tooltip">Required</span>}
                      <Input
                        id="transferee_ffl_phone"
                        type="tel"
                        value={formatPhoneNumber(formData.transferee_ffl_phone)}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          handleInputChange('transferee_ffl_phone', digits);
                          clearFieldError('transferee_ffl_phone')
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById('transferee_ffl_address')?.focus();
                          }
                        }}
                        maxLength={14}
                        placeholder="(123) 456-7890"
                        className={`text-base ${hasError('transferee_ffl_phone') ? 'field-error' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-medium" htmlFor="transferee_ffl_address">Street Address *</Label>
                    <div className="field-error-wrapper">
                      {hasError('transferee_ffl_address') && <span className="field-error-tooltip">Required</span>}
                      <Textarea
                        id="transferee_ffl_address"
                        value={formData.transferee_ffl_address}
                        onChange={(e) => {
                          handleInputChange('transferee_ffl_address', e.target.value.toUpperCase())
                          clearFieldError('transferee_ffl_address')
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById('transferee_ffl_zip')?.focus();
                          }
                        }}
                        rows={2}
                        className={`text-base uppercase resize-none ${hasError('transferee_ffl_address') ? 'field-error' : ''}`}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label className="text-medium" htmlFor="transferee_ffl_zip">Zip *</Label>
                      <div className="field-error-wrapper">
                        {hasError('transferee_ffl_zip') && <span className="field-error-tooltip">Required</span>}
                        <Input
                          id="transferee_ffl_zip"
                          value={formData.transferee_ffl_zip}
                          onChange={(e) => {
                            handleTransfereeZipCodeChange(e.target.value.toUpperCase())
                            clearFieldError('transferee_ffl_zip')
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              document.getElementById('transferee_ffl_state')?.focus();
                            }
                          }}
                          placeholder="Zip"
                          maxLength={5}
                          className={`text-base uppercase ${hasError('transferee_ffl_zip') ? 'field-error' : ''}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-medium" htmlFor="transferee_ffl_state">State *</Label>
                      <div className="field-error-wrapper">
                        {hasError('transferee_ffl_state') && <span className="field-error-tooltip">Required</span>}
                        <Input
                          id="transferee_ffl_state"
                          value={formData.transferee_ffl_state}
                          onChange={(e) => {
                            handleInputChange('transferee_ffl_state', e.target.value.toUpperCase())
                            clearFieldError('transferee_ffl_state')
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              document.getElementById('transferee_ffl_city')?.focus();
                            }
                          }}
                          className={`text-base uppercase ${hasError('transferee_ffl_state') ? 'field-error' : ''}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-medium" htmlFor="transferee_ffl_city">City *</Label>
                      <div className="field-error-wrapper">
                        {hasError('transferee_ffl_city') && <span className="field-error-tooltip">Required</span>}
                        <Input
                          id="transferee_ffl_city"
                          value={formData.transferee_ffl_city}
                          onChange={(e) => {
                            handleInputChange('transferee_ffl_city', e.target.value.toUpperCase())
                            clearFieldError('transferee_ffl_city')
                          }}
                          className={`text-base uppercase ${hasError('transferee_ffl_city') ? 'field-error' : ''}`}
                        />
                      </div>
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
                <div className="col-span-2 field-error-wrapper">
                  {hasError(`control_number-${index}`) && <span className="field-error-tooltip">Required</span>}
                  <Textarea
                    id={`control_number-${index}`}
                    value={line.control_number}
                    onChange={(e) => {
                      console.log('Control Number input changed:', e.target.value);
                      updateProductLine(index, 'control_number', e.target.value.toUpperCase());
                      clearFieldError(`control_number-${index}`)
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
                    className={`text-base w-full min-h-[48px] resize-none overflow-hidden uppercase text-center text-left ${hasError(`control_number-${index}`) ? 'field-error' : ''}`}
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

                <div className="col-span-2 field-error-wrapper">
                  {hasError(`manufacturer-${index}`) && <span className="field-error-tooltip">Required</span>}
                  <Textarea
                    id={`manufacturer-${index}`}
                    value={line.manufacturer}
                    onChange={(e) => {
                      updateProductLine(index, 'manufacturer', e.target.value.toUpperCase())
                      clearFieldError(`manufacturer-${index}`)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById(`model-${index}`)?.focus();
                      }
                    }}
                    className={`min-h-[48px] w-full text-base resize-none overflow-hidden uppercase text-left ${hasError(`manufacturer-${index}`) ? 'field-error' : ''}`}
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

                <div className="col-span-2 field-error-wrapper">
                  {hasError(`model-${index}`) && <span className="field-error-tooltip">Required</span>}
                  <Textarea
                    id={`model-${index}`}
                    value={line.model}
                    onChange={(e) => {
                      updateProductLine(index, 'model', e.target.value.toUpperCase())
                      clearFieldError(`model-${index}`)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById(`serial_number-${index}`)?.focus();
                      }
                    }}
                    className={`min-h-[48px] w-full text-base resize-none overflow-hidden uppercase text-left ${hasError(`model-${index}`) ? 'field-error' : ''}`}
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

                <div className="col-span-2 field-error-wrapper">
                  {hasError(`serial_number-${index}`) && <span className="field-error-tooltip">Required</span>}
                  <Textarea
                    id={`serial_number-${index}`}
                    value={line.serial_number}
                    onChange={(e) => {
                      updateProductLine(index, 'serial_number', e.target.value.toUpperCase())
                      clearFieldError(`serial_number-${index}`)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const nextIndex = index + 1;
                        if (nextIndex < productLines.length) {
                          document.getElementById(`control_number-${nextIndex}`)?.focus();
                        }
                      }
                    }}
                    className={`min-h-[48px] w-full text-base resize-none overflow-hidden uppercase text-left ${hasError(`serial_number-${index}`) ? 'field-error' : ''}`}
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
                    onClick={() => clearProductLine(index)}
                    className="text-base px-8 py-3 border border-gray-400 hover:border-gray-300 h-12"
                  >
                    Clear
                  </Button>
                </div>

                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeProductLine(index)}
                    disabled={productLines.length <= 1}
                    className="text-base text-white bg-red-600 hover:bg-red-800 px-8 py-3 h-12"
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
