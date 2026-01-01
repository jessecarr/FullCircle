import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const controlNumber = searchParams.get('controlNumber')

    if (!controlNumber) {
      return NextResponse.json({ error: 'Control number is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('fastbound_inventory')
      .select('*')
      .eq('control_number', controlNumber.toUpperCase())
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
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
