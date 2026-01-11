'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { Settings, Users, FileText, Package, ArrowRight, ArrowLeft, User, Shield, Database, RefreshCw, Upload, Building2, Lock, AlertTriangle } from 'lucide-react'

export default function SettingsPage() {
  const { user, loading, userRole } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStats, setSyncStats] = useState<{
    totalRecords: number
    lastSyncedAt: string | null
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [password, setPassword] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  // Check if user is admin
  const isAdmin = userRole === 'admin'

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Fetch FFL sync stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/ffl/sync')
        const data = await response.json()
        if (data.success) {
          setSyncStats({
            totalRecords: data.totalRecords,
            lastSyncedAt: data.lastSyncedAt
          })
        }
      } catch (error) {
        console.error('Failed to fetch FFL stats:', error)
      }
    }
    if (user) {
      fetchStats()
    }
  }, [user])

  const handleSyncFromATF = async () => {
    setIsSyncing(true)
    toast({
      title: 'Syncing FFL Database',
      description: 'Downloading ATF database. This may take a few minutes...'
    })

    try {
      const response = await fetch('/api/ffl/sync', {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Sync Complete',
          description: `Successfully processed ${data.totalProcessed.toLocaleString()} FFLs.`
        })
        setSyncStats({
          totalRecords: data.totalProcessed,
          lastSyncedAt: data.syncedAt
        })
      } else {
        toast({
          title: 'Sync Failed',
          description: data.errors?.join(', ') || 'Unknown error occurred',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Sync Error',
        description: (error as Error).message,
        variant: 'destructive'
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // File validation constants
  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
  const ALLOWED_FILE_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv' // .csv
  ]
  const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv']

  // Validate file before upload
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File size exceeds 50MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)` }
    }

    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return { valid: false, error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` }
    }

    // Check MIME type (basic validation)
    if (!ALLOWED_FILE_TYPES.includes(file.type) && file.type !== '') {
      return { valid: false, error: `Invalid file format. Please upload an Excel or CSV file.` }
    }

    return { valid: true }
  }

  // Handle file selection - requires password verification first
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file first
    const validation = validateFile(file)
    if (!validation.valid) {
      toast({
        title: 'Invalid File',
        description: validation.error,
        variant: 'destructive'
      })
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Store file and show password dialog
    setPendingFile(file)
    setShowPasswordDialog(true)
    setPassword('')
  }

  // Verify password and process upload
  const handlePasswordVerify = async () => {
    if (!password || !pendingFile || !user?.email) return

    setIsVerifying(true)
    try {
      // Re-authenticate user with password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password
      })

      if (authError) {
        toast({
          title: 'Authentication Failed',
          description: 'Incorrect password. Please try again.',
          variant: 'destructive'
        })
        setPassword('')
        return
      }

      // Password verified - proceed with upload
      setShowPasswordDialog(false)
      await processFileUpload(pendingFile)
    } catch (error) {
      toast({
        title: 'Verification Error',
        description: (error as Error).message,
        variant: 'destructive'
      })
    } finally {
      setIsVerifying(false)
      setPassword('')
      setPendingFile(null)
    }
  }

  // Process the actual file upload
  const processFileUpload = async (file: File) => {
    setIsSyncing(true)
    toast({
      title: 'Uploading FFL File',
      description: 'Processing uploaded file...'
    })

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/ffl/sync', {
        method: 'POST',
        body: formData
      })
      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Upload Complete',
          description: `Successfully processed ${data.totalProcessed.toLocaleString()} FFLs.`
        })
        setSyncStats({
          totalRecords: data.totalProcessed,
          lastSyncedAt: data.syncedAt
        })
      } else {
        toast({
          title: 'Upload Failed',
          description: data.errors?.join(', ') || 'Unknown error occurred',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Upload Error',
        description: (error as Error).message,
        variant: 'destructive'
      })
    } finally {
      setIsSyncing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Cancel password dialog
  const handleCancelPasswordDialog = () => {
    setShowPasswordDialog(false)
    setPassword('')
    setPendingFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
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

      {/* Main Content */}
      <main className="landing-page max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Return Button */}
          <div className="mb-4">
            <Button 
              variant="outline" 
              onClick={() => router.push('/landing')}
              className="styled-button flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Dashboard
            </Button>
          </div>

          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">
              Settings
            </h2>
            <p className="mt-2 text-muted-foreground">
              Manage your account settings and system preferences.
            </p>
          </div>

          {/* Settings Grid - Manage Users, Manage Customers, FFL Lookup */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Manage Users Card */}
            <Card 
              className="landing-card hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push('/admin/users')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Manage Users</div>
                <p className="text-xs text-muted-foreground">
                  Add, edit, and manage user accounts
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2 w-full"
                >
                  Open User Management
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Manage Customers Card */}
            <Card 
              className="landing-card hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push('/customers')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Manage Customers</div>
                <p className="text-xs text-muted-foreground">
                  View, search, and edit customer information
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2 w-full"
                >
                  Open Customer Management
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* FFL Lookup Card */}
            <Card className="landing-card hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">FFL Database</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">FFL Lookup</div>
                <p className="text-xs text-muted-foreground mb-4">
                  Import ATF FFL database for quick lookups
                </p>
                <div className="space-y-2">
                  <a 
                    href="https://www.atf.gov/firearms/listing-federal-firearms-licensees"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      type="button"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Download from ATF Website
                    </Button>
                  </a>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSyncing}
                  >
                    <Upload className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Importing...' : 'Upload FFL File'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Password required • Max 50MB
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Password Verification Dialog */}
      {showPasswordDialog && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={handleCancelPasswordDialog}
        >
          <div 
            className="border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl"
            style={{
              background: 'linear-gradient(145deg, hsl(222 47% 11%) 0%, hsl(217 33% 17%) 50%, hsl(215 25% 20%) 100%)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-yellow-500/20">
                <Lock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Password Required</h3>
                <p className="text-sm text-slate-400">
                  Re-enter your password to upload FFL database
                </p>
              </div>
            </div>

            <div className="mb-4 p-3 rounded-md bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center gap-2 text-blue-400 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>File: {pendingFile?.name}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Size: {pendingFile ? (pendingFile.size / 1024 / 1024).toFixed(2) : 0} MB
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePasswordVerify()
                  }
                }}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-slate-600 hover:bg-slate-800"
                onClick={handleCancelPasswordDialog}
                disabled={isVerifying}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handlePasswordVerify}
                disabled={isVerifying || !password}
              >
                {isVerifying ? 'Verifying...' : 'Verify & Upload'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
