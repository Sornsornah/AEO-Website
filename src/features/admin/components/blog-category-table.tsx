'use client'

import { useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const PRESET_COLORS = [
  { label: 'Orange', hex: '#f97316' },
  { label: 'Blue', hex: '#3b82f6' },
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Amber', hex: '#f59e0b' },
  { label: 'Purple', hex: '#8b5cf6' },
  { label: 'Rose', hex: '#f43f5e' },
  { label: 'Teal', hex: '#14b8a6' },
  { label: 'Indigo', hex: '#6366f1' },
  { label: 'Sky', hex: '#0ea5e9' },
  { label: 'Violet', hex: '#7c3aed' },
]

interface BlogCategoryRow {
  _id: string
  name: string
  slug: string
  purpose?: string
  color: string
}

function ColorPicker({ color, onChange }: { color: string; onChange: (hex: string) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((p) => (
          <button
            key={p.hex}
            type="button"
            title={p.label}
            onClick={() => onChange(p.hex)}
            className="w-5 h-5 rounded-full border-2 transition-all"
            style={{
              backgroundColor: p.hex,
              borderColor: color === p.hex ? '#1e293b' : 'transparent',
              outline: color === p.hex ? `2px solid ${p.hex}` : 'none',
              outlineOffset: '1px',
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border border-slate-200"
        />
        <Input
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs w-24 font-mono"
          maxLength={7}
        />
        <div className="w-7 h-7 rounded border border-slate-200 flex-shrink-0" style={{ backgroundColor: color }} />
      </div>
    </div>
  )
}

export function BlogCategoryTable({ categories }: { categories: BlogCategoryRow[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPurpose, setEditPurpose] = useState('')
  const [editColor, setEditColor] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<BlogCategoryRow | null>(null)
  const [error, setError] = useState('')

  function startEdit(cat: BlogCategoryRow) {
    setEditingId(cat._id)
    setEditName(cat.name)
    setEditPurpose(cat.purpose ?? '')
    setEditColor(cat.color)
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setError('')
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) { setError('Name is required'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/blog-categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), purpose: editPurpose.trim(), color: editColor }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save')
        return
      }
      setEditingId(null)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(cat: BlogCategoryRow) {
    setDeleteConfirm(null)
    setDeleting(cat._id)
    try {
      await fetch(`/api/admin/blog-categories/${cat._id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setDeleting(null)
    }
  }

  if (categories.length === 0) {
    return <p className="text-sm text-slate-400 py-4">No categories yet.</p>
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-8" />
            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Purpose</th>
            <th className="px-4 py-2.5 w-20" />
          </tr>
        </thead>
        <tbody>
          {categories.map((cat, i) => (
            <Fragment key={cat._id}>
              <tr
                className={`${i < categories.length - 1 || editingId === cat._id ? 'border-b border-slate-100' : ''} ${editingId === cat._id ? 'bg-slate-50/60' : 'hover:bg-slate-50/50'}`}
              >
                <td className="px-4 py-3">
                  <div
                    className="w-4 h-4 rounded-full border border-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">{cat.name}</td>
                <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{cat.purpose ?? <span className="text-slate-300 italic">—</span>}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                      onClick={() => editingId === cat._id ? cancelEdit() : startEdit(cat)}
                    >
                      {editingId === cat._id ? <X size={14} /> : <Pencil size={14} />}
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteConfirm(cat)}
                      disabled={deleting === cat._id}
                    >
                      {deleting === cat._id ? '…' : <Trash2 size={14} />}
                    </Button>
                  </div>
                </td>
              </tr>
              {editingId === cat._id && (
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <td colSpan={4} className="px-4 py-4">
                    <div className="grid grid-cols-2 gap-4 max-w-xl">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Name <span className="text-red-500">*</span></Label>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm" autoFocus />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Purpose</Label>
                        <Input value={editPurpose} onChange={(e) => setEditPurpose(e.target.value)} placeholder="Short description" className="h-8 text-sm" />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs text-slate-500">Colour</Label>
                        <ColorPicker color={editColor} onChange={setEditColor} />
                      </div>
                    </div>
                    {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
                    <div className="flex items-center gap-2 mt-3">
                      <Button size="sm" className="h-8 bg-orange-600 text-white hover:bg-orange-700" onClick={() => saveEdit(cat._id)} disabled={saving}>
                        {saving ? 'Saving...' : <><Check size={13} className="mr-1" /> Save</>}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8" onClick={cancelEdit}>Cancel</Button>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete category?"
        message={
          deleteConfirm
            ? `"${deleteConfirm.name}" will be deleted. Blog posts using this category keep their slug but it won't appear in the list. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  )
}
