'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface VendorDialogProps {
  isOpen: boolean
  title: string
  description: string
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
  submitText: string
  isSubmitting?: boolean
  showVerification?: boolean
  verifiedValue?: string
}

export default function VendorDialog({
  isOpen,
  title,
  description,
  value,
  onChange,
  onSubmit,
  onCancel,
  submitText,
  isSubmitting = false,
  showVerification = false,
  verifiedValue = ''
}: VendorDialogProps) {
  if (!isOpen) return null

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '500px',
          width: '90%',
          border: '1px solid #e5e7eb'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#111827',
            marginBottom: '8px'
          }}>
            {title}
          </h2>
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            marginBottom: '16px'
          }}>
            {description}
          </p>
        </div>

        {!showVerification ? (
          <div style={{ marginBottom: '24px' }}>
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Vendor name"
              style={{ 
                textTransform: 'uppercase',
                backgroundColor: '#ffffff',
                color: '#111827',
                border: '1px solid #d1d5db',
                width: '100%'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onSubmit()
                }
              }}
              autoFocus
            />
          </div>
        ) : (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              backgroundColor: '#f3f4f6',
              border: '2px solid #d1d5db',
              borderRadius: '6px',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              <p style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#111827',
                textTransform: 'uppercase',
                margin: 0
              }}>
                {verifiedValue}
              </p>
            </div>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              textAlign: 'center',
              margin: 0
            }}>
              This vendor will be added in uppercase format as shown above.
            </p>
          </div>
        )}

        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end' 
        }}>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            style={{
              backgroundColor: '#ffffff',
              color: '#111827',
              border: '1px solid #d1d5db'
            }}
          >
            {showVerification ? 'Back to Edit' : 'Cancel'}
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            style={{
              backgroundColor: '#3b82f6',
              color: '#ffffff'
            }}
          >
            {isSubmitting ? 'Processing...' : submitText}
          </Button>
        </div>
      </div>
    </div>
  )
}
