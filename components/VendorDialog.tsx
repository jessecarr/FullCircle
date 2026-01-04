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
          backgroundColor: '#2a2a4a',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '500px',
          width: '90%',
          border: '1px solid #4b5563'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#e0e0e0',
            marginBottom: '8px'
          }}>
            {title}
          </h2>
          <p style={{ 
            fontSize: '14px', 
            color: '#9ca3af',
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
                backgroundColor: '#374151',
                color: '#e0e0e0',
                border: '1px solid #4b5563',
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
              backgroundColor: '#374151',
              border: '2px solid #4b5563',
              borderRadius: '6px',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              <p style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#e0e0e0',
                textTransform: 'uppercase',
                margin: 0
              }}>
                {verifiedValue}
              </p>
            </div>
            <p style={{
              fontSize: '14px',
              color: '#9ca3af',
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
              backgroundColor: '#374151',
              color: '#e0e0e0',
              border: '1px solid #4b5563'
            }}
          >
            {showVerification ? 'Back to Edit' : 'Cancel'}
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            style={{
              backgroundColor: '#8b5cf6',
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
