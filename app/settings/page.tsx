'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/Header'
import { Settings, Users, FileText, Package, ArrowRight, ArrowLeft, User, Shield, Database } from 'lucide-react'

export default function SettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

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
