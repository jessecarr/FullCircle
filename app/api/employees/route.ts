import { NextResponse } from 'next/server'
import { requireAuth, createAdminClient } from '@/lib/supabase/api'

// GET - Fetch employees from Supabase Auth (no employees table dependency)
export async function GET(request: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const supabaseAdmin = createAdminClient()

  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    const { data, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    // If email is provided, look up specific employee (non-admin self-lookup)
    if (email) {
      const user = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (!user) {
        return NextResponse.json({ employee: null })
      }

      const rawUser = user as any
      const isBanned = rawUser.banned_until && new Date(rawUser.banned_until) > new Date()

      if (isBanned) {
        return NextResponse.json({ employee: null })
      }

      return NextResponse.json({
        employee: {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
          role: user.user_metadata?.role || 'employee',
          created_at: user.created_at
        }
      })
    }
    
    // Get all active employees that should appear on the timesheet page
    const employees = data.users
      .filter(user => {
        const rawUser = user as any
        const isBanned = rawUser.banned_until && new Date(rawUser.banned_until) > new Date()
        const showOnTimesheet = user.app_metadata?.show_on_timesheet !== false
        return !isBanned && showOnTimesheet
      })
      .map(user => ({
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
        role: user.user_metadata?.role || 'employee',
        created_at: user.created_at
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ employees })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}
