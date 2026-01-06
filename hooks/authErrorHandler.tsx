'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export function AuthErrorHandler({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const handleAuthError = (event: any) => {
      if (event?.detail?.error?.message?.includes('Invalid Refresh Token')) {
        console.log('Auth error detected, clearing session')
        supabase.auth.signOut()
        router.push('/login')
      }
    }

    // Listen for custom auth error events
    window.addEventListener('supabase.auth.error', handleAuthError)
    
    // Also catch unhandled promise rejections for auth errors
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('Invalid Refresh Token')) {
        console.log('Unhandled auth error, clearing session')
        supabase.auth.signOut()
        router.push('/login')
        event.preventDefault()
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('supabase.auth.error', handleAuthError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [router])

  return <>{children}</>
}
