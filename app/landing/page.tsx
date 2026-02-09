'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { 
  FileText, 
  ShoppingCart, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Shield,
  Handshake,
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
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const formCards = [
    {
      title: 'Special Order',
      description: 'Create a new special order request for customers',
      icon: ShoppingCart,
      href: '/?tab=special-order',
      accentColor: 'text-blue-400',
      glowColor: 'bg-blue-500/10',
    },
    {
      title: 'Inbound Transfer',
      description: 'Log incoming firearm transfers to your FFL',
      icon: ArrowDownToLine,
      href: '/?tab=inbound-transfer',
      accentColor: 'text-emerald-400',
      glowColor: 'bg-emerald-500/10',
    },
    {
      title: 'Outbound Transfer',
      description: 'Process outbound transfers and dispositions',
      icon: ArrowUpFromLine,
      href: '/?tab=outbound-transfer',
      accentColor: 'text-orange-400',
      glowColor: 'bg-orange-500/10',
    },
    {
      title: 'Suppressor Approval',
      description: 'Track NFA item approvals and Form 4 status',
      icon: Shield,
      href: '/?tab=suppressor-approval',
      accentColor: 'text-purple-400',
      glowColor: 'bg-purple-500/10',
    },
    {
      title: 'Consignment',
      description: 'Manage consignment agreements and items',
      icon: Handshake,
      href: '/?tab=consignment',
      accentColor: 'text-teal-400',
      glowColor: 'bg-teal-500/10',
    },
    {
      title: 'Quote',
      description: 'Generate customer quotes and estimates',
      icon: FileText,
      href: '/?tab=quote',
      accentColor: 'text-cyan-400',
      glowColor: 'bg-cyan-500/10',
    },
    {
      title: 'View All Forms',
      description: 'Browse and search through all submitted forms',
      icon: LayoutGrid,
      href: '/?tab=view-all',
      accentColor: 'text-rose-400',
      glowColor: 'bg-rose-500/10',
    },
  ]

  const quickStats = [
    {
      label: 'Active Special Orders',
      value: activeOrdersCount.toString(),
      change: 'View all orders',
      changeType: 'neutral' as const,
      icon: ShoppingCart,
      accentColor: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
      href: '/?tab=view-all',
    },
    {
      label: 'Pending Transfers',
      value: '—',
      change: 'Inbound & outbound',
      changeType: 'neutral' as const,
      icon: ArrowDownToLine,
      accentColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10',
      href: '/?tab=view-all',
    },
    {
      label: 'NFA Items Pending',
      value: '—',
      change: 'Awaiting approval',
      changeType: 'neutral' as const,
      icon: Shield,
      accentColor: 'text-purple-400',
      iconBg: 'bg-purple-500/10',
      href: '/?tab=view-all',
    },
    {
      label: 'Open Quotes',
      value: '—',
      change: 'Active estimates',
      changeType: 'neutral' as const,
      icon: Clock,
      accentColor: 'text-orange-400',
      iconBg: 'bg-orange-500/10',
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
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 px-4 py-8 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col gap-10">
          {/* Welcome Section */}
          <section aria-label="Welcome">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
                  {getGreeting()}, {displayName}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Here&apos;s an overview of your FullCircle dashboard
                </p>
              </div>
              <span className="w-fit rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors"
                style={{
                  borderColor: 'color-mix(in srgb, var(--primary) 20%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)',
                  color: 'var(--primary)',
                }}
              >
                FFL Dealer
              </span>
            </div>
          </section>

          {/* Forms Section */}
          <section aria-label="Forms">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Forms</h2>
              <span className="text-xs text-muted-foreground">({formCards.length} available)</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {formCards.map((card) => {
                const Icon = card.icon
                return (
                  <button
                    key={card.title}
                    onClick={() => router.push(card.href)}
                    className="dashboard-form-card group block text-left rounded-lg outline-none"
                  >
                    <Card className="h-full border-border/50 bg-card transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5">
                      <CardContent className="flex items-start gap-4 p-5">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-300 ${card.glowColor}`}>
                          <span className={card.accentColor}>
                            <Icon className="h-5 w-5" />
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-foreground group-hover:text-foreground/90">
                            {card.title}
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            {card.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Quick Stats */}
          <section aria-label="Quick statistics">
            <h2 className="mb-4 text-base font-semibold text-foreground">Quick Stats</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickStats.map((stat) => {
                const Icon = stat.icon
                return (
                  <button
                    key={stat.label}
                    onClick={() => router.push(stat.href)}
                    className="text-left"
                  >
                    <Card className="border-border/50 bg-card">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {stat.label}
                          </span>
                          <div className={`flex h-8 w-8 items-center justify-center rounded-md ${stat.iconBg}`}>
                            <span className={stat.accentColor}>
                              <Icon className="h-5 w-5" />
                            </span>
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="text-2xl font-bold text-foreground tracking-tight">
                            {stat.value}
                          </p>
                          {stat.change && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {stat.change}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t px-4 py-6 lg:px-8" style={{ borderColor: 'color-mix(in srgb, var(--border) 50%, transparent)' }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-xs text-muted-foreground">Full Circle Forms</p>
          <p className="text-xs text-muted-foreground">Secure FFL Operations Dashboard</p>
        </div>
      </footer>
    </div>
  )
}
