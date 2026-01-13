import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const FORM_TYPE_PREFIXES: Record<string, string> = {
  'special_order': 'SPC',
  'inbound_transfer': 'IN',
  'outbound_transfer': 'OUT',
  'suppressor_approval': 'SUPP',
  'consignment': 'CONS',
  'quote': 'QUO'
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { formType } = body
    
    console.log('Generate order number request:', { formType })

    if (!formType || !FORM_TYPE_PREFIXES[formType]) {
      console.error('Invalid form type:', formType)
      return NextResponse.json({ error: `Invalid form type: ${formType}` }, { status: 400 })
    }

    const prefix = FORM_TYPE_PREFIXES[formType]

    // Create supabase client with service role key for bypassing RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials:', { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!supabaseServiceKey 
      })
      return NextResponse.json({ 
        error: 'Server configuration error', 
        details: 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable' 
      }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

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
