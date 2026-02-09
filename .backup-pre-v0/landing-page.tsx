'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { 
  FileText, 
  ShoppingCart, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  CircleDot, 
  ScrollText,
  LayoutGrid,
  Clock
} from 'lucide-react'

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

  const getGreeting = () => {
    const cstTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
    const hour = cstTime.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const formCards = [
    {
      title: 'Special Order',
      description: 'Create a new special order request for customers',
      icon: ShoppingCart,
      href: '/?tab=special-order',
      iconColor: '#3b82f6',
      iconBg: 'rgba(59, 130, 246, 0.15)',
    },
    {
      title: 'Inbound Transfer',
      description: 'Log incoming firearm transfers to your FFL',
      icon: ArrowDownToLine,
      href: '/?tab=inbound-transfer',
      iconColor: '#8b5cf6',
      iconBg: 'rgba(139, 92, 246, 0.15)',
    },
    {
      title: 'Outbound Transfer',
      description: 'Process outbound transfers and dispositions',
      icon: ArrowUpFromLine,
      href: '/?tab=outbound-transfer',
      iconColor: '#f97316',
      iconBg: 'rgba(249, 115, 22, 0.15)',
    },
    {
      title: 'Suppressor Approval',
      description: 'Track NFA item approvals and Form 4 status',
      icon: CircleDot,
      href: '/?tab=suppressor-approval',
      iconColor: '#ef4444',
      iconBg: 'rgba(239, 68, 68, 0.15)',
    },
    {
      title: 'Consignment',
      description: 'Manage consignment agreements and items',
      icon: ScrollText,
      href: '/?tab=consignment',
      iconColor: '#14b8a6',
      iconBg: 'rgba(20, 184, 166, 0.15)',
    },
    {
      title: 'Quote',
      description: 'Generate customer quotes and estimates',
      icon: FileText,
      href: '/?tab=quote',
      iconColor: '#06b6d4',
      iconBg: 'rgba(6, 182, 212, 0.15)',
    },
    {
      title: 'View All Forms',
      description: 'Browse and search through all submitted forms',
      icon: LayoutGrid,
      href: '/?tab=view-all',
      iconColor: '#ef4444',
      iconBg: 'rgba(239, 68, 68, 0.15)',
    },
  ]

  const quickStats = [
    {
      label: 'ACTIVE SPECIAL ORDERS',
      icon: ShoppingCart,
      iconColor: '#3b82f6',
      iconBg: 'rgba(59, 130, 246, 0.15)',
      href: '/?tab=view-all',
    },
    {
      label: 'PENDING TRANSFERS',
      icon: ArrowDownToLine,
      iconColor: '#22c55e',
      iconBg: 'rgba(34, 197, 94, 0.15)',
      href: '/?tab=view-all',
    },
    {
      label: 'NFA ITEMS PENDING',
      icon: CircleDot,
      iconColor: '#a855f7',
      iconBg: 'rgba(168, 85, 247, 0.15)',
      href: '/?tab=view-all',
    },
    {
      label: 'OPEN QUOTES',
      icon: Clock,
      iconColor: '#ef4444',
      iconBg: 'rgba(239, 68, 68, 0.15)',
      href: '/?tab=view-all',
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'

  return (
    <div className="min-h-screen">
      <Header />

      {/* Main Content */}
      <main className="px-6 sm:px-8 lg:px-12 py-8 max-w-[1400px] mx-auto">
        {/* Welcome Section */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-white font-bold italic" style={{ fontSize: '1.625rem', lineHeight: '1.3' }}>
              {getGreeting()}, {displayName}
            </h1>
            <p className="mt-1 text-slate-400 text-sm">
              Here&apos;s an overview of your FullCircle dashboard
            </p>
          </div>
          <div 
            className="hidden sm:flex items-center px-3 py-1.5 rounded-md text-xs font-medium"
            style={{ 
              border: '1px solid rgba(59, 130, 246, 0.4)', 
              color: '#60a5fa',
              backgroundColor: 'rgba(59, 130, 246, 0.08)'
            }}
          >
            FFL Dealer
          </div>
        </div>

        {/* Forms Section */}
        <div className="mb-8">
          <div className="flex items-baseline gap-2 mb-4">
            <h2 className="text-white font-semibold text-base">Forms</h2>
            <span className="text-slate-500 text-xs">({formCards.length} available)</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {formCards.map((card, index) => {
              const Icon = card.icon
              return (
                <button
                  key={index}
                  onClick={() => router.push(card.href)}
                  className="dashboard-form-card group text-left rounded-xl p-4"
                  style={{
                    background: '#0f1d2e',
                    border: '1px solid rgba(30, 41, 59, 0.7)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: card.iconBg }}
                    >
                      <Icon style={{ width: '20px', height: '20px', color: card.iconColor }} />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <h3 className="text-white font-semibold text-sm mb-0.5 group-hover:text-blue-400 transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-slate-500 text-xs leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div>
          <h2 className="text-white font-semibold text-base mb-4">Quick Stats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickStats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <button
                  key={index}
                  onClick={() => router.push(stat.href)}
                  className="quick-stat-card group text-left rounded-xl px-4 py-3 flex items-center justify-between"
                  style={{
                    background: '#0f1d2e',
                    border: '1px solid rgba(30, 41, 59, 0.7)',
                  }}
                >
                  <span className="text-slate-400 text-xs font-medium tracking-wide uppercase">
                    {stat.label}
                  </span>
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: stat.iconBg }}
                  >
                    <Icon style={{ width: '16px', height: '16px', color: stat.iconColor }} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
