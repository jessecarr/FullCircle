'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { SpecialOrderForm } from '@/components/forms/SpecialOrderForm'
import { InboundTransferForm } from '@/components/forms/InboundTransferForm'
import { SuppressorApprovalForm } from '@/components/forms/SuppressorApprovalForm'
import { OutboundTransferForm } from '@/components/forms/OutboundTransferForm'
import { FormsList } from '@/components/FormsList'
import { FormViewDialog } from '@/components/FormViewDialog'
import { Button } from '@/components/ui/button'
import { ChevronDown, List, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/Header'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

function HomeContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabParam || 'special-order')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
      // If navigating to view-all tab, switch to list mode
      if (tabParam === 'view-all') {
        setViewMode('list')
      }
    }
  }, [tabParam])
  const [viewMode, setViewMode] = useState<'form' | 'list'>(tabParam === 'view-all' ? 'list' : 'form')
  const [editingItem, setEditingItem] = useState<any>(null)
  const [viewingItem, setViewingItem] = useState<any>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [pendingFormSwitch, setPendingFormSwitch] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleFormSuccess = () => {
    setRefreshTrigger(prev => prev + 1)
    setViewMode('list')
    setEditingItem(null)
  }

  const handleEdit = (item: any, formType?: string) => {
    setEditingItem(item)
    if (formType) {
      // Convert table name to tab value
      const tabMap: Record<string, string> = {
        'special_orders': 'special-order',
        'inbound_transfers': 'inbound-transfer',
        'suppressor_approvals': 'suppressor-approval',
        'outbound_transfers': 'outbound-transfer'
      }
      setActiveTab(tabMap[formType] || 'special-order')
    }
    setViewMode('form')
  }

  const handleView = (item: any, formType?: string) => {
    setViewingItem({ ...item, _formType: formType })
  }

  const handleNewForm = () => {
    setEditingItem(null)
    setViewMode('form')
  }

  const handleFormSelect = (formType: string) => {
    setPendingFormSwitch(formType)
    setShowConfirmDialog(true)
  }

  const confirmFormSwitch = () => {
    if (pendingFormSwitch) {
      setActiveTab(pendingFormSwitch)
      setViewMode('form')
      setEditingItem(null)
    }
    setShowConfirmDialog(false)
    setPendingFormSwitch(null)
  }

  const cancelFormSwitch = () => {
    setShowConfirmDialog(false)
    setPendingFormSwitch(null)
  }

  const handleCancel = () => {
    setEditingItem(null)
    setViewMode('list')
  }

  const getFormTitle = () => {
    switch (activeTab) {
      case 'special-order':
        return 'Special Orders'
      case 'inbound-transfer':
        return 'Inbound Transfers'
      case 'suppressor-approval':
        return 'Suppressor Approvals'
      case 'outbound-transfer':
        return 'Outbound Transfers'
      default:
        return ''
    }
  }

  const getTableName = () => {
    switch (activeTab) {
      case 'special-order':
        return 'special_orders' as const
      case 'inbound-transfer':
        return 'inbound_transfers' as const
      case 'suppressor-approval':
        return 'suppressor_approvals' as const
      case 'outbound-transfer':
        return 'outbound_transfers' as const
      default:
        return 'special_orders' as const
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value)
          setViewMode('form')
          setEditingItem(null)
        }}>
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={() => router.push('/landing')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Dashboard
            </Button>

            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={viewMode === 'form' ? 'default' : 'outline'}>
                    New Form
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border border-gray-200 shadow-lg z-50">
                  <DropdownMenuItem 
                    onClick={() => handleFormSelect('special-order')}
                    className="cursor-pointer hover:bg-gray-100"
                  >
                    Special Order
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleFormSelect('inbound-transfer')}
                    className="cursor-pointer hover:bg-gray-100"
                  >
                    Inbound Transfer
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleFormSelect('suppressor-approval')}
                    className="cursor-pointer hover:bg-gray-100"
                  >
                    Suppressor Approval
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleFormSelect('outbound-transfer')}
                    className="cursor-pointer hover:bg-gray-100"
                  >
                    Outbound Transfer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>
          </div>

          {viewMode === 'list' ? (
            <FormsList
              onEdit={handleEdit}
              onView={handleView}
              refreshTrigger={refreshTrigger}
            />
          ) : (
            <>
              <TabsContent value="special-order">
                <SpecialOrderForm
                  initialData={editingItem}
                  onSuccess={handleFormSuccess}
                  onCancel={handleCancel}
                />
              </TabsContent>

              <TabsContent value="inbound-transfer">
                <InboundTransferForm
                  initialData={editingItem}
                  onSuccess={handleFormSuccess}
                />
              </TabsContent>

              <TabsContent value="suppressor-approval">
                <SuppressorApprovalForm
                  initialData={editingItem}
                  onSuccess={handleFormSuccess}
                />
              </TabsContent>

              <TabsContent value="outbound-transfer">
                <OutboundTransferForm
                  initialData={editingItem}
                  onSuccess={handleFormSuccess}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>

      <FormViewDialog
        open={!!viewingItem}
        onOpenChange={(open) => !open && setViewingItem(null)}
        data={viewingItem}
        title={getFormTitle()}
        onEdit={() => {
          handleEdit(viewingItem, viewingItem?._formType)
          setViewingItem(null)
        }}
      />

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Switch Form?</AlertDialogTitle>
            <AlertDialogDescription>
              The current form will not be saved. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelFormSwitch}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFormSwitch}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
