'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

interface PrintSubmitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPrint: () => void
  onSubmit: () => void
  isEditing?: boolean
  loading?: boolean
}

export function PrintSubmitDialog({ 
  open, 
  onOpenChange, 
  onPrint, 
  onSubmit, 
  isEditing = false,
  loading = false 
}: PrintSubmitDialogProps) {
  if (!open) return null

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
      onClick={() => onOpenChange(false)}
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
          <Button
            variant="outline"
            onClick={() => {
              onPrint()
              // Don't close the dialog after printing
            }}
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              borderColor: 'rgba(59, 130, 246, 0.3)',
              color: '#ffffff'
            }}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Form
          </Button>
          
          <Button
            onClick={() => {
              onSubmit()
              onOpenChange(false)
            }}
            disabled={loading}
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
            onClick={() => onOpenChange(false)}
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
      </div>
    </div>
  )
}
