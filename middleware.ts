import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // TEMPORARILY DISABLED FOR TESTING
  // Remove this return statement to re-enable middleware
  if (req.nextUrl.pathname.startsWith('/debug-login') || req.nextUrl.pathname.startsWith('/landing') || req.nextUrl.pathname.startsWith('/dashboard') || req.nextUrl.pathname === '/') {
    return res
  }
  
  // Create Supabase client for middleware using cookies
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          cookie: req.headers.get('cookie') || '',
        },
      },
    }
  )

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/debug-login', '/landing', '/dashboard']
  const isPublicRoute = publicRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  )

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    const redirectUrl = new URL('/login', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated and trying to access login page, redirect to landing
  if (user && req.nextUrl.pathname.startsWith('/login')) {
    const redirectUrl = new URL('/landing', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // For authenticated users, verify they are employees
  if (user && !isPublicRoute) {
    try {
      // Use service role key for admin operations
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Check if user exists in employees table
      const { data: employee, error } = await supabaseAdmin
        .from('employees')
        .select('id, role, is_active')
        .eq('id', user.id)
        .eq('is_active', true)
        .single()

      if (error || !employee) {
        // User is not an active employee, sign them out and redirect to login
        await supabase.auth.signOut()
        const redirectUrl = new URL('/login', req.url)
        redirectUrl.searchParams.set('error', 'not_authorized')
        return NextResponse.redirect(redirectUrl)
      }

      // Add employee role to headers for use in components
      res.headers.set('x-employee-role', employee.role)
      res.headers.set('x-employee-id', employee.id)
    } catch (error) {
      console.error('Middleware error:', error)
      const redirectUrl = new URL('/login', req.url)
      redirectUrl.searchParams.set('error', 'server_error')
      return NextResponse.redirect(redirectUrl)
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}
