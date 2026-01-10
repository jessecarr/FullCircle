'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Mail } from 'lucide-react'

interface EmailConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerEmail: string
  customerName?: string
  onConfirm: () => void
  loading?: boolean
}

export function EmailConfirmDialog({
  open,
  onOpenChange,
  customerEmail,
  customerName,
  onConfirm,
  loading = false
}: EmailConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email Confirmation
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to send this form to{' '}
            <strong>{customerName || 'the customer'}</strong> at{' '}
            <strong>{customerEmail}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={loading}
            style={{
              backgroundColor: '#1e40af',
              color: 'white'
            }}
          >
            {loading ? 'Sending...' : 'Send Email'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
