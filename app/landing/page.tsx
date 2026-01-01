'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/Header'
import { FileText, Users, ArrowRight, Package, Shield, List } from 'lucide-react'

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const formOptions = [
    {
      title: 'Special Order Form',
      description: 'Create and manage special customer orders',
      icon: FileText,
      href: '/?tab=special-order',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      title: 'Inbound Transfer',
      description: 'Process incoming firearm transfers',
      icon: Package,
      href: '/?tab=inbound-transfer',
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600'
    },
    {
      title: 'Outbound Transfer',
      description: 'Process outgoing firearm transfers',
      icon: Package,
      href: '/?tab=outbound-transfer',
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600'
    },
    {
      title: 'Suppressor Approval',
      description: 'Manage NFA suppressor applications',
      icon: Shield,
      href: '/?tab=suppressor-approval',
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600'
    },
    {
      title: 'View All Forms',
      description: 'Browse and manage all submitted forms',
      icon: List,
      href: '/?tab=view-all',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600'
    },
    {
      title: 'Dashboard',
      description: 'View system overview and analytics',
      icon: Users,
      href: '/dashboard',
      color: 'bg-gray-500',
      hoverColor: 'hover:bg-gray-600'
    }
  ]

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
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.user_metadata?.name || user?.email}!
            </h2>
            <p className="mt-2 text-gray-600">
              What would you like to do today?
            </p>
          </div>

          {/* Form Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {formOptions.map((option, index) => {
              const Icon = option.icon
              return (
                <Card 
                  key={index}
                  className="hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => router.push(option.href)}
                >
                  <CardHeader className="flex flex-row items-center space-y-0 pb-4">
                    <div className={`p-3 rounded-lg ${option.color} ${option.hoverColor} transition-colors`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{option.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm mb-4">
                      {option.description}
                    </CardDescription>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="group-hover:bg-gray-100 w-full justify-between"
                    >
                      Open Form
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Quick Stats */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <p className="text-sm text-gray-600">Special Orders</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <p className="text-sm text-gray-600">Customers</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-purple-600">0</div>
                  <p className="text-sm text-gray-600">Pending Transfers</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-red-600">0</div>
                  <p className="text-sm text-gray-600">NFA Applications</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
