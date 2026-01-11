'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Edit, X, ChevronLeft, ChevronRight, User, Package, FileText, Truck, Printer, Mail, Check, Circle } from 'lucide-react'

interface FormViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: any
  title: string
  formType?: string
  onEdit?: () => void
  onPrint?: () => void
  onEmail?: () => void
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
  currentIndex?: number
  totalCount?: number
  onToggleItemCompleted?: (itemIndex: number, completed: boolean) => void
}

const formatPhoneNumber = (phone: string): string => {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

const formatCurrency = (value: any): string => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string' && value.includes('$')) return value
  const num = typeof value === 'number' ? value : parseFloat(value)
  return isNaN(num) ? '-' : `$${num.toFixed(2)}`
}

const formatStatus = (status: string): string => {
  if (!status) return ''
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')
}

export function FormViewDialog({ open, onOpenChange, data, title, formType, onEdit, onPrint, onEmail, onPrevious, onNext, hasPrevious, hasNext, currentIndex, totalCount, onToggleItemCompleted }: FormViewDialogProps) {
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

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'ordered': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'received': case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'shipped': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'sold': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
      case 'returned': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const renderCustomerSection = () => {
    const hasCustomerData = data.customer_name || data.customer_phone || data.customer_email
    if (!hasCustomerData) return null

    const address = [
      data.customer_street,
      data.customer_city,
      data.customer_state,
      data.customer_zip
    ].filter(Boolean).join(', ')

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-blue-500/30">
          <User className="h-5 w-5 text-blue-400" />
          <h4 className="text-lg font-semibold text-blue-300">Customer Information</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            {data.customer_name && (
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">Name</span>
                <p className="text-white font-medium text-lg">{data.customer_name}</p>
              </div>
            )}
            {data.customer_phone && (
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">Phone</span>
                <p className="text-white font-medium">{formatPhoneNumber(data.customer_phone)}</p>
              </div>
            )}
            {data.customer_email && !data.customer_email.includes('@placeholder.local') && (
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">Email</span>
                <p className="text-white font-medium">{data.customer_email}</p>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {address && (
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">Address</span>
                <p className="text-white font-medium">{address}</p>
              </div>
            )}
            {(data.drivers_license || data.license_expiration) && (
              <div className="grid grid-cols-2 gap-3">
                {data.drivers_license && (
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Driver's License</span>
                    <p className="text-white font-medium">{data.drivers_license}</p>
                  </div>
                )}
                {data.license_expiration && (
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Expiration</span>
                    <p className="text-white font-medium">{data.license_expiration}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderOrderDetails = () => {
    const hasOrderData = data.delivery_method || data.payment || data.special_requests || data.total_price
    if (!hasOrderData) return null

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-blue-500/30">
          <FileText className="h-5 w-5 text-blue-400" />
          <h4 className="text-lg font-semibold text-blue-300">Order Details</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {data.delivery_method && (
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Delivery Method</span>
              <p className="text-white font-medium">
                {data.delivery_method === 'in_store_pickup' ? 'In-Store Pickup' : 'Ship to Customer'}
              </p>
            </div>
          )}
          {data.payment && (
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Payment</span>
              <p className="text-white font-medium">{formatStatus(data.payment)}</p>
            </div>
          )}
          {data.total_price !== undefined && (
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Total</span>
              <p className="text-white font-semibold text-lg">{formatCurrency(data.total_price)}</p>
            </div>
          )}
          {data.special_requests && (
            <div className="col-span-2">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Special Requests</span>
              <p className="text-white font-medium">{data.special_requests}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderTransfereeSection = () => {
    if (!data.transferee_name && !data.transferee_ffl_name) return null

    const address = [
      data.transferee_ffl_address || data.transferee_street,
      data.transferee_ffl_city || data.transferee_city,
      data.transferee_ffl_state || data.transferee_state,
      data.transferee_ffl_zip || data.transferee_zip
    ].filter(Boolean).join(', ')

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-blue-500/30">
          <Truck className="h-5 w-5 text-blue-400" />
          <h4 className="text-lg font-semibold text-blue-300">Transferee Information</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            {(data.transferee_name) && (
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">Transferee Name</span>
                <p className="text-white font-medium">{data.transferee_name}</p>
              </div>
            )}
            {(data.transferee_phone) && (
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">Transferee Phone</span>
                <p className="text-white font-medium">{formatPhoneNumber(data.transferee_phone)}</p>
              </div>
            )}
            {(data.transferee_ffl_name) && (
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">FFL Name</span>
                <p className="text-white font-medium">{data.transferee_ffl_name}</p>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {(data.transferee_ffl_phone) && (
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">FFL Phone</span>
                <p className="text-white font-medium">{formatPhoneNumber(data.transferee_ffl_phone)}</p>
              </div>
            )}
            {address && (
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">FFL Address</span>
                <p className="text-white font-medium">{address}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderProductLines = () => {
    if (!data.product_lines || !Array.isArray(data.product_lines) || data.product_lines.length === 0) return null

    const currentFormType = data._formType || ''
    const isConsignment = currentFormType === 'consignment_forms'
    const isInbound = currentFormType === 'inbound_transfers'
    const isOutbound = currentFormType === 'outbound_transfers'
    const isSuppressor = currentFormType === 'suppressor_approvals'
    const isSpecialOrder = currentFormType === 'special_orders'

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-blue-500/30">
          <Package className="h-5 w-5 text-blue-400" />
          <h4 className="text-lg font-semibold text-blue-300">
            {isConsignment ? 'Consignment Items' : isInbound || isOutbound ? 'Transfer Items' : isSuppressor ? 'Suppressor Items' : 'Order Items'}
          </h4>
        </div>
        <div className="space-y-3">
          {data.product_lines.map((line: any, index: number) => (
            <div key={index} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              {isConsignment ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <span className="text-xs text-gray-400">Control #</span>
                    <p className="text-white font-medium text-sm">{line.control_number || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Manufacturer</span>
                    <p className="text-white font-medium text-sm">{line.manufacturer || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Model</span>
                    <p className="text-white font-medium text-sm">{line.model || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Serial #</span>
                    <p className="text-white font-medium text-sm">{line.serial_number || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Type</span>
                    <p className="text-white font-medium text-sm">{line.type || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Caliber</span>
                    <p className="text-white font-medium text-sm">{line.caliber || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Method</span>
                    <p className="text-white font-medium text-sm">{line.method || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Sale Price</span>
                    <p className="text-white font-medium text-sm">{formatCurrency(line.sale_price)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">After Fee</span>
                    <p className="text-green-400 font-semibold text-sm">{formatCurrency(line.after_fee)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Check #</span>
                    <p className="text-white font-medium text-sm">{line.check_number || '-'}</p>
                  </div>
                </div>
              ) : isInbound || isOutbound || isSuppressor ? (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div>
                    <span className="text-xs text-gray-400">Control #</span>
                    <p className="text-white font-medium text-sm">{line.control_number || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Manufacturer</span>
                    <p className="text-white font-medium text-sm">{line.manufacturer || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Model</span>
                    <p className="text-white font-medium text-sm">{line.model || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Serial #</span>
                    <p className="text-white font-medium text-sm">{line.serial_number || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Order Type</span>
                    <p className="text-white font-medium text-sm">{line.order_type || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Unit Price</span>
                    <p className="text-white font-medium text-sm">{formatCurrency(line.unit_price)}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 flex-1">
                    <div>
                      <span className="text-xs text-gray-400">SKU</span>
                      <p className="text-white font-medium text-sm">{line.sku || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Description</span>
                      <p className="text-white font-medium text-sm">{line.description || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Qty × Price</span>
                      <p className="text-white font-medium text-sm">{line.quantity || 0} × {formatCurrency(line.unit_price)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Total</span>
                      <p className="text-white font-semibold text-sm">{formatCurrency(line.total_price)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Vendor</span>
                      <p className="text-white font-medium text-sm">{line.vendor_name || line.vendor || '-'}</p>
                    </div>
                  </div>
                  {isSpecialOrder && onToggleItemCompleted && (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-400">Completed</span>
                      <button
                        onClick={() => onToggleItemCompleted(index, !line.completed)}
                        className={`p-2 rounded-full transition-all ${
                          line.completed 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30' 
                            : 'bg-gray-700/50 text-gray-400 border border-gray-600 hover:bg-gray-600/50'
                        }`}
                        title={line.completed ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        {line.completed ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {data.total_price !== undefined && (
          <div className="mt-4 flex justify-end">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2">
              <span className="text-sm text-gray-400 mr-3">Total:</span>
              <span className="text-xl font-bold text-white">{formatCurrency(data.total_price)}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

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
        {/* Header with Navigation */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: '600', 
              color: '#e0e0e0',
              margin: 0
            }}>
              {title}
            </h2>
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
          
          {/* Navigation and Action Buttons Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            {/* Navigation */}
            {(onPrevious || onNext) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onPrevious?.()
                  }}
                  disabled={!hasPrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                {currentIndex !== undefined && totalCount !== undefined && (
                  <span style={{ color: '#9ca3af', fontSize: '14px', padding: '0 8px' }}>
                    {currentIndex + 1} of {totalCount}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onNext?.()
                  }}
                  disabled={!hasNext}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {onPrint && (
                <Button variant="outline" size="sm" onClick={onPrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              )}
              {onEmail && (
                <Button variant="outline" size="sm" onClick={onEmail}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              )}
            </div>
          </div>
        </div>
        
        <div>
          {/* Status Badge */}
          {data.status && (
            <div className="mb-6 flex items-center gap-3">
              <span className="text-sm text-gray-400">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeColor(data.status)}`}>
                {formatStatus(data.status)}
              </span>
            </div>
          )}
          
          {renderCustomerSection()}
          {renderTransfereeSection()}
          {renderOrderDetails()}
          {renderProductLines()}
        </div>
      </div>

    </div>
  )
}
