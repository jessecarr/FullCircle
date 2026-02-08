import { NextResponse } from 'next/server'
import { requireAdmin, createAdminClient } from '@/lib/supabase/api'

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const supabaseAdmin = createAdminClient()
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const users = data.users.map(user => {
      const rawUser = user as any
      return {
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        user_metadata: user.user_metadata || {},
        is_active: !rawUser.banned_until || new Date(rawUser.banned_until) <= new Date(),
        show_on_timesheet: user.app_metadata?.show_on_timesheet !== false
      }
    })

    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const supabaseAdmin = createAdminClient()

  try {
    const { email, password, name, role, show_on_timesheet } = await request.json()

    // Create user in Supabase Auth with metadata
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role
      },
      app_metadata: {
        show_on_timesheet: show_on_timesheet !== false
      }
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const supabaseAdmin = createAdminClient()

  try {
    const { userId, role, name, password, is_active, show_on_timesheet } = await request.json()

    // Get current user metadata to preserve other fields
    const { data: currentUser } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (currentUser?.user?.user_metadata) {
      // Prepare update data
      const updateData: any = {
        ...currentUser.user.user_metadata,
        role
      }
      
      // Update name if provided
      if (name !== undefined) {
        updateData.name = name
      }

      // Build the auth update payload
      const authUpdate: any = {
        user_metadata: updateData,
        app_metadata: {
          ...currentUser.user.app_metadata,
          show_on_timesheet: show_on_timesheet !== false
        }
      }

      // Handle ban/unban for active status
      if (is_active === false) {
        authUpdate.ban_duration = '876600h' // ~100 years
      } else {
        authUpdate.ban_duration = 'none'
      }

      // Update password if provided
      if (password && password.trim() !== '') {
        authUpdate.password = password
      }

      const { data: updateResult, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdate)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, data: updateResult })
    } else {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const supabaseAdmin = createAdminClient()

  try {
    const { userId } = await request.json()

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
