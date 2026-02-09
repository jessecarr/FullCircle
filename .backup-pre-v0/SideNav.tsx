'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useNavigationGuard } from '@/hooks/useNavigationGuard'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  X, 
  FileText, 
  Package, 
  Shield, 
  List, 
  Settings,
  LayoutGrid,
  Users,
  Calendar,
  Truck,
  Archive,
  Clock,
  BarChart3,
  ShoppingCart,
  LogOut,
  ArrowUpFromLine,
  ArrowDownToLine,
  CircleDot,
  ScrollText
} from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
}

interface NavSection {
  label: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    label: 'MAIN',
    items: [
      { title: 'Dashboard', href: '/landing', icon: LayoutGrid },
      { title: 'View All Forms', href: '/?tab=view-all', icon: List },
    ]
  },
  {
    label: 'FORMS',
    items: [
      { title: 'Special Order', href: '/?tab=special-order', icon: ShoppingCart },
      { title: 'Inbound Transfer', href: '/?tab=inbound-transfer', icon: ArrowDownToLine },
      { title: 'Outbound Transfer', href: '/?tab=outbound-transfer', icon: ArrowUpFromLine },
      { title: 'Suppressor Approval', href: '/?tab=suppressor-approval', icon: CircleDot },
      { title: 'Consignment', href: '/?tab=consignment', icon: ScrollText },
      { title: 'Quote', href: '/?tab=quote', icon: FileText },
    ]
  },
  {
    label: 'TOOLS',
    items: [
      { title: 'Deleted Forms Archive', href: '/archive', icon: Archive },
      { title: "Graf's Schedule", href: '/grafs-schedule', icon: Calendar },
      { title: "Graf's Arriving", href: '/grafs-arriving', icon: Truck },
      { title: 'Order Recommendations', href: '/ordering', icon: ShoppingCart },
      { title: 'Time Sheets', href: '/timesheet', icon: Clock },
      { title: 'Timesheet Stats', href: '/timesheet-stats', icon: BarChart3, adminOnly: true },
      { title: 'Manage Users', href: '/admin/users', icon: Users, adminOnly: true },
      { title: 'Manage Customers', href: '/customers', icon: Users },
    ]
  },
]

const bottomItems: NavItem[] = [
  { title: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
]

export function SideNav({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const { userRole, signOut } = useAuth()
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
      onClose()
    } else {
      onClose()
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

  const isActive = (href: string) => {
    if (href === '/landing') return pathname === '/landing'
    return pathname + (typeof window !== 'undefined' ? window.location.search : '') === href
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Side Menu */}
      <div 
        className={`fixed top-0 left-0 h-full w-72 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'linear-gradient(180deg, #0c1222 0%, #111827 50%, #0f172a 100%)',
          boxShadow: '4px 0 20px rgba(0, 0, 0, 0.5)',
          borderRight: '1px solid rgba(59, 130, 246, 0.15)'
        }}
      >
        {/* Menu Header */}
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              FC
            </div>
            <span className="text-white font-semibold text-base">Full Circle Forms</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Sections - scrollable */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {navSections.map((section) => {
            const filteredItems = section.items.filter(item => !item.adminOnly || userRole === 'admin')
            if (filteredItems.length === 0) return null
            return (
              <div key={section.label} className="mb-4">
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {section.label}
                </div>
                {filteredItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleNavClick(item.href)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 mb-0.5 ${
                        active 
                          ? 'bg-blue-600 text-white' 
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5 flex-shrink-0" style={{ width: '18px', height: '18px' }} />
                      <span className="text-sm font-medium">{item.title}</span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* Bottom Section - Settings & Sign Out */}
        <div className="px-3 py-4 border-t border-slate-800">
          {bottomItems
            .filter(item => !item.adminOnly || userRole === 'admin')
            .map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-slate-400 hover:bg-slate-800/60 hover:text-white transition-all duration-150 mb-0.5"
                >
                  <Icon className="flex-shrink-0" style={{ width: '18px', height: '18px' }} />
                  <span className="text-sm font-medium">{item.title}</span>
                </button>
              )
            })}
          <button
            onClick={() => { signOut(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-150"
          >
            <LogOut className="flex-shrink-0" style={{ width: '18px', height: '18px' }} />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
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
