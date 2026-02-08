import { NextResponse } from 'next/server'
import { requireAuth, createAdminClient } from '@/lib/supabase/api'

const FORM_TYPE_PREFIXES: Record<string, string> = {
  'special_order': 'SPC',
  'inbound_transfer': 'IN',
  'outbound_transfer': 'OUT',
  'suppressor_approval': 'SUPP',
  'consignment': 'CONS',
  'quote': 'QUO'
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { formType } = body
    
    console.log('Generate order number request:', { formType })

    if (!formType || !FORM_TYPE_PREFIXES[formType]) {
      console.error('Invalid form type:', formType)
      return NextResponse.json({ error: `Invalid form type: ${formType}` }, { status: 400 })
    }

    const prefix = FORM_TYPE_PREFIXES[formType]
    const supabaseAdmin = createAdminClient()

    // Use the database function for atomic order number generation
    const { data, error } = await supabaseAdmin.rpc('generate_order_number', {
      p_form_type: formType,
      p_prefix: prefix
    })

    console.log('RPC result:', { data, error })

    if (error) {
      console.error('RPC error:', error)
      throw new Error(`Database function error: ${error.message}`)
    }

    if (!data) {
      throw new Error('No order number returned from database function')
    }

    return NextResponse.json({ orderNumber: data })
  } catch (error) {
    console.error('Error generating order number:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      error: 'Failed to generate order number', 
      details: errorMessage 
    }, { status: 500 })
  }
}
