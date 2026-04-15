'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AddDomainForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create domain')
        return
      }
      setName('')
      setDescription('')
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
        + Add Domain
      </Button>
    )
  }

  return (
    <div className="border border-slate-200 rounded-xl p-5 bg-slate-50">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Add New Domain</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Domain Name</Label>
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
            {loading ? 'Creating...' : 'Create Domain'}
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
