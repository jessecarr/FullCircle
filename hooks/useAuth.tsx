'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  userRole: string | null
  userName: string | null
  employeeId: string | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  userRole: null,
  userName: null,
  employeeId: null,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const metadata = session.user.user_metadata
        setUserRole(metadata?.role || null)
        setUserName(metadata?.name || null)
        setEmployeeId(metadata?.employee_id || null)
      } else {
        setUserRole(null)
        setUserName(null)
        setEmployeeId(null)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const metadata = session.user.user_metadata
        setUserRole(metadata?.role || null)
        setUserName(metadata?.name || null)
        setEmployeeId(metadata?.employee_id || null)
      } else {
        setUserRole(null)
        setUserName(null)
        setEmployeeId(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserRole(null)
    setUserName(null)
    setEmployeeId(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, userRole, userName, employeeId }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
