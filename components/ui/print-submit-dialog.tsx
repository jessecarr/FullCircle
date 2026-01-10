'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer, Mail, ArrowLeft } from 'lucide-react'

interface PrintSubmitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPrint: () => void
  onSubmit: () => void
  onEmail?: () => void
  isEditing?: boolean
  loading?: boolean
  emailLoading?: boolean
  customerEmail?: string
  customerName?: string
}

export function PrintSubmitDialog({ 
  open, 
  onOpenChange, 
  onPrint, 
  onSubmit, 
  onEmail,
  isEditing = false,
  loading = false,
  emailLoading = false,
  customerEmail = '',
  customerName = ''
}: PrintSubmitDialogProps) {
  const [showEmailConfirm, setShowEmailConfirm] = useState(false)
  
  if (!open) return null
  
  // Reset email confirm state when dialog closes
  const handleClose = () => {
    setShowEmailConfirm(false)
    onOpenChange(false)
  }

  return (
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
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: 'rgba(17, 24, 39, 0.98)',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          maxWidth: '480px',
          width: '100%',
          border: '2px solid rgba(59, 130, 246, 0.3)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {showEmailConfirm ? (
          // Email Confirmation View
          <>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: '#ffffff',
                margin: '0 0 12px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Mail className="h-5 w-5" />
                Send Email Confirmation
              </h3>
              <p style={{ 
                fontSize: '16px', 
                color: '#9ca3af',
                margin: 0,
                lineHeight: '1.5'
              }}>
                Are you sure you want to send this form to <strong style={{ color: '#ffffff' }}>{customerName || 'the customer'}</strong> at <strong style={{ color: '#ffffff' }}>{customerEmail}</strong>?
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <Button
                onClick={() => {
                  if (onEmail) onEmail()
                }}
                disabled={emailLoading}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(59, 130, 246, 0.8)',
                  borderColor: 'rgba(59, 130, 246, 0.8)'
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                {emailLoading ? 'Sending...' : 'Send Email'}
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => setShowEmailConfirm(false)}
                disabled={emailLoading}
                style={{
                  width: '100%',
                  backgroundColor: 'transparent',
                  color: '#9ca3af',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </>
        ) : (
          // Main View
          <>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: '#ffffff',
                margin: '0 0 12px 0'
              }}>
                {isEditing ? 'Update Order' : 'Create Order'}
              </h3>
              <p style={{ 
                fontSize: '16px', 
                color: '#9ca3af',
                margin: 0,
                lineHeight: '1.5'
              }}>
                Would you like to print the form before {isEditing ? 'updating' : 'submitting'} it?
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button
                  variant="outline"
                  onClick={() => {
                    onPrint()
                  }}
                  disabled={loading || emailLoading}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                    color: '#ffffff'
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                
                {onEmail && customerEmail && (
                  <Button
                    variant="outline"
                    onClick={() => setShowEmailConfirm(true)}
                    disabled={loading || emailLoading}
                    style={{
                      flex: 1,
                      backgroundColor: 'transparent',
                      borderColor: 'rgba(59, 130, 246, 0.3)',
                      color: '#ffffff'
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                )}
              </div>
              
              <Button
                onClick={() => {
                  onSubmit()
                  handleClose()
                }}
                disabled={loading || emailLoading}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(59, 130, 246, 0.8)',
                  borderColor: 'rgba(59, 130, 246, 0.8)'
                }}
              >
                {loading ? 'Saving...' : isEditing ? 'Update Order' : 'Create Order'}
              </Button>
              
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={loading}
                style={{
                  width: '100%',
                  backgroundColor: 'transparent',
                  color: '#9ca3af',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
