'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface NavigationGuardContextType {
  isFormActive: boolean
  setFormActive: (active: boolean) => void
  pendingNavigation: string | null
  setPendingNavigation: (path: string | null) => void
  showNavigationDialog: boolean
  setShowNavigationDialog: (show: boolean) => void
  requestNavigation: (path: string) => boolean // Returns true if navigation can proceed immediately
}

const NavigationGuardContext = createContext<NavigationGuardContextType | undefined>(undefined)

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const [isFormActive, setFormActive] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [showNavigationDialog, setShowNavigationDialog] = useState(false)

  const requestNavigation = useCallback((path: string): boolean => {
    if (isFormActive) {
      setPendingNavigation(path)
      setShowNavigationDialog(true)
      return false // Navigation blocked, show dialog
    }
    return true // Navigation can proceed
  }, [isFormActive])

  return (
    <NavigationGuardContext.Provider value={{
      isFormActive,
      setFormActive,
      pendingNavigation,
      setPendingNavigation,
      showNavigationDialog,
      setShowNavigationDialog,
      requestNavigation,
    }}>
      {children}
    </NavigationGuardContext.Provider>
  )
}

export function useNavigationGuard() {
  const context = useContext(NavigationGuardContext)
  if (context === undefined) {
    throw new Error('useNavigationGuard must be used within a NavigationGuardProvider')
  }
  return context
}
