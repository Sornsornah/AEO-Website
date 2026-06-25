'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Pencil, Trash2, Check, X, Plus } from 'lucide-react'

export type TaxonomyKind = 'section' | 'tag'

interface TaxonomyItem {
  _id: string
  name: string
}

const CONFIG: Record<
  TaxonomyKind,
  {
    title: string
    description: string
    noun: string
    create: string
    item: (id: string) => string
    renameMethod: 'PUT' | 'PATCH'
  }
> = {
  section: {
    title: 'Manage Sections',
    description: 'Add, rename, or delete sections used to group internal updates.',
    noun: 'section',
    create: '/api/domains',
    item: (id) => `/api/domains/${id}`,
    renameMethod: 'PUT',
  },
  tag: {
    title: 'Manage Tags',
    description: 'Add, rename, or delete tags used to label internal updates.',
    noun: 'tag',
    create: '/api/admin/tags',
    item: (id) => `/api/admin/tags/${id}`,
    renameMethod: 'PATCH',
  },
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json()
    return typeof data?.error === 'string' ? data.error : fallback
  } catch {
    return fallback
  }
}

export function ManageTaxonomyModal({
  kind,
  items,
  open,
  onClose,
}: {
  kind: TaxonomyKind
  items: TaxonomyItem[]
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const config = CONFIG[kind]

  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<TaxonomyItem | null>(null)

  async function handleCreate() {
    const name = newName.trim()
    if (!name || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(config.create, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        setError(await readError(res, `Failed to add ${config.noun}.`))
        return
      }
      setNewName('')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleRename(id: string) {
    const name = editingName.trim()
    if (!name || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(config.item(id), {
        method: config.renameMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        setError(await readError(res, `Failed to rename ${config.noun}.`))
        return
      }
      setEditingId(null)
      setEditingName('')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(item: TaxonomyItem) {
    setDeleteTarget(null)
    setBusy(true)
    setError('')
    try {
      const res = await fetch(config.item(item._id), { method: 'DELETE' })
      if (!res.ok) {
        setError(await readError(res, `Failed to delete ${config.noun}.`))
        return
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setEditingId(null)
      setEditingName('')
      setNewName('')
      setError('')
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        {/* Add new */}
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleCreate()
              }
            }}
            placeholder={`New ${config.noun} name…`}
            className="h-9"
          />
          <Button
            type="button"
            onClick={handleCreate}
            disabled={busy || !newName.trim()}
            className="h-9 px-3 bg-orange-600 hover:bg-orange-700 text-white shrink-0"
          >
            <Plus size={14} className="mr-1" /> Add
          </Button>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        {/* List */}
        <div className="max-h-72 overflow-y-auto -mx-1 px-1">
          {items.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">No {config.noun}s yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item._id} className="flex items-center gap-2 py-2">
                  {editingId === item._id ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleRename(item._id)
                          } else if (e.key === 'Escape') {
                            setEditingId(null)
                            setEditingName('')
                          }
                        }}
                        autoFocus
                        className="h-8 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleRename(item._id)}
                        disabled={busy || !editingName.trim()}
                        className="h-7 w-7 flex items-center justify-center rounded text-green-600 hover:bg-green-50 disabled:opacity-40"
                        aria-label="Save"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null)
                          setEditingName('')
                        }}
                        className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:bg-slate-100"
                        aria-label="Cancel"
                      >
                        <X size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-slate-700 truncate">{item.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(item._id)
                          setEditingName(item.name)
                          setError('')
                        }}
                        disabled={busy}
                        className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                        aria-label={`Rename ${item.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(item)
                          setError('')
                        }}
                        disabled={busy}
                        className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${config.noun}?`}
        message={
          deleteTarget
            ? `"${deleteTarget.name}" will be permanently deleted. Updates using it will lose this ${config.noun}.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </Dialog>
  )
}
