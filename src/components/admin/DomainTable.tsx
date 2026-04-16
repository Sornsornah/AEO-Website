'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EditDomainModal } from './EditDomainModal'

interface UserOption {
  _id: string
  name: string
  email: string
}

interface DomainRow {
  _id: string
  name: string
  description?: string
  productCount: number
  members: UserOption[]
}

export function DomainTable({ domains, users }: { domains: DomainRow[]; users: UserOption[] }) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingDomain, setEditingDomain] = useState<DomainRow | null>(null)

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
    <>
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
                  <div>
                    <p className="text-sm font-medium text-slate-900">{domain.name}</p>
                    {domain.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{domain.description}</p>
                    )}
                    {domain.members.length > 0 && (
                      <p className="text-xs text-slate-300 mt-0.5">
                        {domain.members.length} member{domain.members.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-slate-500 text-right">
                  {domain.productCount}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingDomain(domain)}
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
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingDomain && (
        <EditDomainModal
          domain={editingDomain}
          users={users}
          onClose={() => setEditingDomain(null)}
        />
      )}
    </>
  )
}
