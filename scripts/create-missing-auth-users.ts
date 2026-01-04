import { supabase } from '../lib/supabase'

// This script creates auth users for employees that don't have them yet
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
      console.log(`Creating auth user for ${employee.email}...`)
      
      const { data, error } = await supabase.auth.signUp({
        email: employee.email,
        password: employee.password,
        options: {
          data: {
            name: employee.name,
            role: employee.role,
            employee_id: employee.employee_id
          }
        }
      })

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`✅ User ${employee.email} already exists, updating metadata...`)
          
          // Update existing user's metadata
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            data.user?.id || '',
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
          console.error(`❌ Failed to create user ${employee.email}:`, error.message)
        }
      } else {
        console.log(`✅ Created auth user for ${employee.email}`)
      }
    } catch (error) {
      console.error(`❌ Error processing ${employee.email}:`, error)
    }
  }
}

createMissingAuthUsers().then(() => {
  console.log('Script completed')
})
