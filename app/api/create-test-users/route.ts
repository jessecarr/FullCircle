import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST() {
  try {
    // Create admin user
    const { data: adminUser, error: adminError } = await supabase.auth.admin.createUser({
      email: 'Admin@fullcircle.com',
      password: 'Admin123!',
      email_confirm: true,
      user_metadata: {
        name: 'System Administrator',
        role: 'admin'
      }
    })

    if (adminError) {
      console.error('Admin user creation error:', adminError)
    } else {
      console.log('Admin user created:', adminUser.user?.id)
      
      // Update employee record with the correct user ID
      await supabase
        .from('employees')
        .update({ id: adminUser.user!.id })
        .eq('email', 'Admin@fullcircle.com')
    }

    // Create manager user
    const { data: managerUser, error: managerError } = await supabase.auth.admin.createUser({
      email: 'Manager@fullcircle.com',
      password: 'Manager123!',
      email_confirm: true,
      user_metadata: {
        name: 'Store Manager',
        role: 'manager'
      }
    })

    if (managerError) {
      console.error('Manager user creation error:', managerError)
    } else {
      console.log('Manager user created:', managerUser.user?.id)
      
      // Update employee record with the correct user ID
      await supabase
        .from('employees')
        .update({ id: managerUser.user!.id })
        .eq('email', 'Manager@fullcircle.com')
    }

    // Create employee user
    const { data: employeeUser, error: employeeError } = await supabase.auth.admin.createUser({
      email: 'Employee@fullcircle.com',
      password: 'Employee123!',
      email_confirm: true,
      user_metadata: {
        name: 'Sales Employee',
        role: 'employee'
      }
    })

    if (employeeError) {
      console.error('Employee user creation error:', employeeError)
    } else {
      console.log('Employee user created:', employeeUser.user?.id)
      
      // Update employee record with the correct user ID
      await supabase
        .from('employees')
        .update({ id: employeeUser.user!.id })
        .eq('email', 'Employee@fullcircle.com')
    }

    return NextResponse.json({ 
      message: 'Test users created successfully',
      users: {
        admin: adminUser.user?.id,
        manager: managerUser.user?.id,
        employee: employeeUser.user?.id
      }
    })
  } catch (error) {
    console.error('Error creating test users:', error)
    return NextResponse.json(
      { error: 'Failed to create test users' },
      { status: 500 }
    )
  }
}
