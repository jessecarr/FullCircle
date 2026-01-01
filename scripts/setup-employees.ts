import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Function to hash password (simple version - in production, use bcrypt)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// Function to create an employee
async function createEmployee(email: string, password: string, name: string, role: 'admin' | 'manager' | 'employee' = 'employee') {
  try {
    // Hash the password
    const passwordHash = hashPassword(password)

    // First, create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return null
    }

    // Then create the employee record
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .insert({
        id: authData.user.id,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name,
        role,
        is_active: true,
      })
      .select()
      .single()

    if (employeeError) {
      console.error('Error creating employee:', employeeError)
      // Clean up auth user if employee creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return null
    }

    console.log(`✅ Employee created successfully: ${name} (${email})`)
    return employeeData
  } catch (error) {
    console.error('Error creating employee:', error)
    return null
  }
}

// Example usage - you can modify this to add your employees
async function setupInitialEmployees() {
  console.log('🔧 Setting up initial employees...\n')

  // Create admin user
  const admin = await createEmployee(
    'Admin@fullcircle.com',
    'Admin123!',
    'System Administrator',
    'admin'
  )

  // Create manager user
  const manager = await createEmployee(
    'Manager@fullcircle.com',
    'Manager123!',
    'Store Manager',
    'manager'
  )

  // Create employee user
  const employee = await createEmployee(
    'Employee@fullcircle.com',
    'Employee123!',
    'Sales Employee',
    'employee'
  )

  console.log('\n✨ Setup complete!')
  console.log('📋 Login credentials:')
  console.log('Admin: Admin@fullcircle.com / Admin123!')
  console.log('Manager: Manager@fullcircle.com / Manager123!')
  console.log('Employee: Employee@fullcircle.com / Employee123!')
}

// Run the setup
if (require.main === module) {
  setupInitialEmployees().catch(console.error)
}

export { createEmployee, hashPassword }
