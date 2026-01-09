'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Edit, X, ChevronLeft, ChevronRight } from 'lucide-react'

interface FormViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: any
  title: string
  onEdit?: () => void
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
}

export function FormViewDialog({ open, onOpenChange, data, title, onEdit, onPrevious, onNext, hasPrevious, hasNext }: FormViewDialogProps) {
  // Add Escape and arrow key handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return
      
      if (e.key === 'Escape') {
        onOpenChange(false)
      } else if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) {
        onPrevious()
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext()
      }
    }

    if (open) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onOpenChange, hasPrevious, hasNext, onPrevious, onNext])

  if (!data) return null

  const renderField = (label: string, value: any) => {
    if (value === null || value === undefined || value === '') return null
    
    return (
      <div className="grid grid-cols-3 gap-4 py-3 px-4 rounded-lg bg-[rgba(59, 130, 246, 0.05)] border border-[rgba(59, 130, 246, 0.2)] hover:bg-[rgba(59, 130, 246, 0.08)] transition-all duration-200">
        <dt className="font-semibold text-[#dbeafe]" style={{ fontSize: '18px' }}>{label}</dt>
        <dd className="col-span-2 text-[#e0e0e0] font-medium" style={{ fontSize: '14px' }}>{String(value)}</dd>
      </div>
    )
  }

  const renderSection = (sectionTitle: string, fields: Record<string, any>) => {
    const hasData = Object.values(fields).some(value => 
      value !== null && value !== undefined && value !== ''
    )
    
    if (!hasData) return null
    
    return (
      <div className="mb-8">
        <h4 className="text-xl font-bold mb-4 text-[#dbeafe] pb-2 border-b-2 border-[rgba(59, 130, 246, 0.3)]">{sectionTitle}</h4>
        <dl className="space-y-3">
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

  const renderProductLines = (productLines: any[], formType?: string) => {
    if (!productLines || productLines.length === 0) return null
    
    return (
      <div className="mb-8">
        <h4 className="text-xl font-bold mb-4 text-[#dbeafe] pb-2 border-b-2 border-[rgba(59, 130, 246, 0.3)]">
          {formType === 'inbound_transfer' ? 'Transfer Items' : 'Items'}
        </h4>
        <div className="space-y-3">
          {productLines.map((line, index) => (
            <div key={index} className="border border-[rgba(59, 130, 246, 0.3)] rounded-lg p-4 landing-card">
              {formType === 'inbound_transfer' ? (
                // Inbound Transfer fields
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div>
                    <span className="text-xs text-[#9ca3af]">Control #</span>
                    <p className="font-medium text-[#e0e0e0]">{line.control_number || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#9ca3af]">Manufacturer</span>
                    <p className="font-medium text-[#e0e0e0]">{line.manufacturer || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#9ca3af]">Model</span>
                    <p className="font-medium text-[#e0e0e0]">{line.model || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#9ca3af]">Serial #</span>
                    <p className="font-medium text-[#e0e0e0]">{line.serial_number || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#9ca3af]">Order Type</span>
                    <p className="font-medium text-[#e0e0e0]">{line.order_type || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#9ca3af]">Unit Price</span>
                    <p className="font-medium text-[#e0e0e0]">{line.unit_price ? (typeof line.unit_price === 'string' && line.unit_price.includes('$') ? line.unit_price : `$${line.unit_price.toFixed(2)}`) : '-'}</p>
                  </div>
                </div>
              ) : (
                // Special Order fields
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <span className="text-xs text-[#9ca3af]">SKU</span>
                    <p className="font-medium text-[#e0e0e0]">{line.sku || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#9ca3af]">Description</span>
                    <p className="font-medium text-[#e0e0e0]">{line.description || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#9ca3af]">Qty/Price</span>
                    <p className="font-medium text-[#e0e0e0]">{line.quantity || 0} × {line.unit_price ? (typeof line.unit_price === 'string' && line.unit_price.includes('$') ? line.unit_price : `$${line.unit_price.toFixed(2)}`) : '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#9ca3af]">Total</span>
                    <p className="font-medium text-[#e0e0e0]">{line.total_price ? (typeof line.total_price === 'string' && line.total_price.includes('$') ? line.total_price : `$${line.total_price.toFixed(2)}`) : '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#9ca3af]">Vendor</span>
                    <p className="font-medium text-[#e0e0e0]">{line.vendor_name || line.vendor || 'N/A'}</p>
                  </div>
                </div>
              )}
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
    payment: data.payment ? (typeof data.payment === 'string' ? data.payment.charAt(0).toUpperCase() + data.payment.slice(1).replace('_', ' ') : data.payment) : '',
    special_requests: data.special_requests,
    status: data.status,
    total_price: data.total_price,
  }

  // Handle different form types
  const getFormSections = () => {
    // Check form type based on _formType if available, otherwise fall back to field detection
    const formType = data._formType || ''
    
    if (formType === 'inbound_transfers' || (data.customer_name && !data.delivery_method && !data.payment)) {
      // Inbound Transfer form - has customer fields but no delivery/payment
      const transferFields = {
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        customer_street: data.customer_street,
        customer_city: data.customer_city,
        customer_state: data.customer_state,
        customer_zip: data.customer_zip,
        status: data.status,
        special_requests: data.special_requests,
      }
      
      const sections = [
        { title: 'Customer Information', fields: transferFields }
      ]
      
      // Add product lines if they exist
      if (data.product_lines && Array.isArray(data.product_lines)) {
        sections.push({ title: 'Transfer Items', fields: {}, productLines: data.product_lines, formType: 'inbound_transfer' } as any)
      }
      
      return sections
    } else if (data.customer_name || data.customer_email || data.customer_phone) {
      // Special Order form - has customer fields and delivery/payment
      const sections = [
        { title: 'Customer Information', fields: customerFields },
        { title: 'Order Details', fields: orderFields }
      ]
      
      // Add product lines if they exist
      if (data.product_lines && Array.isArray(data.product_lines)) {
        sections.push({ title: 'Items', fields: {}, productLines: data.product_lines, formType: 'special_order' } as any)
      }
      
      return sections
    } else if (data.transferor_name) {
      // Inbound Transfer form (old format)
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
      {/* Left Navigation Arrow */}
      {hasPrevious && onPrevious && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPrevious()
          }}
          style={{
            background: 'rgba(59, 130, 246, 0.9)',
            border: '1px solid rgba(59, 130, 246, 0.6)',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            marginRight: '16px',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 1)'
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.border = '1px solid rgba(59, 130, 246, 0.8)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.9)'
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.border = '1px solid rgba(59, 130, 246, 0.6)'
          }}
          title="Previous (←)"
        >
          <ChevronLeft className="h-6 w-6" style={{ color: '#ffffff' }} />
        </button>
      )}

      <div
        className="FormViewDialog"
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
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {sections.map((section, index) => (
            <div key={index} className="transition-all duration-300">
              {(section as any).productLines ? (
                renderProductLines((section as any).productLines, (section as any).formType)
              ) : (
                renderSection((section as any).title, (section as any).fields)
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Navigation Arrow */}
      {hasNext && onNext && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNext()
          }}
          style={{
            background: 'rgba(59, 130, 246, 0.9)',
            border: '1px solid rgba(59, 130, 246, 0.6)',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            marginLeft: '16px',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 1)'
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.border = '1px solid rgba(59, 130, 246, 0.8)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.9)'
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.border = '1px solid rgba(59, 130, 246, 0.6)'
          }}
          title="Next (→)"
        >
          <ChevronRight className="h-6 w-6" style={{ color: '#ffffff' }} />
        </button>
      )}
    </div>
  )
}
