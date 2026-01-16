'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useNavigationGuard } from '@/hooks/useNavigationGuard'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Menu, 
  X, 
  FileText, 
  Package, 
  Shield, 
  List, 
  Settings,
  Home,
  Users,
  Calendar,
  Truck,
  Archive,
  Clock
} from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
  separator?: boolean  // Add separator after this item
}

const navItems: NavItem[] = [
  // Main Navigation
  { title: 'Dashboard', href: '/landing', icon: Home },
  { title: 'View All Forms', href: '/?tab=view-all', icon: List, separator: true },
  
  // Form Types
  { title: 'Special Order', href: '/?tab=special-order', icon: FileText },
  { title: 'Inbound Transfer', href: '/?tab=inbound-transfer', icon: Package },
  { title: 'Suppressor Approval', href: '/?tab=suppressor-approval', icon: Shield },
  { title: 'Consignment', href: '/?tab=consignment', icon: FileText },
  { title: 'Quote', href: '/?tab=quote', icon: FileText },
  { title: 'Outbound Transfer', href: '/?tab=outbound-transfer', icon: Package, separator: true },
  
  // Graf & Sons
  { title: "Graf's Schedule", href: '/grafs-schedule', icon: Calendar },
  { title: "Graf's Arriving", href: '/grafs-arriving', icon: Truck, separator: true },
  
  // Admin & Settings
  { title: 'Time Sheets', href: '/timesheet', icon: Clock },
  { title: 'Manage Users', href: '/admin/users', icon: Users, adminOnly: true },
  { title: 'Manage Customers', href: '/customers', icon: Users },
  { title: 'Deleted Forms', href: '/archive', icon: Archive },
  { title: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
]

export function SideNav() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { userRole } = useAuth()
  const { 
    isFormActive, 
    pendingNavigation, 
    setPendingNavigation, 
    showNavigationDialog, 
    setShowNavigationDialog,
    requestNavigation 
  } = useNavigationGuard()

  const handleNavClick = (href: string) => {
    if (requestNavigation(href)) {
      router.push(href)
      setIsOpen(false)
    } else {
      setIsOpen(false) // Close menu while dialog is shown
    }
  }

  const confirmNavigation = () => {
    if (pendingNavigation) {
      router.push(pendingNavigation)
    }
    setShowNavigationDialog(false)
    setPendingNavigation(null)
  }

  const cancelNavigation = () => {
    setShowNavigationDialog(false)
    setPendingNavigation(null)
  }

  const filteredNavItems = navItems.filter(item => !item.adminOnly || userRole === 'admin')

  return (
    <>
      {/* Hamburger Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 h-10 w-10 rounded-lg bg-slate-800/80 hover:bg-slate-700 backdrop-blur-sm border border-slate-700"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        {isOpen ? (
          <X className="h-5 w-5 text-white" />
        ) : (
          <Menu className="h-5 w-5 text-white" />
        )}
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Side Menu */}
      <div 
        className={`fixed top-0 left-0 h-full w-64 z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'linear-gradient(180deg, hsl(222 47% 11%) 0%, hsl(217 33% 17%) 50%, hsl(215 25% 22%) 100%)',
          boxShadow: '4px 0 20px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Menu Header */}
        <div className="pt-20 px-4 pb-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">Navigation</h2>
          <p className="text-xs text-slate-400">Full Circle Forms</p>
        </div>

        {/* Nav Items */}
        <nav className="py-4">
          {filteredNavItems.map((item, index) => {
            const Icon = item.icon
            return (
              <div key={item.href}>
                <button
                  onClick={() => handleNavClick(item.href)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.title}</span>
                </button>
                {item.separator && (
                  <div className="my-2 mx-4 border-t border-slate-700" />
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <p className="text-xs text-slate-500 text-center">
            © Full Circle Firearms
          </p>
        </div>
      </div>

      {/* Navigation Confirmation Dialog */}
      <AlertDialog open={showNavigationDialog} onOpenChange={setShowNavigationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Page?</AlertDialogTitle>
            <AlertDialogDescription>
              The current form will not be saved. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelNavigation}>Cancel</AlertDialogCancel>
            <Button 
              onClick={confirmNavigation}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
                color: 'white',
                border: 'none'
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
