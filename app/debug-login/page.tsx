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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setDebugInfo({})

    try {
      // Step 1: Check employee record
      console.log('Step 1: Checking employee record for:', email.toLowerCase())
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', email.toLowerCase())
        .single()

      setDebugInfo((prev: any) => ({ ...prev, step1: { employeeData, employeeError } }))

      if (employeeError || !employeeData) {
        console.log('Employee not found:', employeeError)
        toast({
          title: 'Access Denied',
          description: `Employee not found: ${employeeError?.message || 'Unknown error'}`,
          variant: 'destructive',
        })
        return
      }

      console.log('Employee found:', employeeData)

      // Step 2: Try to create auth user directly
      console.log('Step 2: Creating auth user...')
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password: password,
        options: {
          data: {
            name: employeeData.name,
            role: employeeData.role,
            employee_id: employeeData.id
          }
        }
      })

      setDebugInfo((prev: any) => ({ ...prev, step2: { signUpData, signUpError } }))

      if (signUpError && !signUpError.message.includes('already registered')) {
        console.log('Signup error:', signUpError)
        toast({
          title: 'Signup Failed',
          description: signUpError.message,
          variant: 'destructive',
        })
        return
      }

      // Step 3: Try to sign in
      console.log('Step 3: Signing in...')
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: password,
      })

      setDebugInfo((prev: any) => ({ ...prev, step3: { authData, authError } }))

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
      
      toast({
        title: 'Login Successful',
        description: `Welcome, ${employeeData.name}!`,
      })

      router.push('/dashboard')
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
