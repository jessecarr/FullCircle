'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigationGuard } from '@/hooks/useNavigationGuard'
import { Button } from '@/components/ui/button'
import { LogOut, User, Settings, Menu, Bell, ChevronDown } from 'lucide-react'
import { SideNav } from './SideNav'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface HeaderProps {
  onTitleClick?: () => void
}

export function Header({ onTitleClick }: HeaderProps = {}) {
  const [sideNavOpen, setSideNavOpen] = useState(false)
  const { user, signOut, loading, userRole } = useAuth()
  const { isFormActive } = useNavigationGuard()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isDashboard = pathname === '/landing'
  const isViewAll = pathname === '/' && searchParams.get('tab') === 'view-all'

  // Navigation guard state
  const [navDialogOpen, setNavDialogOpen] = useState(false)
  const [navDialogTitle, setNavDialogTitle] = useState('')
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null)
  const [pendingNavMethod, setPendingNavMethod] = useState<'push' | 'href'>('href')

  const guardedNavigate = (url: string, title: string, method: 'push' | 'href' = 'href') => {
    if (isFormActive) {
      setPendingNavUrl(url)
      setNavDialogTitle(title)
      setPendingNavMethod(method)
      setNavDialogOpen(true)
    } else {
      if (method === 'push') {
        router.push(url)
      } else {
        window.location.href = url
      }
    }
  }

  const confirmNavigation = () => {
    setNavDialogOpen(false)
    if (pendingNavUrl) {
      if (pendingNavMethod === 'push') {
        router.push(pendingNavUrl)
      } else {
        window.location.href = pendingNavUrl
      }
    }
    setPendingNavUrl(null)
  }

  const cancelNavigation = () => {
    setNavDialogOpen(false)
    setPendingNavUrl(null)
  }

  const handleTitleClick = () => {
    if (onTitleClick) {
      onTitleClick()
    } else {
      guardedNavigate('/landing', 'Return to Dashboard?', 'push')
    }
  }

  if (loading) {
    return (
      <header className="page-header border-b shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                FC
              </div>
              <span className="text-white font-semibold text-lg">Full Circle Forms</span>
            </div>
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </header>
    )
  }

  if (!user) {
    return null
  }

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'

  return (
    <>
      <SideNav isOpen={sideNavOpen} onClose={() => setSideNavOpen(false)} />
      <header className="page-header sticky top-0 z-40" style={{ borderBottom: '1px solid color-mix(in srgb, var(--border) 50%, transparent)' }}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          {/* Left: Hamburger + Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSideNavOpen(true)}
              className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleTitleClick}>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">FC</span>
              </div>
              <span className="text-lg font-semibold text-foreground tracking-tight">
                Full Circle Forms
              </span>
            </div>
          </div>

          {/* Center: Nav Links */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            <button
              onClick={() => guardedNavigate('/landing', 'Return to Dashboard?', 'push')}
              className={`header-nav-btn rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isDashboard ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Dashboard
            </button>

            {/* New Form Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="header-nav-btn rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground inline-flex items-center gap-1"
                >
                  New Form
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="user-dropdown-menu w-48">
                <DropdownMenuItem onClick={() => guardedNavigate('/?tab=special-order', 'Switch Form?')} className="cursor-pointer text-foreground hover:bg-secondary">
                  Special Order
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => guardedNavigate('/?tab=inbound-transfer', 'Switch Form?')} className="cursor-pointer text-foreground hover:bg-secondary">
                  Inbound Transfer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => guardedNavigate('/?tab=suppressor-approval', 'Switch Form?')} className="cursor-pointer text-foreground hover:bg-secondary">
                  Suppressor Approval
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => guardedNavigate('/?tab=outbound-transfer', 'Switch Form?')} className="cursor-pointer text-foreground hover:bg-secondary">
                  Outbound Transfer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => guardedNavigate('/?tab=consignment', 'Switch Form?')} className="cursor-pointer text-foreground hover:bg-secondary">
                  Consignment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => guardedNavigate('/?tab=quote', 'Switch Form?')} className="cursor-pointer text-foreground hover:bg-secondary">
                  Quote
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={() => guardedNavigate('/?tab=view-all', 'View All Forms?')}
              className={`header-nav-btn rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isViewAll ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              View All Forms
            </button>
          </nav>

          {/* Right: Icons + User */}
          <div className="flex items-center gap-1">
            <button
              className="relative inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="View notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>

            {userRole === 'admin' && (
              <button
                onClick={() => router.push('/settings')}
                className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="hidden text-sm font-medium md:inline">{displayName}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="user-dropdown-menu w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">{user.user_metadata?.name || 'User'}</div>
                  <div className="text-xs">{user.email}</div>
                  {user.user_metadata?.role && (
                    <div className="text-xs mt-1 capitalize">
                      Role: <span className="font-medium">{user.user_metadata.role}</span>
                    </div>
                  )}
                </div>
                <DropdownMenuSeparator />
                {userRole === 'admin' && (
                  <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer text-foreground hover:bg-secondary">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                )}
                {userRole === 'admin' && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer hover:bg-secondary">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      {/* Navigation Guard Confirmation Dialog */}
      <AlertDialog open={navDialogOpen} onOpenChange={setNavDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{navDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              The current form will not be saved. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelNavigation}>Cancel</AlertDialogCancel>
            <Button 
              onClick={confirmNavigation}
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
    </>
  )
}
