'use client'

import { Button } from '@/components/ui/button'
import { Edit, X } from 'lucide-react'

interface FormViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: any
  title: string
  onEdit?: () => void
}

export function FormViewDialog({ open, onOpenChange, data, title, onEdit }: FormViewDialogProps) {
  if (!data) return null

  const renderField = (label: string, value: any) => {
    if (value === null || value === undefined || value === '') return null
    
    return (
      <div className="grid grid-cols-3 gap-4 py-2 border-b border-[rgba(59, 130, 246, 0.3)]">
        <dt className="font-semibold text-sm text-[#9ca3af]">{label}</dt>
        <dd className="col-span-2 text-sm text-[#e0e0e0]">{String(value)}</dd>
      </div>
    )
  }

  const renderSection = (sectionTitle: string, fields: Record<string, any>) => {
    const hasData = Object.values(fields).some(value => 
      value !== null && value !== undefined && value !== ''
    )
    
    if (!hasData) return null
    
    return (
      <div className="mb-6">
        <h4 className="text-lg font-semibold mb-3 text-[#e0e0e0]">{sectionTitle}</h4>
        <dl className="space-y-1">
          {Object.entries(fields).map(([key, value]) => {
            if (value === null || value === undefined || value === '') return null
            
            const label = key
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
            
            return (
              <div key={key}>
                {renderField(label, value)}
              </div>
            )
          })}
        </dl>
      </div>
    )
  }

  const renderProductLines = (productLines: any[]) => {
    if (!productLines || productLines.length === 0) return null
    
    return (
      <div className="mb-6">
        <h4 className="text-lg font-semibold mb-3 text-[#e0e0e0]">Items</h4>
        <div className="space-y-3">
          {productLines.map((line, index) => (
            <div key={index} className="border border-[rgba(59, 130, 246, 0.3)] rounded-lg p-4 bg-[rgba(17, 24, 39, 0.8)]">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <span className="text-xs text-[#9ca3af]">SKU</span>
                  <p className="font-medium text-[#e0e0e0]">{line.sku}</p>
                </div>
                <div>
                  <span className="text-xs text-[#9ca3af]">Description</span>
                  <p className="font-medium text-[#e0e0e0]">{line.description}</p>
                </div>
                <div>
                  <span className="text-xs text-[#9ca3af]">Qty/Price</span>
                  <p className="font-medium text-[#e0e0e0]">{line.quantity} × ${line.unit_price}</p>
                </div>
                <div>
                  <span className="text-xs text-[#9ca3af]">Total</span>
                  <p className="font-medium text-[#e0e0e0]">${line.total_price}</p>
                </div>
                <div>
                  <span className="text-xs text-[#9ca3af]">Vendor</span>
                  <p className="font-medium text-[#e0e0e0]">{line.vendor_name || line.vendor || 'N/A'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Group fields by section
  const customerFields = {
    customer_name: data.customer_name,
    customer_email: data.customer_email,
    customer_phone: data.customer_phone,
    customer_street: data.customer_street,
    customer_city: data.customer_city,
    customer_state: data.customer_state,
    customer_zip: data.customer_zip,
  }

  const orderFields = {
    delivery_method: data.delivery_method === 'in_store_pickup' ? 'In-Store Pickup' : 'Ship to Customer',
    special_requests: data.special_requests,
    status: data.status,
    total_price: data.total_price,
  }

  // Handle different form types
  const getFormSections = () => {
    // Check if it's a special order by looking for customer fields
    if (data.customer_name || data.customer_email || data.customer_phone) {
      // Special Order form - has customer fields
      const sections = [
        { title: 'Customer Information', fields: customerFields },
        { title: 'Order Details', fields: orderFields }
      ]
      
      // Add product lines if they exist
      if (data.product_lines && Array.isArray(data.product_lines)) {
        sections.push({ title: 'Items', fields: {}, productLines: data.product_lines } as any)
      }
      
      return sections
    } else if (data.transferor_name) {
      // Inbound Transfer form
      const transferFields = {
        transferor_name: data.transferor_name,
        transferor_ffl: data.transferor_ffl,
        transferor_address: data.transferor_address,
        transferor_city: data.transferor_city,
        transferor_state: data.transferor_state,
        transferor_zip: data.transferor_zip,
        firearm_type: data.firearm_type,
        manufacturer: data.manufacturer,
        model: data.model,
        caliber: data.caliber,
        serial_number: data.serial_number,
        transfer_date: data.transfer_date,
        atf_form_type: data.atf_form_type,
        tracking_number: data.tracking_number,
        notes: data.notes,
        status: data.status,
      }
      return [{ title: 'Transfer Details', fields: transferFields }]
    } else if (data.suppressor_manufacturer) {
      // Suppressor Approval form
      const suppressorFields = {
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        customer_address: data.customer_address,
        customer_city: data.customer_city,
        customer_state: data.customer_state,
        customer_zip: data.customer_zip,
        suppressor_manufacturer: data.suppressor_manufacturer,
        suppressor_model: data.suppressor_model,
        suppressor_caliber: data.suppressor_caliber,
        suppressor_serial_number: data.suppressor_serial_number,
        trust_name: data.trust_name,
        form_type: data.form_type,
        submission_date: data.submission_date,
        approval_date: data.approval_date,
        tax_stamp_number: data.tax_stamp_number,
        examiner_name: data.examiner_name,
        status: data.status,
        notes: data.notes,
      }
      return [
        { title: 'Customer Information', fields: customerFields },
        { title: 'Suppressor Details', fields: suppressorFields }
      ]
    } else if (data.transferee_name) {
      // Outbound Transfer form
      const outboundFields = {
        transferee_name: data.transferee_name,
        transferee_ffl: data.transferee_ffl,
        transferee_address: data.transferee_address,
        transferee_city: data.transferee_city,
        transferee_state: data.transferee_state,
        transferee_zip: data.transferee_zip,
        firearm_type: data.firearm_type,
        manufacturer: data.manufacturer,
        model: data.model,
        caliber: data.caliber,
        serial_number: data.serial_number,
        transfer_date: data.transfer_date,
        atf_form_type: data.atf_form_type,
        tracking_number: data.tracking_number,
        carrier: data.carrier,
        notes: data.notes,
        status: data.status,
      }
      return [{ title: 'Transfer Details', fields: outboundFields }]
    }
    
    // Fallback - show all fields
    return [{ title: 'Form Details', fields: data }]
  }

  const sections = getFormSections()

  if (!open) return null

  return (
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
      onClick={() => onOpenChange(false)}
    >
      <div
        style={{
          backgroundColor: 'rgba(17, 24, 39, 0.98)',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
          maxWidth: '768px',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          position: 'relative',
          backdropFilter: 'blur(10px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '600', 
            color: '#e0e0e0',
            margin: 0
          }}>
            {title}
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <button
              onClick={() => onOpenChange(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#374151'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X className="h-5 w-5" style={{ color: '#9ca3af' }} />
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sections.map((section, index) => (
            <div key={index}>
              {(section as any).productLines ? (
                renderProductLines((section as any).productLines)
              ) : (
                renderSection(section.title, section.fields)
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
