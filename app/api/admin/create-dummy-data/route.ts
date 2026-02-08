import { NextResponse } from 'next/server'
import { requireAdmin, createAdminClient } from '@/lib/supabase/api'

export async function POST() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const supabaseAdmin = createAdminClient()

  try {
    console.log('Creating dummy data...')

    // Dummy Special Orders
    const specialOrders = [
      {
        customer_name: 'John Smith',
        customer_email: 'john.smith@email.com',
        customer_phone: '555-0101',
        customer_street: '123 Main St',
        customer_city: 'Springfield',
        customer_state: 'IL',
        customer_zip: '62701',
        product_lines: [
          {
            item: 'Glock 19 Gen5',
            quantity: 1,
            price: 549.99
          },
          {
            item: 'Case of 9mm Ammo',
            quantity: 2,
            price: 24.99
          }
        ],
        total_price: 599.97,
        special_requests: 'Please call when order is ready for pickup',
        status: 'pending'
      },
      {
        customer_name: 'Sarah Johnson',
        customer_email: 'sarah.j@email.com',
        customer_phone: '555-0102',
        customer_street: '456 Oak Ave',
        customer_city: 'Springfield',
        customer_state: 'IL',
        customer_zip: '62702',
        product_lines: [
          {
            item: 'Smith & Wesson M&P Shield',
            quantity: 1,
            price: 379.99
          }
        ],
        total_price: 379.99,
        special_requests: 'Customer prefers text message updates',
        status: 'ordered'
      }
    ]

    // Dummy Inbound Transfers
    const inboundTransfers = [
      {
        customer_name: 'Mike Davis',
        customer_email: 'mike.davis@email.com',
        customer_phone: '555-0103',
        customer_street: '789 Pine Rd',
        customer_city: 'Springfield',
        customer_state: 'IL',
        customer_zip: '62703',
        product_lines: [
          {
            item: 'Ruger AR-556',
            quantity: 1,
            price: 799.99
          },
          {
            item: 'Magpul PMAG 30rnd',
            quantity: 3,
            price: 12.99
          }
        ],
        total_price: 838.96,
        special_requests: 'Transfer from Illinois dealer',
        status: 'pending'
      },
      {
        customer_name: 'Emily Wilson',
        customer_email: 'emily.w@email.com',
        customer_phone: '555-0104',
        customer_street: '321 Elm St',
        customer_city: 'Springfield',
        customer_state: 'IL',
        customer_zip: '62704',
        product_lines: [
          {
            item: 'Sig Sauer P320',
            quantity: 1,
            price: 569.99
          }
        ],
        total_price: 569.99,
        special_requests: 'Customer has out-of-state ID',
        status: 'received'
      }
    ]

    // Dummy Outbound Transfers
    const outboundTransfers = [
      {
        customer_name: 'Robert Brown',
        customer_email: 'robert.brown@email.com',
        customer_phone: '555-0105',
        customer_street: '654 Maple Dr',
        customer_city: 'Springfield',
        customer_state: 'IL',
        customer_zip: '62705',
        transferee_name: 'Robert Brown',
        transferee_phone: '555-0105',
        transferee_ffl_name: 'Target Sports USA',
        transferee_ffl_address: '123 Target Way',
        transferee_ffl_city: 'Springfield',
        transferee_ffl_state: 'IL',
        transferee_ffl_zip: '62701',
        transferee_ffl_phone: '555-0999',
        product_lines: [
          {
            item: 'Springfield XD-M',
            quantity: 1,
            price: 529.99
          }
        ],
        total_price: 529.99,
        disposition_date: new Date().toISOString().split('T')[0],
        drivers_license: 'D12345678',
        license_expiration: '2025-12-31',
        status: 'pending'
      },
      {
        customer_name: 'Lisa Anderson',
        customer_email: 'lisa.a@email.com',
        customer_phone: '555-0106',
        customer_street: '987 Cedar Ln',
        customer_city: 'Springfield',
        customer_state: 'IL',
        customer_zip: '62706',
        transferee_name: 'Lisa Anderson',
        transferee_phone: '555-0106',
        transferee_ffl_name: 'Bass Pro Shops',
        transferee_ffl_address: '456 Bass Pro Dr',
        transferee_ffl_city: 'Springfield',
        transferee_ffl_state: 'IL',
        transferee_ffl_zip: '62707',
        transferee_ffl_phone: '555-0888',
        product_lines: [
          {
            item: 'Beretta 92FS',
            quantity: 1,
            price: 649.99
          },
          {
            item: 'Holster - Leather',
            quantity: 1,
            price: 49.99
          }
        ],
        total_price: 699.98,
        disposition_date: new Date().toISOString().split('T')[0],
        drivers_license: 'D87654321',
        license_expiration: '2026-06-30',
        status: 'shipped'
      }
    ]

    // Dummy Suppressor Approvals
    const suppressorApprovals = [
      {
        customer_name: 'David Miller',
        customer_email: 'david.miller@email.com',
        customer_phone: '555-0107',
        customer_street: '147 Birch Ct',
        customer_city: 'Springfield',
        customer_state: 'IL',
        customer_zip: '62708',
        product_lines: [
          {
            item: 'SilencerCo Osprey 9',
            quantity: 1,
            price: 899.99
          },
          {
            item: 'Tax Stamp Fee',
            quantity: 1,
            price: 200.00
          }
        ],
        total_price: 1099.99,
        special_requests: 'Customer wants email updates on NFA status',
        drivers_license: 'D11223344',
        license_expiration: '2025-08-15',
        status: 'pending'
      },
      {
        customer_name: 'Jennifer Taylor',
        customer_email: 'jennifer.t@email.com',
        customer_phone: '555-0108',
        customer_street: '258 Willow Way',
        customer_city: 'Springfield',
        customer_state: 'IL',
        customer_zip: '62709',
        product_lines: [
          {
            item: 'Dead Air Mask',
            quantity: 1,
            price: 999.99
          },
          {
            item: 'Tax Stamp Fee',
            quantity: 1,
            price: 200.00
          }
        ],
        total_price: 1199.99,
        special_requests: 'Customer approved for trust',
        drivers_license: 'D44332211',
        license_expiration: '2026-02-28',
        status: 'ordered'
      }
    ]

    const results = {
      specialOrders: { created: 0, errors: [] as string[] },
      inboundTransfers: { created: 0, errors: [] as string[] },
      outboundTransfers: { created: 0, errors: [] as string[] },
      suppressorApprovals: { created: 0, errors: [] as string[] }
    }

    // Create Special Orders
    for (const order of specialOrders) {
      const { error } = await supabaseAdmin
        .from('special_orders')
        .insert(order)
      if (error) {
        results.specialOrders.errors.push(error.message)
      } else {
        results.specialOrders.created++
      }
    }

    // Create Inbound Transfers
    for (const transfer of inboundTransfers) {
      const { error } = await supabaseAdmin
        .from('inbound_transfers')
        .insert(transfer)
      if (error) {
        results.inboundTransfers.errors.push(error.message)
      } else {
        results.inboundTransfers.created++
      }
    }

    // Create Outbound Transfers
    for (const transfer of outboundTransfers) {
      const { error } = await supabaseAdmin
        .from('outbound_transfers')
        .insert(transfer)
      if (error) {
        results.outboundTransfers.errors.push(error.message)
      } else {
        results.outboundTransfers.created++
      }
    }

    // Create Suppressor Approvals
    for (const suppressor of suppressorApprovals) {
      const { error } = await supabaseAdmin
        .from('suppressor_approvals')
        .insert(suppressor)
      if (error) {
        results.suppressorApprovals.errors.push(error.message)
      } else {
        results.suppressorApprovals.created++
      }
    }

    const totalCreated = Object.values(results).reduce((sum, result) => sum + result.created, 0)
    const totalErrors = Object.values(results).reduce((sum, result) => sum + result.errors.length, 0)

    return NextResponse.json({
      success: totalErrors === 0,
      message: `Created ${totalCreated} dummy records with ${totalErrors} errors`,
      results
    })

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create dummy data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
