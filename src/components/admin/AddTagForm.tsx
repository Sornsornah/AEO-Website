'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AddTagForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Name is required'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to create tag')
        return
      }
      setName('')
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
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 text-sm"
      >
        + Add tag
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor="tag-name" className="text-xs text-slate-500">Tag name</Label>
        <Input
          id="tag-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Infrastructure"
          className="h-8 text-sm w-44"
          autoFocus
        />
      </div>
      <Button type="submit" disabled={loading} size="sm" className="h-8 bg-slate-900 text-white hover:bg-slate-800">
        {loading ? 'Saving...' : 'Save'}
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => { setOpen(false); setError('') }}>
        Cancel
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  )
}
