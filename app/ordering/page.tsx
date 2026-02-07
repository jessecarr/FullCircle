'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Upload, FileText, Loader2, AlertTriangle, CheckCircle, Package, DollarSign, TrendingUp, ShoppingCart, RefreshCw, Database, MessageSquareWarning, X } from 'lucide-react'

interface OrderRecommendation {
  itemID: string
  systemSku: string
  description: string
  manufacturerSku: string
  upc: string
  currentQty: number
  avgMonthlySales: number
  monthsOfStockLeft: number
  recommendedOrderQty: number
  defaultCost: number
  retailPrice: number
  estimatedOrderCost: number
  notes: string[]
}

interface AnalysisResult {
  data: OrderRecommendation[]
  summary: {
    totalItems: number
    itemsNeedingReorder: number
    urgentItems: number
    totalEstimatedCost: number
  }
}

type SortField = 'description' | 'currentQty' | 'avgMonthlySales' | 'monthsOfStockLeft' | 'recommendedOrderQty' | 'estimatedOrderCost'
type SortDirection = 'asc' | 'desc'

export default function OrderingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [file, setFile] = useState<File | null>(null)
  const [parsedIds, setParsedIds] = useState<string[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [sortField, setSortField] = useState<SortField>('monthsOfStockLeft')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [filterUrgent, setFilterUrgent] = useState(false)
  const [editedQtys, setEditedQtys] = useState<Record<string, number>>({})
  const [activeNotes, setActiveNotes] = useState<{ item: string; notes: string[] } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{ lastSync: any; totalRecords: number } | null>(null)
  const [syncMessage, setSyncMessage] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Fetch sync status on load
  useEffect(() => {
    if (user) {
      fetch('/api/lightspeed/sync')
        .then(r => r.json())
        .then(data => setSyncStatus(data))
        .catch(() => {})
    }
  }, [user])

  const handleSync = useCallback(async (type: 'full' | 'incremental') => {
    setSyncing(true)
    setSyncMessage(type === 'full' ? 'Running full sync of all inventory history... This may take several minutes.' : 'Syncing new inventory data...')

    try {
      const resp = await fetch('/api/lightspeed/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })

      const data = await resp.json()

      if (!resp.ok) {
        throw new Error(data.error || 'Sync failed')
      }

      setSyncMessage(`Sync complete! ${data.totalRecords} inventory log entries ${type === 'full' ? 'imported' : 'added'}.`)

      // Refresh sync status
      const statusResp = await fetch('/api/lightspeed/sync')
      const statusData = await statusResp.json()
      setSyncStatus(statusData)
    } catch (err) {
      setSyncMessage(`Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSyncing(false)
    }
  }, [])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError('')
    setResult(null)
    setEditedQtys({})

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
      
      // Skip header if first line doesn't look like an ID, deduplicate
      const seen = new Set<string>()
      const ids: string[] = []
      let duplicateCount = 0
      for (const line of lines) {
        // Extract first column (handle comma-separated)
        const value = line.split(',')[0].trim().replace(/"/g, '')
        // Check if it looks like a numeric ID
        if (/^\d+$/.test(value)) {
          if (seen.has(value)) {
            duplicateCount++
          } else {
            seen.add(value)
            ids.push(value)
          }
        }
      }

      if (ids.length === 0) {
        setError('No valid Lightspeed item IDs found in the CSV. Make sure the file contains numeric system IDs.')
        return
      }

      if (duplicateCount > 0) {
        setError(`Note: ${duplicateCount} duplicate item ID(s) were removed.`)
      }

      setParsedIds(ids)
    }
    reader.readAsText(selectedFile)
  }, [])

  const handleAnalyze = useCallback(async () => {
    if (parsedIds.length === 0) return

    setAnalyzing(true)
    setError('')
    setProgress(`Analyzing ${parsedIds.length} items... This may take a few minutes.`)

    try {
      const resp = await fetch('/api/lightspeed/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: parsedIds, monthsBack: 12 }),
      })

      const data = await resp.json()

      if (!resp.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      setResult(data)
      setProgress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze items')
      setProgress('')
    } finally {
      setAnalyzing(false)
    }
  }, [parsedIds])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection(field === 'description' ? 'asc' : 'asc')
    }
  }

  const handleQtyEdit = (itemID: string, qty: number) => {
    setEditedQtys(prev => ({ ...prev, [itemID]: qty }))
  }

  const getDisplayedRecommendations = () => {
    if (!result) return []
    let items = [...result.data]

    if (filterUrgent) {
      items = items.filter(r => r.monthsOfStockLeft < 1 && r.recommendedOrderQty > 0)
    }

    items.sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      const numA = Number(aVal)
      const numB = Number(bVal)
      return sortDirection === 'asc' ? numA - numB : numB - numA
    })

    return items
  }

  const getStatusColor = (monthsLeft: number) => {
    if (monthsLeft < 1) return 'text-red-400'
    if (monthsLeft < 2) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getStatusBg = (monthsLeft: number) => {
    if (monthsLeft < 1) return 'bg-red-500/10 border-red-500/20'
    if (monthsLeft < 2) return 'bg-yellow-500/10 border-yellow-500/20'
    return 'bg-green-500/10 border-green-500/20'
  }

  const getTotalEditedCost = () => {
    if (!result) return 0
    return result.data.reduce((sum, item) => {
      const qty = editedQtys[item.itemID] ?? item.recommendedOrderQty
      return sum + qty * item.defaultCost
    }, 0)
  }

  const exportToCSV = () => {
    if (!result) return
    const items = getDisplayedRecommendations()
    const headers = ['Item ID', 'System SKU', 'Description', 'Mfr SKU', 'UPC', 'On Hand', 'Avg Monthly Sales', 'Months Left', 'Recommended Qty', 'Order Qty', 'Unit Cost', 'Order Cost']
    const rows = items.map(item => {
      const orderQty = editedQtys[item.itemID] ?? item.recommendedOrderQty
      return [
        item.itemID,
        item.systemSku,
        `"${item.description}"`,
        item.manufacturerSku,
        item.upc,
        item.currentQty,
        item.avgMonthlySales,
        item.monthsOfStockLeft,
        item.recommendedOrderQty,
        orderQty,
        item.defaultCost.toFixed(2),
        (orderQty * item.defaultCost).toFixed(2),
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `order-recommendations-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    )
  }

  if (!user) return null

  const displayedItems = getDisplayedRecommendations()

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Order Recommendations</h1>
          <p className="text-slate-400">Upload a CSV of Lightspeed item IDs to get order quantity recommendations based on sales history.</p>
        </div>

        {/* Sales Data Sync Section */}
        <Card className="mb-6 border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="h-5 w-5" />
              Sales Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="text-sm text-slate-400">
                {syncStatus?.totalRecords ? (
                  <>
                    <span className="text-white font-medium">{syncStatus.totalRecords.toLocaleString()}</span> inventory log entries in database
                    {syncStatus.lastSync?.completed_at && (
                      <span className="ml-2">
                        · Last updated: {new Date(syncStatus.lastSync.completed_at).toLocaleDateString()} {new Date(syncStatus.lastSync.completed_at).toLocaleTimeString()}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-yellow-400">No inventory data synced yet. Run a full sync to import item history.</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSync('full')}
                  disabled={syncing}
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                  Full Sync
                </Button>
                <Button
                  onClick={() => handleSync('incremental')}
                  disabled={syncing}
                  style={{
                    background: syncing ? undefined : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
                    color: 'white',
                  }}
                  size="sm"
                >
                  {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  {syncing ? 'Syncing...' : 'Update Sales Data'}
                </Button>
              </div>
            </div>
            {syncMessage && (
              <div className={`mt-4 p-3 rounded-md text-sm flex items-center gap-2 ${
                syncMessage.includes('failed') ? 'bg-red-500/10 border border-red-500/20 text-red-300' :
                syncMessage.includes('complete') ? 'bg-green-500/10 border border-green-500/20 text-green-300' :
                'bg-blue-500/10 border border-blue-500/20 text-blue-300'
              }`}>
                {syncMessage.includes('failed') ? <AlertTriangle className="h-4 w-4" /> :
                 syncMessage.includes('complete') ? <CheckCircle className="h-4 w-4" /> :
                 <Loader2 className="h-4 w-4 animate-spin" />}
                {syncMessage}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card className="mb-6 border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Items CSV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="flex-1">
                <label className="text-sm text-slate-400 mb-2 block">
                  CSV file with Lightspeed system IDs (one per row)
                </label>
                <Input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="bg-slate-900 border-slate-600 text-white file:bg-slate-700 file:text-white file:border-0 file:mr-4 file:px-4 file:py-2 file:rounded-md file:cursor-pointer"
                />
              </div>
              {parsedIds.length > 0 && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-300">
                    <FileText className="h-4 w-4 inline mr-1" />
                    {parsedIds.length} items found
                  </span>
                  <Button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
                      color: 'white',
                    }}
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Analyze Sales
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
            {progress && (
              <div className="mt-4 p-3 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {progress}
              </div>
            )}
            {error && (
              <div className="mt-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="border-slate-700 bg-slate-800/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Package className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Total Items</p>
                      <p className="text-2xl font-bold text-white">{result.summary.totalItems}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-700 bg-slate-800/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/10">
                      <ShoppingCart className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Need Reorder</p>
                      <p className="text-2xl font-bold text-white">{result.summary.itemsNeedingReorder}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-700 bg-slate-800/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Urgent (&lt;1 mo)</p>
                      <p className="text-2xl font-bold text-white">{result.summary.urgentItems}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-700 bg-slate-800/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <DollarSign className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Est. Order Cost</p>
                      <p className="text-2xl font-bold text-white">${getTotalEditedCost().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div className="flex items-center gap-3">
                <Button
                  variant={filterUrgent ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterUrgent(!filterUrgent)}
                  className={filterUrgent ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-slate-600 text-slate-300 hover:bg-slate-700'}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {filterUrgent ? 'Showing Urgent Only' : 'Show Urgent Only'}
                </Button>
                <span className="text-sm text-slate-400">
                  {displayedItems.length} items shown
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <FileText className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </div>

            {/* Results Table */}
            <Card className="border-slate-700 bg-slate-800/50 overflow-hidden">
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-700 bg-slate-900">
                      <th className="text-left p-3 text-slate-400 font-medium">Status</th>
                      <th
                        className="text-left p-3 text-slate-400 font-medium cursor-pointer hover:text-white"
                        onClick={() => handleSort('description')}
                      >
                        Description {sortField === 'description' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-left p-3 text-slate-400 font-medium">SKU</th>
                      <th
                        className="text-right p-3 text-slate-400 font-medium cursor-pointer hover:text-white"
                        onClick={() => handleSort('currentQty')}
                      >
                        On Hand {sortField === 'currentQty' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="text-right p-3 text-slate-400 font-medium cursor-pointer hover:text-white"
                        onClick={() => handleSort('avgMonthlySales')}
                      >
                        Avg/Mo {sortField === 'avgMonthlySales' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="text-right p-3 text-slate-400 font-medium cursor-pointer hover:text-white"
                        onClick={() => handleSort('monthsOfStockLeft')}
                      >
                        Mo. Left {sortField === 'monthsOfStockLeft' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="text-right p-3 text-slate-400 font-medium cursor-pointer hover:text-white"
                        onClick={() => handleSort('recommendedOrderQty')}
                      >
                        Suggested {sortField === 'recommendedOrderQty' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-center p-3 text-slate-400 font-medium">Notes</th>
                      <th className="text-right p-3 text-slate-400 font-medium">
                        Order Qty
                      </th>
                      <th
                        className="text-right p-3 text-slate-400 font-medium cursor-pointer hover:text-white"
                        onClick={() => handleSort('estimatedOrderCost')}
                      >
                        Est. Cost {sortField === 'estimatedOrderCost' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedItems.map((item) => {
                      const orderQty = editedQtys[item.itemID] ?? item.recommendedOrderQty
                      const orderCost = orderQty * item.defaultCost
                      return (
                        <tr key={item.itemID} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBg(item.monthsOfStockLeft)}`}>
                              {item.monthsOfStockLeft < 1 ? (
                                <AlertTriangle className={`h-3 w-3 mr-1 ${getStatusColor(item.monthsOfStockLeft)}`} />
                              ) : item.monthsOfStockLeft < 2 ? (
                                <Package className={`h-3 w-3 mr-1 ${getStatusColor(item.monthsOfStockLeft)}`} />
                              ) : (
                                <CheckCircle className={`h-3 w-3 mr-1 ${getStatusColor(item.monthsOfStockLeft)}`} />
                              )}
                              <span className={getStatusColor(item.monthsOfStockLeft)}>
                                {item.monthsOfStockLeft < 1 ? 'Urgent' : item.monthsOfStockLeft < 2 ? 'Low' : 'OK'}
                              </span>
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="text-white font-medium max-w-xs truncate" title={item.description}>
                              {item.description}
                            </div>
                            <div className="text-xs text-slate-500">ID: {item.itemID}</div>
                          </td>
                          <td className="p-3 text-slate-300 text-xs">
                            {item.manufacturerSku || item.systemSku}
                          </td>
                          <td className="p-3 text-right text-slate-300">{item.currentQty}</td>
                          <td className="p-3 text-right text-slate-300">{item.avgMonthlySales}</td>
                          <td className={`p-3 text-right font-medium ${getStatusColor(item.monthsOfStockLeft)}`}>
                            {item.monthsOfStockLeft >= 999 ? '∞' : item.monthsOfStockLeft}
                          </td>
                          <td className="p-3 text-right text-slate-400">{item.recommendedOrderQty}</td>
                          <td className="p-3 text-center">
                            {item.notes && item.notes.length > 0 ? (
                              <button
                                onClick={() => setActiveNotes({ item: item.description, notes: item.notes })}
                                className="text-amber-400 hover:text-amber-300 transition-colors"
                                title="View notes"
                              >
                                <MessageSquareWarning className="h-4 w-4 inline" />
                              </button>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={orderQty}
                              onChange={(e) => handleQtyEdit(item.itemID, Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-right text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="p-3 text-right text-slate-300">
                            ${orderCost.toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Notes Dialog */}
            {activeNotes && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setActiveNotes(null)}>
                <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-w-md w-full mx-4 p-0" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h3 className="text-white font-semibold text-sm truncate pr-4">{activeNotes.item}</h3>
                    <button onClick={() => setActiveNotes(null)} className="text-slate-400 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    {activeNotes.notes.map((note, i) => (
                      <div key={i} className="flex gap-2 text-sm">
                        <MessageSquareWarning className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-slate-300">{note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
