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
      <header className="page-header sticky top-0 z-30" style={{ borderBottom: '1px solid rgba(30, 41, 59, 0.6)' }}>
        <div className="px-4 sm:px-6" style={{ height: '56px', display: 'flex', alignItems: 'center' }}>
          <div className="flex items-center w-full relative">
            {/* Left: hamburger, logo, title */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setSideNavOpen(true)}
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div 
                className="flex items-center gap-2.5 cursor-pointer"
                onClick={handleTitleClick}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                  FC
                </div>
                <span className="text-white font-semibold hidden sm:inline text-sm">Full Circle Forms</span>
              </div>
            </div>

            {/* Center: nav links - absolutely centered */}
            <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
              <button
                onClick={() => router.push('/landing')}
                className="header-nav-btn px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push('/?tab=view-all')}
                className="header-nav-btn px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg"
              >
                View All Forms
              </button>
            </nav>

            {/* Right: bell, settings, user */}
            <div className="flex items-center gap-2 ml-auto">
              <button className="relative text-slate-400 hover:text-white transition-colors p-2 rounded-md">
                <Bell className="w-[18px] h-[18px]" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full"></span>
              </button>
              
              {userRole === 'admin' && (
                <button 
                  onClick={() => router.push('/settings')}
                  className="text-slate-400 hover:text-white transition-colors p-2 rounded-md"
                >
                  <Settings className="w-[18px] h-[18px]" />
                </button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors p-2 rounded-md">
                    <User className="w-[18px] h-[18px]" />
                    <span className="hidden sm:inline text-sm font-medium">{displayName}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="user-dropdown-menu w-56">
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
                    <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                  )}
                  {userRole === 'admin' && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={signOut} className="text-red-600 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
