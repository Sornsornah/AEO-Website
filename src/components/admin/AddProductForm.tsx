'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
]

interface Domain {
  _id: string
  name: string
}

interface UserOption {
  _id: string
  name: string
  email: string
}

export function AddProductForm({ domains, users }: { domains: Domain[]; users: UserOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [domainId, setDomainId] = useState('none')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [deckUrl, setDeckUrl] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [members, setMembers] = useState<UserOption[]>([])
  const [addingUserId, setAddingUserId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  function handleClose() {
    setOpen(false)
    setName('')
    setDescription('')
    setColor('#6366f1')
    setDomainId('none')
    setWebsiteUrl('')
    setDeckUrl('')
    setLogoUrl('')
    setMembers([])
    setAddingUserId('')
    setError('')
  }

  const memberIds = new Set(members.map((m) => m._id))
  const availableUsers = users.filter((u) => !memberIds.has(u._id))

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/uploads', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to upload logo')
        return
      }
      setLogoUrl(data.url)
    } catch {
      setError('Logo upload failed.')
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          color,
          domainId: domainId === 'none' ? undefined : domainId,
          websiteUrl: websiteUrl || undefined,
          deckUrl: deckUrl || undefined,
          logoUrl: logoUrl || undefined,
          members: members.map((m) => m._id),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create product')
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
        + Add Product
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleClose}>
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Add New Product</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Product Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. API"
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
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Domain</Label>
                <Select value={domainId} onValueChange={setDomainId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="No domain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No domain</SelectItem>
                    {domains.map((d) => (
                      <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Members */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Members</Label>
                <p className="text-xs text-slate-400">Only these users can post updates for this product.</p>
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

              {/* Logo upload */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Logo (optional)</Label>
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <div className="relative w-10 h-10 rounded-lg border border-slate-200 overflow-hidden flex-shrink-0">
                      <Image src={logoUrl} alt="Logo" fill className="object-contain p-0.5" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg border border-dashed border-slate-200 flex items-center justify-center flex-shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-slate-300">
                        <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoUploading}
                      className="h-8 px-3 text-xs text-slate-600 border border-slate-200"
                    >
                      {logoUploading ? 'Uploading...' : logoUrl ? 'Replace' : 'Upload'}
                    </Button>
                    {logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setLogoUrl('')}
                        className="h-8 px-3 text-xs text-slate-400 hover:text-red-500"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Website URL */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Website URL (optional)</Label>
                <Input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                  className="h-9 text-sm"
                />
              </div>

              {/* Deck URL */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Product Deck URL (optional)</Label>
                <Input
                  value={deckUrl}
                  onChange={(e) => setDeckUrl(e.target.value)}
                  placeholder="https://docs.google.com/..."
                  type="url"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Color</Label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none"
                      style={{
                        backgroundColor: c,
                        boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined,
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                    title="Custom color"
                  />
                  <span className="text-xs text-slate-400 font-mono">{color}</span>
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
                  {loading ? 'Creating...' : 'Create Product'}
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
