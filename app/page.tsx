'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SpecialOrderForm } from '@/components/forms/SpecialOrderForm'
import { InboundTransferForm } from '@/components/forms/InboundTransferForm'
import { SuppressorApprovalForm } from '@/components/forms/SuppressorApprovalForm'
import { OutboundTransferForm } from '@/components/forms/OutboundTransferForm'
import { FormsList } from '@/components/FormsList'
import { FormViewDialog } from '@/components/FormViewDialog'
import { Button } from '@/components/ui/button'
import { Plus, List } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/Header'

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
    }
  }, [tabParam])
  const [viewMode, setViewMode] = useState<'form' | 'list'>('form')
  const [editingItem, setEditingItem] = useState<any>(null)
  const [viewingItem, setViewingItem] = useState<any>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleFormSuccess = () => {
    setRefreshTrigger(prev => prev + 1)
    setViewMode('list')
    setEditingItem(null)
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setViewMode('form')
  }

  const handleView = (item: any) => {
    setViewingItem(item)
  }

  const handleNewForm = () => {
    setEditingItem(null)
    setViewMode('form')
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
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="special-order">Special Order</TabsTrigger>
              <TabsTrigger value="inbound-transfer">Inbound Transfer</TabsTrigger>
              <TabsTrigger value="suppressor-approval">Suppressor</TabsTrigger>
              <TabsTrigger value="outbound-transfer">Outbound Transfer</TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'form' ? 'default' : 'outline'}
                onClick={handleNewForm}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Form
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>
          </div>

          <TabsContent value="special-order">
            {viewMode === 'form' ? (
              <SpecialOrderForm
                initialData={editingItem}
                onSuccess={handleFormSuccess}
                onCancel={handleCancel}
              />
            ) : (
              <FormsList
                tableName="special_orders"
                title="Special Orders"
                onEdit={handleEdit}
                onView={handleView}
                refreshTrigger={refreshTrigger}
              />
            )}
          </TabsContent>

          <TabsContent value="inbound-transfer">
            {viewMode === 'form' ? (
              <InboundTransferForm
                initialData={editingItem}
                onSuccess={handleFormSuccess}
              />
            ) : (
              <FormsList
                tableName="inbound_transfers"
                title="Inbound Transfers"
                onEdit={handleEdit}
                onView={handleView}
                refreshTrigger={refreshTrigger}
              />
            )}
          </TabsContent>

          <TabsContent value="suppressor-approval">
            {viewMode === 'form' ? (
              <SuppressorApprovalForm
                initialData={editingItem}
                onSuccess={handleFormSuccess}
              />
            ) : (
              <FormsList
                tableName="suppressor_approvals"
                title="Suppressor Approvals"
                onEdit={handleEdit}
                onView={handleView}
                refreshTrigger={refreshTrigger}
              />
            )}
          </TabsContent>

          <TabsContent value="outbound-transfer">
            {viewMode === 'form' ? (
              <OutboundTransferForm
                initialData={editingItem}
                onSuccess={handleFormSuccess}
              />
            ) : (
              <FormsList
                tableName="outbound_transfers"
                title="Outbound Transfers"
                onEdit={handleEdit}
                onView={handleView}
                refreshTrigger={refreshTrigger}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      <FormViewDialog
        open={!!viewingItem}
        onOpenChange={(open) => !open && setViewingItem(null)}
        data={viewingItem}
        title={getFormTitle()}
        onEdit={() => {
          handleEdit(viewingItem)
          setViewingItem(null)
        }}
      />
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
