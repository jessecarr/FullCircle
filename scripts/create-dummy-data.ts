import { createClient } from '@supabase/supabase-js'

// This script creates dummy data for testing all form types
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createDummyData() {
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
      product_lines: JSON.stringify([
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
      ]),
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
      product_lines: JSON.stringify([
        {
          item: 'Smith & Wesson M&P Shield',
          quantity: 1,
          price: 379.99
        }
      ]),
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
      product_lines: JSON.stringify([
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
      ]),
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
      product_lines: JSON.stringify([
        {
          item: 'Sig Sauer P320',
          quantity: 1,
          price: 569.99
        }
      ]),
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
      product_lines: JSON.stringify([
        {
          item: 'Springfield XD-M',
          quantity: 1,
          price: 529.99
        }
      ]),
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
      product_lines: JSON.stringify([
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
      ]),
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
      product_lines: JSON.stringify([
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
      ]),
      total_price: 1099.99,
      special_requests: 'Customer wants email updates on NFA status',
      drivers_license: 'D11223344',
      license_expiration: new Date('2025-08-15'),
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
      product_lines: JSON.stringify([
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
      ]),
      total_price: 1199.99,
      special_requests: 'Customer approved for trust',
      drivers_license: 'D44332211',
      license_expiration: new Date('2026-02-28'),
      status: 'ordered'
    }
  ]

  try {
    // Create Special Orders
    console.log('Creating Special Orders...')
    for (const order of specialOrders) {
      const { error } = await supabase
        .from('special_orders')
        .insert(order)
      if (error) {
        console.error('Error creating special order:', error)
      } else {
        console.log(`✅ Created special order for ${order.customer_name}`)
      }
    }

    // Create Inbound Transfers
    console.log('Creating Inbound Transfers...')
    for (const transfer of inboundTransfers) {
      const { error } = await supabase
        .from('inbound_transfers')
        .insert(transfer)
      if (error) {
        console.error('Error creating inbound transfer:', error)
      } else {
        console.log(`✅ Created inbound transfer for ${transfer.customer_name}`)
      }
    }

    // Create Outbound Transfers
    console.log('Creating Outbound Transfers...')
    for (const transfer of outboundTransfers) {
      const { error } = await supabase
        .from('outbound_transfers')
        .insert(transfer)
      if (error) {
        console.error('Error creating outbound transfer:', error)
      } else {
        console.log(`✅ Created outbound transfer for ${transfer.customer_name}`)
      }
    }

    // Create Suppressor Approvals
    console.log('Creating Suppressor Approvals...')
    for (const suppressor of suppressorApprovals) {
      const { error } = await supabase
        .from('suppressor_approvals')
        .insert(suppressor)
      if (error) {
        console.error('Error creating suppressor approval:', error)
      } else {
        console.log(`✅ Created suppressor approval for ${suppressor.customer_name}`)
      }
    }

    console.log('\n🎉 Dummy data creation complete!')
    console.log('📊 Summary:')
    console.log('  - 2 Special Orders')
    console.log('  - 2 Inbound Transfers')
    console.log('  - 2 Outbound Transfers')
    console.log('  - 2 Suppressor Approvals')
    console.log('  - Total: 8 records created')

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

createDummyData().then(() => {
  console.log('Script completed')
}).catch(error => {
  console.error('Script failed:', error)
})
