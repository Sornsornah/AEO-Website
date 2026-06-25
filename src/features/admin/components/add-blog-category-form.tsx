'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

export function AddBlogCategoryForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleClose() {
    setOpen(false)
    setName('')
    setPurpose('')
    setColor('#6366f1')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Name is required'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/blog-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), purpose: purpose.trim(), color }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to create category')
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
      <Button type="button" onClick={() => setOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white h-9 px-4 text-sm">
        + Add Category
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleClose}>
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Add Category</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="cat-name" className="text-xs font-medium text-slate-600">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cat-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. How-To Guides"
                  className="h-9 text-sm"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-purpose" className="text-xs font-medium text-slate-600">Purpose</Label>
                <Input
                  id="cat-purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Short description of this category"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Colour <span className="text-red-500">*</span></Label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      title={p.label}
                      onClick={() => setColor(p.hex)}
                      className="w-6 h-6 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: p.hex,
                        borderColor: color === p.hex ? '#1e293b' : 'transparent',
                        outline: color === p.hex ? `2px solid ${p.hex}` : 'none',
                        outlineOffset: '1px',
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-slate-200"
                    title="Custom colour"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#000000"
                    className="h-8 text-sm w-28 font-mono"
                    maxLength={7}
                  />
                  <div className="w-8 h-8 rounded border border-slate-200 flex-shrink-0" style={{ backgroundColor: color }} />
                </div>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={loading} className="bg-orange-600 text-white hover:bg-orange-700 h-8 px-4 text-sm">
                  {loading ? 'Saving...' : 'Save'}
                </Button>
                <Button type="button" variant="ghost" onClick={handleClose} className="h-8 px-3 text-sm text-slate-500">
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
