'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface DomainRow {
  _id: string
  name: string
  description?: string
  productCount: number
}

export function DomainTable({ domains }: { domains: DomainRow[] }) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  function startEdit(domain: DomainRow) {
    setEditingId(domain._id)
    setEditName(domain.name)
    setEditDescription(domain.description || '')
    setEditError('')
  }

  async function handleSaveEdit(id: string) {
    setEditLoading(true)
    setEditError('')
    try {
      const res = await fetch(`/api/domains/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDescription }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEditError(data.error || 'Failed to update domain')
        return
      }
      setEditingId(null)
      router.refresh()
    } catch {
      setEditError('An unexpected error occurred.')
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDelete(domain: DomainRow) {
    if (domain.productCount > 0) {
      alert(`Cannot delete "${domain.name}" — it has ${domain.productCount} product(s). Reassign or delete them first.`)
      return
    }
    if (!confirm(`Delete domain "${domain.name}"? This cannot be undone.`)) return

    setDeletingId(domain._id)
    try {
      const res = await fetch(`/api/domains/${domain._id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to delete domain')
        return
      }
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  if (domains.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
        <p className="text-slate-400 text-sm">No domains yet.</p>
      </div>
    )
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Domain</TableHead>
            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-24 text-right">Products</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {domains.map((domain) => (
            <TableRow key={domain._id} className="hover:bg-slate-50/50">
              <TableCell>
                {editingId === domain._id ? (
                  <div className="space-y-1.5">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 text-sm"
                      placeholder="Domain name"
                    />
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="h-8 text-sm"
                      placeholder="Description (optional)"
                    />
                    {editError && (
                      <p className="text-xs text-red-600">{editError}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-slate-900">{domain.name}</p>
                    {domain.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{domain.description}</p>
                    )}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-sm text-slate-500 text-right">
                {domain.productCount}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {editingId === domain._id ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveEdit(domain._id)}
                        disabled={editLoading}
                        className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800"
                      >
                        {editLoading ? '...' : 'Save'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                        className="h-7 px-2 text-xs text-slate-400 hover:text-slate-700"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(domain)}
                        className="h-7 px-2 text-xs text-slate-400 hover:text-slate-700"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(domain)}
                        disabled={deletingId === domain._id}
                        className="h-7 px-2 text-xs text-slate-400 hover:text-red-600 disabled:opacity-40"
                      >
                        {deletingId === domain._id ? '...' : 'Delete'}
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
