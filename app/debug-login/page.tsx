'use client'

// Debug login page for testing authentication flow
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'

export default function DebugLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>({})
  const router = useRouter()
  const { toast } = useToast()

  const handleCreateUsers = async () => {
    setLoading(true)
    setDebugInfo({})

    const employees = [
      {
        email: 'admin@fullcircle.com',
        password: 'Admin123!',
        name: 'System Administrator',
        role: 'admin',
        employee_id: '003b2a69-4bf4-4b00-8f60-0ec6fda52adb'
      },
      {
        email: 'manager@fullcircle.com',
        password: 'Manager123!',
        name: 'Store Manager',
        role: 'manager',
        employee_id: 'a13695cf-eaaa-44fa-b22b-9d952cda4ca1'
      },
      {
        email: 'employee@fullcircle.com',
        password: 'Employee123!',
        name: 'Sales Employee',
        role: 'employee',
        employee_id: '541adca6-c147-4837-89d4-2d3759f69db7'
      }
    ]

    const results = []

    for (const employee of employees) {
      try {
        console.log(`Creating user: ${employee.email}`)
        
        const { data, error } = await supabase.auth.signUp({
          email: employee.email,
          password: employee.password,
          options: {
            data: {
              name: employee.name,
              role: employee.role,
              employee_id: employee.employee_id
            }
          }
        })

        results.push({
          email: employee.email,
          success: !error,
          data: data,
          error: error?.message
        })

        if (error && !error.message.includes('already registered')) {
          console.error(`Failed to create ${employee.email}:`, error.message)
        } else {
          console.log(`✅ ${employee.email} processed`)
        }
      } catch (e) {
        results.push({
          email: employee.email,
          success: false,
          error: e.message
        })
      }
    }

    setDebugInfo({ createUserResults: results })
    setLoading(false)
    
    toast({
      title: 'User Creation Complete',
      description: `Processed ${employees.length} users. Check debug info for details.`,
    })
  }
    e.preventDefault()
    setLoading(true)
    setDebugInfo({})

    try {
      // Step 1: Try to sign in directly with Supabase Auth
      console.log('Step 1: Signing in with Supabase Auth...')
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: password,
      })

      setDebugInfo((prev: any) => ({ ...prev, step1: { authData, authError } }))

      if (authError) {
        console.log('Auth error:', authError)
        toast({
          title: 'Login Failed',
          description: authError.message,
          variant: 'destructive',
        })
        return
      }

      console.log('Login successful:', authData)

      // Step 2: Check user metadata for authorization
      if (authData.session && authData.user) {
        const userMetadata = authData.user.user_metadata
        const userRole = userMetadata?.role
        const employeeName = userMetadata?.name

        setDebugInfo((prev: any) => ({ ...prev, step2: { userMetadata, userRole, employeeName } }))

        // Verify user has required role metadata
        if (!userRole || !['admin', 'manager', 'employee'].includes(userRole)) {
          console.log('Access denied: Invalid role', userRole)
          toast({
            title: 'Access Denied',
            description: 'You are not authorized to access this system.',
            variant: 'destructive',
          })
          await supabase.auth.signOut()
          return
        }

        console.log('Authorization successful:', { userRole, employeeName })
        
        toast({
          title: 'Login Successful',
          description: `Welcome, ${employeeName || 'User'}!`,
        })

        router.push('/dashboard')
      } else {
        toast({
          title: 'Login Failed',
          description: 'Unable to establish session.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Login error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setDebugInfo((prev: any) => ({ ...prev, error: errorMessage }))
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Debug Login
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Test login with debugging
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Debug Sign In</CardTitle>
            <CardDescription>
              Enter credentials to test login
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
                  placeholder="admin@fullcircle.com"
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
                  placeholder="Enter password"
                  className="w-full"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Testing...' : 'Test Login'}
              </Button>
            </form>

            {/* Debug Info */}
            {Object.keys(debugInfo).length > 0 && (
              <div className="mt-4 p-4 bg-gray-100 rounded text-xs">
                <h4 className="font-bold mb-2">Debug Info:</h4>
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>Use your configured test credentials to login</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
