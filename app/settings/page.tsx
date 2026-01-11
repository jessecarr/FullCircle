'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/Header'
import { Settings, Users, FileText, Package, ArrowRight, ArrowLeft, User, Shield, Database, RefreshCw, Upload, Building2 } from 'lucide-react'

export default function SettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStats, setSyncStats] = useState<{
    totalRecords: number
    lastSyncedAt: string | null
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

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

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="landing-card hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profile Settings</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Account</div>
                <p className="text-xs text-muted-foreground">
                  Manage your profile information
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2 w-full"
                  onClick={() => toast({ title: 'Coming Soon', description: 'Profile settings will be available soon.' })}
                >
                  Edit Profile
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card className="landing-card hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Security</div>
                <p className="text-xs text-muted-foreground">
                  Password and authentication settings
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2 w-full"
                  onClick={() => toast({ title: 'Coming Soon', description: 'Security settings will be available soon.' })}
                >
                  Manage Security
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card className="landing-card hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">System</div>
                <p className="text-xs text-muted-foreground">
                  Database and system preferences
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2 w-full"
                  onClick={() => toast({ title: 'Coming Soon', description: 'System settings will be available soon.' })}
                >
                  System Settings
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

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

            <Card className="landing-card hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">FFL Database</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">FFL Lookup</div>
                <p className="text-xs text-muted-foreground mb-2">
                  Import ATF FFL database for quick lookups
                </p>
                {syncStats && (
                  <div className="text-xs text-muted-foreground mb-3 space-y-1">
                    <p>Records: <span className="text-foreground font-medium">{syncStats.totalRecords.toLocaleString()}</span></p>
                    <p>Last Sync: <span className="text-foreground font-medium">{formatDate(syncStats.lastSyncedAt)}</span></p>
                  </div>
                )}
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
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Download the Excel file from ATF, then upload it here
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links */}
          <Card className="landing-card">
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
              <CardDescription>
                Quick access to frequently used features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="flex items-center justify-center gap-2"
                  onClick={() => router.push('/')}
                >
                  <FileText className="h-4 w-4" />
                  Special Orders
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center justify-center gap-2"
                  onClick={() => router.push('/')}
                >
                  <Users className="h-4 w-4" />
                  Customers
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center justify-center gap-2"
                  onClick={() => router.push('/')}
                >
                  <Package className="h-4 w-4" />
                  Transfers
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center justify-center gap-2"
                  onClick={() => router.push('/')}
                >
                  <FileText className="h-4 w-4" />
                  Suppressors
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
