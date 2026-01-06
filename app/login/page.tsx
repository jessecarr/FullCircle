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
    <>
      <style jsx>{`
        :global(html) {
          font-size: 16px !important; /* Override global 12px back to full size */
        }
        
        :global(body) {
          background: #0a0a0a !important;
          position: relative;
          overflow: hidden;
        }
        
        :global(body::before) {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            /* Edge vignette - black fade on all edges */
            radial-gradient(circle at 50% 50%, transparent 30%, rgba(10, 10, 10, 0.8) 100%),
            /* Blue gradients in corners */
            radial-gradient(circle at 15% 15%, rgba(59, 130, 246, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 85% 15%, rgba(59, 130, 246, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 5% 5%, rgba(96, 165, 250, 0.5) 0%, transparent 40%),
            radial-gradient(circle at 95% 5%, rgba(96, 165, 250, 0.5) 0%, transparent 40%),
            radial-gradient(circle at 0% 10%, rgba(147, 197, 253, 0.25) 0%, transparent 30%),
            radial-gradient(circle at 100% 10%, rgba(147, 197, 253, 0.25) 0%, transparent 30%),
            linear-gradient(45deg, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
            linear-gradient(135deg, rgba(59, 130, 246, 0.08) 50%, transparent 100%);
          pointer-events: none;
          z-index: 0;
          animation: loginGradientShift 10s ease-in-out infinite alternate;
        }
        
        :global(.login-card) {
          background: 
            radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 30%),
            radial-gradient(circle at 50% 100%, rgba(59, 130, 246, 0.15) 0%, transparent 30%),
            radial-gradient(circle at 0% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 30%),
            radial-gradient(circle at 100% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 30%),
            radial-gradient(circle at 85% 15%, rgba(96, 165, 250, 0.2) 0%, transparent 25%),
            radial-gradient(circle at 15% 15%, rgba(96, 165, 250, 0.2) 0%, transparent 25%),
            radial-gradient(circle at 85% 85%, rgba(96, 165, 250, 0.2) 0%, transparent 25%),
            radial-gradient(circle at 15% 85%, rgba(96, 165, 250, 0.2) 0%, transparent 25%),
            rgba(17, 24, 39, 0.98) !important;
          border: 1px solid rgba(59, 130, 246, 0.2) !important;
          backdrop-filter: blur(10px) !important;
          box-shadow: 0 8px 32px rgba(17, 24, 39, 0.6) !important;
        }
        
        :global(.login-card [data-radix-dialog-content]) {
          background: 
            radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 30%),
            radial-gradient(circle at 50% 100%, rgba(59, 130, 246, 0.15) 0%, transparent 30%),
            radial-gradient(circle at 0% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 30%),
            radial-gradient(circle at 100% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 30%),
            radial-gradient(circle at 85% 15%, rgba(96, 165, 250, 0.2) 0%, transparent 25%),
            radial-gradient(circle at 15% 15%, rgba(96, 165, 250, 0.2) 0%, transparent 25%),
            radial-gradient(circle at 85% 85%, rgba(96, 165, 250, 0.2) 0%, transparent 25%),
            radial-gradient(circle at 15% 85%, rgba(96, 165, 250, 0.2) 0%, transparent 25%),
            rgba(17, 24, 39, 0.98) !important;
          border: 1px solid rgba(59, 130, 246, 0.2) !important;
          backdrop-filter: blur(10px) !important;
          box-shadow: 0 8px 32px rgba(17, 24, 39, 0.6) !important;
        }
        
        :global(.login-card input), :global(.login-card textarea), :global(.login-card select) {
          background-color: rgba(17, 24, 39, 0.8) !important;
          color: #ffffff !important;
          border: 1px solid rgba(59, 130, 246, 0.3) !important;
          border-radius: 0.5rem !important;
        }
        
        :global(.login-card input::placeholder), :global(.login-card textarea::placeholder) {
          color: rgba(148, 163, 184, 0.7) !important;
        }
        
        :global(.login-card input:focus), :global(.login-card textarea:focus), :global(.login-card select:focus) {
          border-color: rgba(59, 130, 246, 0.6) !important;
          outline: none !important;
          box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3) !important;
        }
        
        :global(.login-card .card-content) {
          background-color: rgba(17, 24, 39, 0.7) !important;
          border-radius: 0.5rem !important;
          border: 1px solid rgba(59, 130, 246, 0.2) !important;
        }
        
        :global(.login-card form) {
          background-color: rgba(17, 24, 39, 0.7) !important;
          border-radius: 0.5rem !important;
          padding: 1.5rem !important;
        }
        
        :global(.login-card button[type="submit"]) {
          background-color: rgba(59, 130, 246, 0.8) !important;
          border: 1px solid rgba(59, 130, 246, 0.4) !important;
          color: #ffffff !important;
        }
        
        :global(.login-card button[type="submit"]:hover) {
          background-color: rgba(59, 130, 246, 0.9) !important;
          border: 1px solid rgba(59, 130, 246, 0.6) !important;
        }
        
        @keyframes loginGradientShift {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          100% {
            transform: translate(-10px, 10px) scale(1.05);
          }
        }
      `}</style>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ position: 'relative', zIndex: 1 }}>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-5xl font-extrabold text-white">
            Login
          </h2>
          <p className="mt-2 text-sm text-white">
            Full Circle Form Management System
          </p>
        </div>
        
        <Card className="login-card">
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
    </>
  )
}
