'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { SpecialOrderForm } from '@/components/forms/SpecialOrderForm'
import { InboundTransferForm } from '@/components/forms/InboundTransferForm'
import { SuppressorApprovalForm } from '@/components/forms/SuppressorApprovalForm'
import { OutboundTransferForm } from '@/components/forms/OutboundTransferForm'
import { ConsignmentForm } from '@/components/forms/ConsignmentForm'
import { FormsList } from '@/components/FormsList'
import { FormViewDialog } from '@/components/FormViewDialog'
import { Button } from '@/components/ui/button'
import { ChevronDown, List, ArrowLeft, Printer } from 'lucide-react'
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
  const [showDashboardDialog, setShowDashboardDialog] = useState(false)
  const [showViewAllDialog, setShowViewAllDialog] = useState(false)
  const [allItems, setAllItems] = useState<any[]>([])
  const [currentViewIndex, setCurrentViewIndex] = useState(-1)

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
        'outbound_transfers': 'outbound-transfer',
        'consignment_forms': 'consignment'
      }
      setActiveTab(tabMap[formType] || 'special-order')
    }
    setViewMode('form')
  }

  const handleView = (item: any, formType?: string) => {
    setViewingItem({ ...item, _formType: formType })
    // Find the index of this item in allItems
    const index = allItems.findIndex(allItem => 
      allItem.id === item.id && allItem._formType === formType
    )
    setCurrentViewIndex(index)
  }

  const handlePrevious = () => {
    if (currentViewIndex > 0) {
      const previousItem = allItems[currentViewIndex - 1]
      setViewingItem(previousItem)
      setCurrentViewIndex(currentViewIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentViewIndex < allItems.length - 1) {
      const nextItem = allItems[currentViewIndex + 1]
      setViewingItem(nextItem)
      setCurrentViewIndex(currentViewIndex + 1)
    }
  }

  const handleNewForm = () => {
    setEditingItem(null)
    setViewMode('form')
  }

  const handleFormSelect = (formType: string) => {
    // Skip confirmation dialog if we're on the view all page (no form being edited)
    if (viewMode === 'list') {
      setActiveTab(formType)
      setViewMode('form')
      setEditingItem(null)
      return
    }
    setPendingFormSwitch(formType)
    setShowConfirmDialog(true)
  }

  const confirmFormSwitch = () => {
    if (pendingFormSwitch) {
      setEditingItem(null)
      setViewMode('form')
      // Force tab change even if it's the same form type
      if (activeTab === pendingFormSwitch) {
        // Force re-render by incrementing a key or using a different approach
        setActiveTab('temp')
        setTimeout(() => setActiveTab(pendingFormSwitch), 0)
      } else {
        setActiveTab(pendingFormSwitch)
      }
    }
    setShowConfirmDialog(false)
    setPendingFormSwitch(null)
  }

  const cancelFormSwitch = () => {
    setShowConfirmDialog(false)
    setPendingFormSwitch(null)
  }

  const handleDashboardClick = () => {
    console.log('Dashboard clicked, viewMode:', viewMode, 'editingItem:', editingItem);
    // Always show dialog when on a form to prevent accidental navigation
    if (viewMode === 'form') {
      setShowDashboardDialog(true)
    } else {
      router.push('/landing')
    }
  }

  const confirmDashboardNavigation = () => {
    console.log('Confirming dashboard navigation');
    setShowDashboardDialog(false)
    router.push('/landing')
  }

  const cancelDashboardNavigation = () => {
    setShowDashboardDialog(false)
  }

  const handleViewAllClick = () => {
    console.log('View All clicked, viewMode:', viewMode, 'editingItem:', editingItem);
    // Always show dialog when on a form to prevent accidental navigation
    if (viewMode === 'form') {
      setShowViewAllDialog(true)
    } else {
      setViewMode('list')
    }
  }

  const confirmViewAllNavigation = () => {
    console.log('Confirming view all navigation');
    setShowViewAllDialog(false)
    setViewMode('list')
  }

  const cancelViewAllNavigation = () => {
    setShowViewAllDialog(false)
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
      case 'consignment':
        return 'Consignments'
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
      case 'consignment':
        return 'consignment_forms' as const
      default:
        return 'special_orders' as const
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
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
              onClick={handleDashboardClick}
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
                <DropdownMenuContent>
                  <DropdownMenuItem 
                    onClick={() => handleFormSelect('special-order')}
                    className="cursor-pointer"
                  >
                    Special Order
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleFormSelect('inbound-transfer')}
                    className="cursor-pointer"
                  >
                    Inbound Transfer
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleFormSelect('suppressor-approval')}
                    className="cursor-pointer"
                  >
                    Suppressor Approval
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleFormSelect('outbound-transfer')}
                    className="cursor-pointer"
                  >
                    Outbound Transfer
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleFormSelect('consignment')}
                    className="cursor-pointer"
                  >
                    Consignment
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {viewMode === 'form' && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    // Trigger print from the active form component
                    const printButton = document.querySelector('[data-print-form]') as HTMLButtonElement
                    if (printButton) {
                      printButton.click()
                    }
                  }}
                  title="Print Form"
                >
                  <Printer className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={handleViewAllClick}
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
              onItemsChange={setAllItems}
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

              <TabsContent value="consignment">
                <ConsignmentForm
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
        onPrevious={handlePrevious}
        onNext={handleNext}
        hasPrevious={currentViewIndex > 0}
        hasNext={currentViewIndex < allItems.length - 1}
      />

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch Form?</AlertDialogTitle>
            <AlertDialogDescription>
              The current form will not be saved. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelFormSwitch}>Cancel</AlertDialogCancel>
            <Button 
              onClick={confirmFormSwitch}
              style={{
                backgroundColor: '#1e40af',
                borderColor: '#1e40af',
                color: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8'
                e.currentTarget.style.borderColor = '#1d4ed8'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1e40af'
                e.currentTarget.style.borderColor = '#1e40af'
              }}
            >
              Continue
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dashboard Navigation Confirmation Dialog */}
      <AlertDialog open={showDashboardDialog} onOpenChange={setShowDashboardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Return to Dashboard?</AlertDialogTitle>
            <AlertDialogDescription>
              The current form will not be saved. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDashboardNavigation}>Cancel</AlertDialogCancel>
            <Button 
              onClick={confirmDashboardNavigation}
              style={{
                backgroundColor: '#1e40af',
                borderColor: '#1e40af',
                color: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8'
                e.currentTarget.style.borderColor = '#1d4ed8'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1e40af'
                e.currentTarget.style.borderColor = '#1e40af'
              }}
            >
              Continue
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View All Navigation Confirmation Dialog */}
      <AlertDialog open={showViewAllDialog} onOpenChange={setShowViewAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>View All Forms?</AlertDialogTitle>
            <AlertDialogDescription>
              The current form will not be saved. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelViewAllNavigation}>Cancel</AlertDialogCancel>
            <Button 
              onClick={confirmViewAllNavigation}
              style={{
                backgroundColor: '#1e40af',
                borderColor: '#1e40af',
                color: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8'
                e.currentTarget.style.borderColor = '#1d4ed8'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1e40af'
                e.currentTarget.style.borderColor = '#1e40af'
              }}
            >
              Continue
            </Button>
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
