'use client'

import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { LogOut, User, Settings } from 'lucide-react'
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
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 
              className="text-2xl font-bold text-foreground cursor-pointer hover:text-blue-400 transition-colors"
              onClick={handleTitleClick}
            >
              Full Circle Forms
            </h1>
            <div className="h-10 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </header>
    )
  }

  if (!user) {
    return null
  }

  return (
    <>
      <SideNav />
      <header className="page-header border-b shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 
              className="text-2xl font-bold text-foreground cursor-pointer hover:text-blue-400 transition-colors ml-14"
              onClick={handleTitleClick}
            >
              Full Circle Forms
            </h1>
          
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="user-dropdown-menu w-56">
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
