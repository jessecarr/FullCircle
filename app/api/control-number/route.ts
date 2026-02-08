import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/api'
import { createAdminClient } from '@/lib/supabase/api'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const controlNumber = searchParams.get('controlNumber')

    if (!controlNumber) {
      return NextResponse.json({ error: 'Control number is required' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin
      .from('fastbound_inventory')
      .select('*')
      .eq('control_number', controlNumber.toUpperCase())
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Control number not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error searching by control number:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
