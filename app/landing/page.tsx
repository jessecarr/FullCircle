'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { FileText, Users, ArrowRight, Package, Shield, List, Settings } from 'lucide-react'

export default function LandingPage() {
  const { user, loading, userRole } = useAuth()
  const router = useRouter()
  const [activeOrdersCount, setActiveOrdersCount] = useState(0)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchActiveOrdersCount = async () => {
      const { count, error } = await supabase
        .from('special_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'ordered', 'received'])
      
      if (!error && count !== null) {
        setActiveOrdersCount(count)
      }
    }
    
    if (user) {
      fetchActiveOrdersCount()
    }
  }, [user])

  // Base form options available to all users
  const baseFormOptions = [
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
      title: 'Consignment',
      description: 'Manage consignment sales and inventory',
      icon: FileText,
      href: '/?tab=consignment',
      color: 'bg-teal-500',
      hoverColor: 'hover:bg-teal-600'
    },
    {
      title: 'View All Forms',
      description: 'Browse and manage all submitted forms',
      icon: List,
      href: '/?tab=view-all',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600'
    }
  ]

  // Settings card removed - accessible via user dropdown for admins only
  const formOptions = baseFormOptions

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
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">
              Welcome back, {user?.user_metadata?.name || user?.email}!
            </h2>
            <p className="mt-2 text-muted-foreground">
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
                  className="hover:shadow-lg transition-shadow cursor-pointer group landing-card h-full flex flex-col"
                  onClick={() => router.push(option.href)}
                >
                  <CardHeader className="flex flex-row items-center space-y-0 pb-4">
                    <div className={`p-3 rounded-lg ${option.color} ${option.hoverColor} transition-colors mr-3`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl">{option.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <CardDescription className="text-sm mb-4">
                      {option.description}
                    </CardDescription>
                    <div className="mt-auto">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="group-hover:bg-accent w-full justify-between"
                      >
                        <span style={{ fontSize: '1.25rem', lineHeight: '1.4' }}>Open Form</span>
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Quick Stats */}
          <div className="mt-12">
            <h3 className="quick-stats-header text-xl font-semibold text-foreground mb-4">Quick Stats</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card 
                className="quick-stats-card hover:shadow-lg transition-all cursor-pointer group landing-card"
                onClick={() => router.push('/?tab=view-all')}
              >
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-primary group-hover:scale-105 transition-transform">{activeOrdersCount}</div>
                  <p className="text-sm group-hover:text-blue-400 transition-colors" style={{color: '#ffffff'}}>Active Special Orders</p>
                  <div className="mt-2 flex items-center text-xs text-muted-foreground group-hover:text-blue-400 transition-colors">
                    <span>View All</span>
                    <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
