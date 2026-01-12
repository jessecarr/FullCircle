'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { Edit, Trash2, ArrowLeft, Eye, EyeOff, Users } from 'lucide-react'

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
  user_metadata: {
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
  const [editName, setEditName] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [deleteUser, setDeleteUser] = useState<AuthUser | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

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

    // Validate password confirmation if password is provided
    if (editPassword && editPassword !== confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match. Please confirm the password.',
        variant: 'destructive'
      })
      return
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: editingUser.id,
          role: editRole,
          name: editName || undefined,
          password: editPassword || undefined
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user')
      }

      toast({
        title: 'User Updated',
        description: `Successfully updated ${editingUser.email}`,
      })

      setEditingUser(null)
      setEditName('')
      setEditPassword('')
      setConfirmPassword('')
      setShowEditDialog(false)
      fetchUsers()
    } catch (error) {
      console.error('Error updating user:', error)
      toast({
        title: 'Error',
        description: 'Failed to update user',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteUser = (user: AuthUser) => {
    setDeleteUser(user)
    setShowDeleteDialog(true)
  }

  const confirmDeleteUser = async () => {
    if (!deleteUser || deleteConfirmation.toLowerCase() !== 'delete') return

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: deleteUser.id })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      toast({
        title: 'User Deleted',
        description: `Successfully deleted user: ${deleteUser.email}`,
      })

      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      })
    } finally {
      setShowDeleteDialog(false)
      setDeleteUser(null)
      setDeleteConfirmation('')
    }
  }

  return (
    <div>
      <Header />
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.push('/settings')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Button>
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
                <>
                {users.map((authUser: AuthUser) => (
                  <Card 
                    key={authUser.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer group landing-card"
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                      <div className="flex items-center">
                        <div className="p-3 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors mr-3">
                          <Users className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{authUser.email}</CardTitle>
                          <CardDescription className="text-sm">
                            {authUser.user_metadata?.name || 'No name set'}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <span className="inline-block px-2 py-1 text-sm rounded bg-blue-100 text-blue-800 font-semibold uppercase">
                          {authUser.user_metadata?.role || 'No role'}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingUser(authUser)
                            setEditRole((authUser.user_metadata?.role || 'employee') as 'admin' | 'manager' | 'employee')
                            setEditName(authUser.user_metadata?.name || '')
                            setEditPassword('')
                            setConfirmPassword('')
                            setShowEditPassword(false)
                            setShowConfirmPassword(false)
                            setShowEditDialog(true)
                          }}
                          className="flex items-center gap-2 group-hover:bg-accent"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(authUser)}
                          disabled={authUser.id === user?.id}
                          className="h-8 w-8 text-red-600 hover:text-red-800"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">
                          Created: {new Date(authUser.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit User Role Dialog */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit User</AlertDialogTitle>
            <AlertDialogDescription>
              Update the role and password for {editingUser?.email || 'this user'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input
                id="editName"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter user's name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRole">Role</Label>
              <Select value={editRole} onValueChange={(value) => setEditRole(value as 'admin' | 'manager' | 'employee')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPassword">New Password (optional)</Label>
              <div className="relative">
                <Input
                  id="editPassword"
                  type={showEditPassword ? "text" : "password"}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave empty to keep current password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                >
                  {showEditPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={`pr-10 ${editPassword && confirmPassword && editPassword !== confirmPassword ? 'border-red-500' : ''}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
              {editPassword && confirmPassword && editPassword !== confirmPassword && (
                <p className="text-sm text-red-500">Passwords do not match</p>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowEditDialog(false)
              setEditingUser(null)
              setEditRole('employee')
              setEditName('')
              setEditPassword('')
              setConfirmPassword('')
              setShowEditPassword(false)
              setShowConfirmPassword(false)
            }}>Cancel</AlertDialogCancel>
            <Button 
              onClick={() => {
                handleUpdateRole()
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Update User
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open)
        if (!open) {
          setDeleteUser(null)
          setDeleteConfirmation('')
        }
      }}>
        <AlertDialogContent style={{
          backgroundColor: 'rgba(17, 24, 39, 0.98)',
          border: '2px solid rgba(59, 130, 246, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)'
        }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#ffffff' }}>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#9ca3af' }}>
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <label htmlFor="delete-confirmation" style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: '500' }}>
                Type <span style={{ color: '#ef4444', fontWeight: 'bold' }}>"delete"</span> to confirm:
              </label>
              <Input
                id="delete-confirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Type delete to confirm"
                style={{
                  backgroundColor: 'rgba(31, 41, 55, 0.8)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#ffffff'
                }}
                className="placeholder:text-gray-400"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowDeleteDialog(false)
                setDeleteUser(null)
                setDeleteConfirmation('')
              }}
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#ffffff'
              }}
              className="hover:bg-blue-600"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              disabled={deleteConfirmation.toLowerCase() !== 'delete'}
              style={{
                backgroundColor: deleteConfirmation.toLowerCase() === 'delete'
                  ? 'rgba(220, 38, 38, 0.8)'
                  : 'rgba(107, 114, 128, 0.5)',
                border: deleteConfirmation.toLowerCase() === 'delete'
                  ? '1px solid rgba(220, 38, 38, 0.5)'
                  : '1px solid rgba(107, 114, 128, 0.3)',
                color: '#ffffff',
                cursor: deleteConfirmation.toLowerCase() === 'delete' ? 'pointer' : 'not-allowed',
                opacity: deleteConfirmation.toLowerCase() === 'delete' ? 1 : 0.6
              }}
              className={deleteConfirmation.toLowerCase() === 'delete' ? 'hover:bg-red-600' : ''}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  )
}
