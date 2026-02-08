import { NextResponse } from 'next/server'
import { requireAuth, createAdminClient } from '@/lib/supabase/api'

// GET - Fetch all employees (for admin dropdown and employee list)
export async function GET(request: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const supabaseAdmin = createAdminClient()

  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    
    // If email is provided, look up specific employee
    if (email) {
      const { data, error } = await supabaseAdmin
        .from('employees')
        .select('id, email, name, role, is_active, created_at')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      
      return NextResponse.json({ employee: data || null })
    }
    
    // Get all active employees from the employees table
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('id, email, name, role, is_active, created_at')
      .eq('is_active', true)
      .order('name', { ascending: true })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ employees: data || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}
