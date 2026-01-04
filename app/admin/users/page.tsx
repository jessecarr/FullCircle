'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Edit, Trash2, ArrowLeft } from 'lucide-react'

interface NewUser {
  email: string
  password: string
  name: string
  role: 'admin' | 'manager' | 'employee'
}

interface AuthUser {
  id: string
  email: string
  created_at: string
  raw_user_meta_data: {
    name?: string
    role?: string
    employee_id?: string
  }
}

export default function UserManagementPage() {
  const { user, userRole } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<AuthUser[]>([])
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    password: '',
    name: '',
    role: 'employee'
  })
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null)
  const [editRole, setEditRole] = useState<'admin' | 'manager' | 'employee'>('employee')

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users')
      }
      
      setUsers(data.users)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      })
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create the auth user with metadata
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          name: newUser.name,
          role: newUser.role
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        if (data.error?.includes('already registered')) {
          toast({
            title: 'User Exists',
            description: 'A user with this email already exists',
            variant: 'destructive',
          })
        } else {
          throw new Error(data.error || 'Failed to create user')
        }
        return
      }

      toast({
        title: 'User Created',
        description: `Successfully created user: ${newUser.email}`,
      })

      // Reset form
      setNewUser({
        email: '',
        password: '',
        name: '',
        role: 'employee'
      })

      // Refresh users list
      fetchUsers()
    } catch (error) {
      console.error('Error creating user:', error)
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to create user',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRole = async () => {
    if (!editingUser) return

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: editingUser.id,
          role: editRole
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user role')
      }

      toast({
        title: 'Role Updated',
        description: `Successfully updated role for ${editingUser.email}`,
      })

      setEditingUser(null)
      fetchUsers()
    } catch (error) {
      console.error('Error updating user role:', error)
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}?`)) {
      return
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      toast({
        title: 'User Deleted',
        description: `Successfully deleted user: ${userEmail}`,
      })

      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        {/* Back Button */}
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/landing')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Landing
          </Button>
        </div>
        
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-gray-600">Create and manage user accounts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create New User Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create New User</CardTitle>
            <CardDescription>
              Add a new user to the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                  placeholder="user@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  placeholder="Enter password"
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  required
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({ ...newUser, role: value as 'admin' | 'manager' | 'employee' })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Creating User...' : 'Create User'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Existing Users</CardTitle>
            <CardDescription>
              Manage existing user accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No users found</p>
              ) : (
                users.map((authUser) => (
                  <div key={authUser.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{authUser.email}</p>
                        <p className="text-sm text-gray-600">
                          Name: {authUser.raw_user_meta_data.name || 'Not set'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Role: <span className="inline-block px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                            {authUser.raw_user_meta_data.role || 'No role'}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          Created: {new Date(authUser.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingUser(authUser)
                                setEditRole((authUser.raw_user_meta_data.role || 'employee') as 'admin' | 'manager' | 'employee')
                              }}
                              disabled={authUser.id === user?.id}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit User Role</DialogTitle>
                              <DialogDescription>
                                Change the role for {editingUser?.email || 'this user'}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2 relative z-[999999]">
                                <Label htmlFor="editRole">New Role</Label>
                                <Select
                                  value={editRole}
                                  onValueChange={(value) => setEditRole(value as 'admin' | 'manager' | 'employee')}
                                >
                                  <SelectTrigger className="bg-white border-gray-300">
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white border-gray-300 z-[999999]">
                                    <SelectItem value="employee">Employee</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setEditingUser(null)
                                  setEditRole('employee')
                                }}
                              >
                                Cancel
                              </Button>
                              <Button onClick={handleUpdateRole}>
                                Update Role
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(authUser.id, authUser.email)}
                          disabled={authUser.id === user?.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
