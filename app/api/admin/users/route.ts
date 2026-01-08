import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const users = data.users.map(user => ({
      id: user.id,
      email: user.email || '',
      created_at: user.created_at,
      user_metadata: user.user_metadata || {}
    }))

    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { email, password, name, role } = await request.json()

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role
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
  try {
    const { userId, role, password } = await request.json()

    // Get current user metadata to preserve other fields
    const { data: currentUser } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (currentUser?.user?.user_metadata) {
      // Prepare update data
      const updateData: any = {
        ...currentUser.user.user_metadata,
        role
      }

      // Update user metadata first
      const { data: metadataResult, error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: updateData
      })

      if (metadataError) {
        return NextResponse.json({ error: metadataError.message }, { status: 400 })
      }

      // Update password if provided
      if (password && password.trim() !== '') {
        const { data: passwordResult, error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: password
        })

        if (passwordError) {
          return NextResponse.json({ error: passwordError.message }, { status: 400 })
        }
      }

      return NextResponse.json({ success: true, data: metadataResult })
    } else {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
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
