import { NextResponse } from 'next/server'
import { requireAdmin, createAdminClient } from '@/lib/supabase/api'

// POST - Sync all auth users to employees table
export async function POST() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const supabaseAdmin = createAdminClient()

  try {
    // Get all users from Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const results = {
      synced: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Sync each user to employees table
    for (const user of authData.users) {
      const { error: employeeError } = await supabaseAdmin
        .from('employees')
        .upsert({
          id: user.id,
          email: user.email?.toLowerCase() || '',
          password_hash: 'auth_managed',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
          role: user.user_metadata?.role || 'employee',
          is_active: true,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

      if (employeeError) {
        results.failed++
        results.errors.push(`${user.email}: ${employeeError.message}`)
      } else {
        results.synced++
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Synced ${results.synced} users, ${results.failed} failed`,
      results 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to sync employees' }, { status: 500 })
  }
}
