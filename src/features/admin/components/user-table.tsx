'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, Users } from 'lucide-react'
import { UserMembershipModal } from './user-membership-modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateShort } from '@/lib/utils'

interface UserRow {
  _id: string
  email: string
  name: string
  role: 'public' | 'viewer' | 'admin'
  createdAt: string
}

interface ProductRow {
  _id: string
  name: string
  members: { _id: string; name: string }[]
}

interface DomainRow {
  _id: string
  name: string
  members: { _id: string; name: string; email: string }[]
}

const roleColors: Record<string, string> = {
  admin: 'bg-purple-50 text-purple-700 border-purple-100',
  viewer: 'bg-slate-50 text-slate-600 border-slate-200',
  public: 'bg-stone-50 text-stone-500 border-stone-200',
}

const roleLabels: Record<string, string> = {
  admin: 'AEO',
  viewer: 'Management',
  public: 'CPF officers',
}

export function UserTable({
  users,
  products,
  domains,
  currentUserId,
}: {
  users: UserRow[]
  products: ProductRow[]
  domains: DomainRow[]
  currentUserId: string
}) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)

  async function changeRole(userId: string, role: string) {
    setLoadingId(userId)
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  async function deleteUser(user: UserRow) {
    if (!confirm(`Delete ${user.name} (${user.email})? This cannot be undone.`)) return
    setDeletingId(user._id)
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to delete user')
        return
      }
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
        <p className="text-slate-400 text-sm">No users yet.</p>
      </div>
    )
  }

  return (
    <>
    {editingUserId && (() => {
      const editingUser = users.find((u) => u._id === editingUserId)
      if (!editingUser) return null
      return (
        <UserMembershipModal
          user={editingUser}
          domains={domains}
          products={products}
          onClose={() => setEditingUserId(null)}
        />
      )
    })()}
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">User</TableHead>
            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-36">Role</TableHead>
            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Added</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isSelf = user._id === currentUserId
            const isLoading = loadingId === user._id

            return (
                <TableRow key={user._id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isSelf ? (
                      <Badge className={`text-xs ${roleColors[user.role]}`}>
                        {roleLabels[user.role] ?? user.role}
                      </Badge>
                    ) : (
                      <Select
                        value={user.role}
                        onValueChange={(v) => changeRole(user._id, v)}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">CPF officers</SelectItem>
                          <SelectItem value="viewer">Management</SelectItem>
                          <SelectItem value="admin">AEO</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                    {formatDateShort(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {user.role === 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingUserId(user._id)}
                          className="h-7 w-7 p-0 transition-colors text-slate-400 hover:text-slate-700"
                          title="Edit memberships"
                        >
                          <Users size={14} />
                        </Button>
                      )}
                      {!isSelf && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteUser(user)}
                          disabled={deletingId === user._id}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                        >
                          {deletingId === user._id ? '…' : <Trash2 size={14} />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
    </>
  )
}
