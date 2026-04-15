'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function AddUserForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create user')
        return
      }

      setName('')
      setEmail('')
      setRole('viewer')
      setOpen(false)
      router.refresh()
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 text-sm"
      >
        + Add User
      </Button>
    )
  }

  return (
    <div className="border border-slate-200 rounded-xl p-5 bg-slate-50">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Add New User</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Full Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="h-9 text-sm"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="h-9 text-sm"
              required
            />
          </div>
        </div>
        <div className="w-48 space-y-1.5">
          <Label className="text-xs font-medium text-slate-600">Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">Viewer</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-4 text-sm"
          >
            {loading ? 'Creating...' : 'Create User'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => { setOpen(false); setError('') }}
            className="h-8 px-3 text-sm text-slate-500"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
