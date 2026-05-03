'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface UserOption {
  _id: string
  name: string
  email: string
}

export function AddDomainForm({ users }: { users: UserOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [members, setMembers] = useState<UserOption[]>([])
  const [addingUserId, setAddingUserId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleClose() {
    setOpen(false)
    setName('')
    setDescription('')
    setMembers([])
    setAddingUserId('')
    setError('')
  }

  const memberIds = new Set(members.map((m) => m._id))
  const availableUsers = users.filter((u) => !memberIds.has(u._id))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, members: members.map((m) => m._id) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create domain')
        return
      }
      handleClose()
      router.refresh()
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 text-sm"
      >
        + Add Section
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleClose}>
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Add New Section</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Section Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Team 1"
                  className="h-9 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Description (optional)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description"
                  className="h-9 text-sm"
                />
              </div>

              {/* Members */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Members</Label>
                <p className="text-xs text-slate-400">Users associated with this domain.</p>
                {members.length > 0 && (
                  <div className="space-y-1 mt-1">
                    {members.map((m) => (
                      <div key={m._id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <div>
                          <span className="text-xs font-medium text-slate-700">{m.name}</span>
                          <span className="text-xs text-slate-400 ml-1.5">{m.email}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMembers(members.filter((x) => x._id !== m._id))}
                          className="text-xs text-slate-400 hover:text-red-500 transition-colors ml-3 flex-shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {availableUsers.length > 0 && (
                  <div className="flex gap-2 mt-1">
                    <Select value={addingUserId} onValueChange={setAddingUserId}>
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Add a user…" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((u) => (
                          <SelectItem key={u._id} value={u._id}>
                            {u.name} <span className="text-slate-400">({u.email})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!addingUserId}
                      onClick={() => {
                        const user = users.find((u) => u._id === addingUserId)
                        if (user) {
                          setMembers([...members, user])
                          setAddingUserId('')
                        }
                      }}
                      className="h-8 px-3 text-xs border border-slate-200 text-slate-600"
                    >
                      Add
                    </Button>
                  </div>
                )}
                {availableUsers.length === 0 && members.length === 0 && (
                  <p className="text-xs text-slate-300 italic">No users available to add.</p>
                )}
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
                  {loading ? 'Creating...' : 'Create Section'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  className="h-8 px-3 text-sm text-slate-500"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
