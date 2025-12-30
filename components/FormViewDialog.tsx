'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Edit } from 'lucide-react'

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
      <div className="grid grid-cols-3 gap-4 py-2 border-b">
        <dt className="font-semibold text-sm text-muted-foreground">{label}</dt>
        <dd className="col-span-2 text-sm">{String(value)}</dd>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>
        <dl className="space-y-1">
          {Object.entries(data).map(([key, value]) => {
            if (key === 'id' || key === 'created_at' || key === 'updated_at') return null
            
            const label = key
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
            
            return renderField(label, value)
          })}
        </dl>
      </DialogContent>
    </Dialog>
  )
}
