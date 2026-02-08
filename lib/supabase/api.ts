import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Service role client for server-side operations that bypass RLS
// Use this for trusted operations like bulk imports, admin tasks, etc.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// Server client that reads the user's session from cookies
// Use this in API routes that need to act as the authenticated user
export async function createApiClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — safe to ignore
          }
        },
      },
    }
  )
}

// Verify the request is from an authenticated user and return their info.
// Returns { user, supabase } on success, or a NextResponse error on failure.
export async function requireAuth() {
  const supabase = await createApiClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      supabase,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const role = user.user_metadata?.role
  if (!role || !['admin', 'manager', 'employee'].includes(role)) {
    return {
      user: null,
      supabase,
      error: NextResponse.json({ error: 'Forbidden: invalid role' }, { status: 403 }),
    }
  }

  return { user, supabase, error: null }
}

// Verify the request is from an admin user
export async function requireAdmin() {
  const result = await requireAuth()
  if (result.error) return result

  if (result.user!.user_metadata?.role !== 'admin') {
    return {
      user: null,
      supabase: result.supabase,
      error: NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 }),
    }
  }

  return result
}
