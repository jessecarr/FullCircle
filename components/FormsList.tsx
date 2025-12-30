'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Eye, Edit, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface FormsListProps {
  tableName: 'special_orders' | 'inbound_transfers' | 'suppressor_approvals' | 'outbound_transfers'
  title: string
  onEdit?: (item: any) => void
  onView?: (item: any) => void
  refreshTrigger?: number
}

export function FormsList({ tableName, title, onEdit, onView, refreshTrigger }: FormsListProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchItems = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to load ${title.toLowerCase()}`,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [tableName, refreshTrigger])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Item deleted successfully',
      })

      fetchItems()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      })
    }
  }

  const getDisplayFields = (item: any) => {
    switch (tableName) {
      case 'special_orders':
        return {
          primary: item.customer_name,
          secondary: `${item.manufacturer} ${item.model}`,
          tertiary: `Status: ${item.status}`,
        }
      case 'inbound_transfers':
        return {
          primary: item.transferor_name,
          secondary: `${item.manufacturer} ${item.model} - ${item.serial_number}`,
          tertiary: `Status: ${item.status}`,
        }
      case 'suppressor_approvals':
        return {
          primary: item.customer_name,
          secondary: `${item.suppressor_manufacturer} ${item.suppressor_model}`,
          tertiary: `${item.form_type} - Status: ${item.status}`,
        }
      case 'outbound_transfers':
        return {
          primary: item.transferee_name,
          secondary: `${item.manufacturer} ${item.model} - ${item.serial_number}`,
          tertiary: `Status: ${item.status}`,
        }
      default:
        return { primary: '', secondary: '', tertiary: '' }
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No {title.toLowerCase()} found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const fields = getDisplayFields(item)
        return (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{fields.primary}</CardTitle>
                  <CardDescription>{fields.secondary}</CardDescription>
                  <p className="text-sm text-muted-foreground mt-1">{fields.tertiary}</p>
                </div>
                <div className="flex gap-2">
                  {onView && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onView(item)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onEdit(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        )
      })}
    </div>
  )
}
