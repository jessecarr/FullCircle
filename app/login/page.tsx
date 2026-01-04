'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const normalizedEmail = email.toLowerCase()

      // Step 1: Attempt to sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password,
      })

      // Step 2: Handle authentication result
      if (authError) {
        toast({
          title: 'Login Failed',
          description: 'Invalid email or password.',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      // Step 3: Check if user is authorized employee from user metadata
      if (authData.session && authData.user) {
        const userMetadata = authData.user.user_metadata
        const userRole = userMetadata?.role
        const employeeName = userMetadata?.name

        // Verify user has required role metadata
        if (!userRole || !['admin', 'manager', 'employee'].includes(userRole)) {
          toast({
            title: 'Access Denied',
            description: 'You are not authorized to access this system.',
            variant: 'destructive',
          })
          await supabase.auth.signOut()
          setLoading(false)
          return
        }

        // Step 4: Successful login
        toast({
          title: 'Login Successful',
          description: `Welcome back, ${employeeName || 'User'}!`,
        })
        
        // Use router.replace instead of push to prevent back button issues
        router.replace('/landing')
      } else {
        toast({
          title: 'Login Failed',
          description: 'Unable to establish session.',
          variant: 'destructive',
        })
        setLoading(false)
      }
    } catch (error) {
      console.error('Login error:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Employee Login
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            FullCircle Firearms Management System
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="employee@company.com"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>
                This system is for authorized employees only.
              </p>
              <p className="mt-1">
                Contact your administrator if you need access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
