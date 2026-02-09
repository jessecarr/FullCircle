'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { LogOut, User, Settings, Menu, Bell } from 'lucide-react'
import { SideNav } from './SideNav'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  onTitleClick?: () => void
}

export function Header({ onTitleClick }: HeaderProps = {}) {
  const [sideNavOpen, setSideNavOpen] = useState(false)
  const { user, signOut, loading, userRole } = useAuth()
  const router = useRouter()
  
  const handleTitleClick = () => {
    if (onTitleClick) {
      onTitleClick()
    } else {
      router.push('/landing')
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
              onClick={() => router.push('/landing')}
              className="header-nav-btn rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push('/?tab=view-all')}
              className="header-nav-btn rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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
    </>
  )
}
