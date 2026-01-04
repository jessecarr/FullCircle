const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createMissingAuthUsers() {
  const employees = [
    {
      email: 'admin@fullcircle.com',
      password: 'Admin123!',
      name: 'System Administrator',
      role: 'admin',
      employee_id: '003b2a69-4bf4-4b00-8f60-0ec6fda52adb'
    },
    {
      email: 'manager@fullcircle.com',
      password: 'Manager123!',
      name: 'Store Manager',
      role: 'manager',
      employee_id: 'a13695cf-eaaa-44fa-b22b-9d952cda4ca1'
    },
    {
      email: 'employee@fullcircle.com',
      password: 'Employee123!',
      name: 'Sales Employee',
      role: 'employee',
      employee_id: '541adca6-c147-4837-89d4-2d3759f69db7'
    }
  ]

  for (const employee of employees) {
    try {
      console.log(`Processing ${employee.email}...`)
      
      // Check if user exists
      const { data: existingUser, error: checkError } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', employee.email)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error(`Error checking user ${employee.email}:`, checkError)
        continue
      }

      if (existingUser) {
        console.log(`✅ User ${employee.email} already exists`)
        
        // Update user metadata if needed
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          {
            user_metadata: {
              name: employee.name,
              role: employee.role,
              employee_id: employee.employee_id
            }
          }
        )
        
        if (updateError) {
          console.error(`❌ Failed to update metadata for ${employee.email}:`, updateError.message)
        } else {
          console.log(`✅ Updated metadata for ${employee.email}`)
        }
      } else {
        // Create new user
        const { data, error } = await supabase.auth.admin.createUser({
          email: employee.email,
          password: employee.password,
          email_confirm: true,
          user_metadata: {
            name: employee.name,
            role: employee.role,
            employee_id: employee.employee_id
          }
        })

        if (error) {
          console.error(`❌ Failed to create user ${employee.email}:`, error.message)
        } else {
          console.log(`✅ Created auth user for ${employee.email}`)
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${employee.email}:`, error.message)
    }
  }
}

createMissingAuthUsers().then(() => {
  console.log('Script completed')
}).catch(error => {
  console.error('Script failed:', error)
})
