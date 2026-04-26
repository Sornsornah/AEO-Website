'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImagePlus, X, Plus, Trash2, FileEdit } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TeamMember { name: string; email: string }
interface HighlightStat { value: string; label: string }
interface UseCase { title: string; content: string; image: string; functionTag: string; isDraft: boolean }
interface ProductUpdate { title: string; content: string; date: string; isDraft: boolean }
interface WhitelistedUser { _id: string; name: string; email: string }

type Tab = 'project' | 'overview' | 'usecases' | 'content' | 'team'

const TABS: { id: Tab; label: string }[] = [
  { id: 'project', label: 'Project information' },
  { id: 'overview', label: 'Overview' },
  { id: 'usecases', label: 'Use cases' },
  { id: 'content', label: 'Updates' },
  { id: 'team', label: 'Team' },
]

interface ProductDetailFormProps {
  productId: string
  defaultValues: {
    name: string
    description: string
    shortDescription: string
    status: string
    color: string
    logoUrl: string
    uiScreenshot: string
    websiteUrl: string
    deckUrl: string
    productManagers: TeamMember[]
    developers: TeamMember[]
    overviewContent: string
    highlightStats: HighlightStat[]
    useCases: UseCase[]
    productUpdates: ProductUpdate[]
    memberIds: string[]
  }
  whitelistedUsers: WhitelistedUser[]
}

const PRESET_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6']

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  )
}

function RepeatableRow({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="flex items-start gap-2 group">
      <div className="flex-1">{children}</div>
      <button
        type="button"
        onClick={onRemove}
        className="mt-1 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

function TeamTab({
  whitelistedUsers,
  memberIds,
  setMemberIds,
}: {
  whitelistedUsers: WhitelistedUser[]
  memberIds: string[]
  setMemberIds: React.Dispatch<React.SetStateAction<string[]>>
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const members = whitelistedUsers.filter((u) => memberIds.includes(u._id))
  const nonMembers = whitelistedUsers.filter((u) => !memberIds.includes(u._id))

  const filtered = query.trim()
    ? nonMembers.filter(
        (u) =>
          u.name.toLowerCase().includes(query.toLowerCase()) ||
          u.email.toLowerCase().includes(query.toLowerCase())
      )
    : nonMembers

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400 -mt-2">Team members are notified when a comment is posted on an update linked to this product.</p>

      {/* Search + dropdown */}
      <div ref={containerRef} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search users to add…"
          className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
            {filtered.map((u) => (
              <button
                key={u._id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setMemberIds((prev) => [...prev, u._id])
                  setQuery('')
                  setOpen(false)
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-slate-50 text-left transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center text-xs font-semibold text-slate-500">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{u.name}</p>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {open && query.trim() !== '' && filtered.length === 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm text-slate-400">
            No users found.
          </div>
        )}
      </div>

      {/* Current members */}
      {members.length > 0 ? (
        <div className="space-y-2">
          {members.map((u) => (
            <div key={u._id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-white">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center text-xs font-semibold text-blue-700">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{u.name}</p>
                <p className="text-xs text-slate-400 truncate">{u.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setMemberIds((prev) => prev.filter((id) => id !== u._id))}
                className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                aria-label={`Remove ${u.name}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-400 text-sm py-6 text-center">No team members added yet.</p>
      )}
    </div>
  )
}

export function ProductDetailForm({ productId, defaultValues, whitelistedUsers }: ProductDetailFormProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('project')

  const [name, setName] = useState(defaultValues.name)
  const [description, setDescription] = useState(defaultValues.description)
  const [shortDescription, setShortDescription] = useState(defaultValues.shortDescription)
  const [status, setStatus] = useState(defaultValues.status)
  const [color, setColor] = useState(defaultValues.color)
  const [logoUrl, setLogoUrl] = useState(defaultValues.logoUrl)
  const [uiScreenshot, setUiScreenshot] = useState(defaultValues.uiScreenshot)
  const [websiteUrl, setWebsiteUrl] = useState(defaultValues.websiteUrl)
  const [deckUrl, setDeckUrl] = useState(defaultValues.deckUrl)
  const [productManagers, setProductManagers] = useState<TeamMember[]>(defaultValues.productManagers)
  const [developers, setDevelopers] = useState<TeamMember[]>(defaultValues.developers)
  const [overviewContent, setOverviewContent] = useState(defaultValues.overviewContent)
  const [highlightStats, setHighlightStats] = useState<HighlightStat[]>(defaultValues.highlightStats)
  const [useCases, setUseCases] = useState<UseCase[]>(defaultValues.useCases)
  const [productUpdates, setProductUpdates] = useState<ProductUpdate[]>(defaultValues.productUpdates)
  const [memberIds, setMemberIds] = useState<string[]>(defaultValues.memberIds)

  const [uploading, setUploading] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Modal state for use cases
  const [ucModal, setUcModal] = useState<{ index: number; draft: UseCase } | null>(null)
  function openUcModal(index: number) {
    setUcModal({ index, draft: { ...useCases[index] } })
  }
  function openNewUcModal() {
    setUcModal({ index: -1, draft: { title: '', content: '', image: '', functionTag: '', isDraft: false } })
  }
  function saveUcModal() {
    if (!ucModal) return
    if (ucModal.index === -1) {
      setUseCases((prev) => [...prev, ucModal.draft])
    } else {
      setUseCases((prev) => prev.map((uc, i) => i === ucModal.index ? ucModal.draft : uc))
    }
    setUcModal(null)
  }

  // Modal state for product updates
  const [puModal, setPuModal] = useState<{ index: number; draft: ProductUpdate } | null>(null)
  function openPuModal(index: number) {
    setPuModal({ index, draft: { ...productUpdates[index] } })
  }
  function openNewPuModal() {
    setPuModal({ index: -1, draft: { title: '', content: '', date: '', isDraft: false } })
  }
  function savePuModal() {
    if (!puModal) return
    if (puModal.index === -1) {
      setProductUpdates((prev) => [...prev, puModal.draft])
    } else {
      setProductUpdates((prev) => prev.map((u, i) => i === puModal.index ? puModal.draft : u))
    }
    setPuModal(null)
  }

  async function uploadFile(file: File, field: string): Promise<string> {
    setUploading(field)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/uploads', { method: 'POST', body: fd })
    setUploading(null)
    if (!res.ok) throw new Error('Upload failed')
    const data = await res.json()
    return data.url as string
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try { setLogoUrl(await uploadFile(file, 'logo')) }
    catch { setError('Logo upload failed.') }
    e.target.value = ''
  }

  async function handleScreenshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try { setUiScreenshot(await uploadFile(file, 'screenshot')) }
    catch { setError('Screenshot upload failed.') }
    e.target.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description, shortDescription, status, color,
          logoUrl: logoUrl || null, uiScreenshot: uiScreenshot || null,
          websiteUrl: websiteUrl || null, deckUrl: deckUrl || null,
          productManagers, developers,
          overviewContent, highlightStats, useCases, productUpdates,
          members: memberIds,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save')
        return
      }
      router.push('/editor?tab=products')
      router.refresh()
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Project information ── */}
      {activeTab === 'project' && (
        <div className="space-y-10">
          <section>
            <SectionHeader title="Basics" />
            <div className="space-y-4">
              {/* Logo */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Logo</Label>
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5 text-white"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
                      <span className="text-white text-lg font-bold">{name.charAt(0)}</span>
                    </div>
                  )}
                  <label className={`inline-flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-slate-400 cursor-pointer transition-colors ${uploading === 'logo' ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={!!uploading} />
                    <ImagePlus className="w-4 h-4" />
                    {uploading === 'logo' ? 'Uploading...' : 'Upload logo'}
                  </label>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">Name <span className="text-red-500">*</span></Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="h-10" required />
              </div>

              {/* One-liner */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description" className="text-sm font-medium text-slate-700">One-liner</Label>
                  <span className={`text-xs ${description.length > 75 ? 'text-red-500' : 'text-slate-400'}`}>{description.length}/75</span>
                </div>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 75))}
                  placeholder="Platform for deploying AI workflows"
                  className="h-10"
                />
              </div>

              {/* Short description */}
              <div className="space-y-1.5">
                <Label htmlFor="shortDescription" className="text-sm font-medium text-slate-700">Short description</Label>
                <textarea
                  id="shortDescription"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="A longer paragraph describing what the product does..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                />
              </div>

              {/* Status + Color row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">● Live</SelectItem>
                      <SelectItem value="beta">● Beta</SelectItem>
                      <SelectItem value="coming_soon">● Coming Soon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Brand color</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-6 h-6 rounded-full cursor-pointer border-0 p-0 bg-transparent"
                      title="Custom color"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => {
                        const v = e.target.value
                        if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setColor(v)
                      }}
                      onBlur={(e) => {
                        if (!/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setColor(color)
                      }}
                      className="w-24 px-2 py-1 text-xs font-mono border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300"
                      placeholder="#6366f1"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>

              {/* Links */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="websiteUrl" className="text-sm font-medium text-slate-700">Website URL</Label>
                  <Input id="websiteUrl" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://..." className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="deckUrl" className="text-sm font-medium text-slate-700">Deck URL</Label>
                  <Input id="deckUrl" value={deckUrl} onChange={(e) => setDeckUrl(e.target.value)} placeholder="https://..." className="h-10" />
                </div>
              </div>
            </div>
          </section>

          <section>
            <SectionHeader title="Team" />
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Product Managers</p>
                <div className="space-y-2">
                  {productManagers.map((pm, i) => (
                    <RepeatableRow key={i} onRemove={() => setProductManagers((prev) => prev.filter((_, j) => j !== i))}>
                      <div className="flex gap-2">
                        <Input value={pm.name} onChange={(e) => setProductManagers((prev) => prev.map((m, j) => j === i ? { ...m, name: e.target.value } : m))} placeholder="Full name" className="h-9 text-sm" />
                        <Input value={pm.email} onChange={(e) => setProductManagers((prev) => prev.map((m, j) => j === i ? { ...m, email: e.target.value } : m))} placeholder="email@..." className="h-9 text-sm" />
                      </div>
                    </RepeatableRow>
                  ))}
                  <button type="button" onClick={() => setProductManagers((prev) => [...prev, { name: '', email: '' }])} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add PM
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Developers</p>
                <div className="space-y-2">
                  {developers.map((dev, i) => (
                    <RepeatableRow key={i} onRemove={() => setDevelopers((prev) => prev.filter((_, j) => j !== i))}>
                      <div className="flex gap-2">
                        <Input value={dev.name} onChange={(e) => setDevelopers((prev) => prev.map((m, j) => j === i ? { ...m, name: e.target.value } : m))} placeholder="Full name" className="h-9 text-sm" />
                        <Input value={dev.email} onChange={(e) => setDevelopers((prev) => prev.map((m, j) => j === i ? { ...m, email: e.target.value } : m))} placeholder="email@..." className="h-9 text-sm" />
                      </div>
                    </RepeatableRow>
                  ))}
                  <button type="button" onClick={() => setDevelopers((prev) => [...prev, { name: '', email: '' }])} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add developer
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* UI Screenshot */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Product UI screenshot</Label>
            {uiScreenshot ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={uiScreenshot} alt="UI screenshot" className="w-full object-cover max-h-48" />
                <button type="button" onClick={() => setUiScreenshot('')} className="absolute top-2 right-2 bg-black/50 rounded-full p-1 text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className={`inline-flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-slate-400 cursor-pointer transition-colors ${uploading === 'screenshot' ? 'opacity-50 pointer-events-none' : ''}`}>
                <input type="file" accept="image/*" className="hidden" onChange={handleScreenshotUpload} disabled={!!uploading} />
                <ImagePlus className="w-4 h-4" />
                {uploading === 'screenshot' ? 'Uploading...' : 'Upload screenshot'}
              </label>
            )}
          </div>

          {/* Overview content */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Overview content</Label>
            <p className="text-xs text-slate-400">Supports markdown — use ## headings, **bold**, bullet lists, blockquotes, etc.</p>
            <textarea
              value={overviewContent}
              onChange={(e) => setOverviewContent(e.target.value)}
              placeholder={`## Why we built this\nDescribe the problem this solves...\n\n## What we've built\nDescribe the product...\n\n## Features\n- Feature one\n- Feature two\n\n## What our users say\n> "Quote here" — Name, Title`}
              rows={16}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y font-mono"
            />
          </div>

          {/* Highlight stats */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Highlight stats</Label>
            <div className="space-y-2">
              {highlightStats.map((s, i) => (
                <RepeatableRow key={i} onRemove={() => setHighlightStats((prev) => prev.filter((_, j) => j !== i))}>
                  <div className="flex gap-2">
                    <Input value={s.value} onChange={(e) => setHighlightStats((prev) => prev.map((item, j) => j === i ? { ...item, value: e.target.value } : item))} placeholder="80" className="h-9 text-sm w-28 flex-shrink-0" />
                    <Input value={s.label} onChange={(e) => setHighlightStats((prev) => prev.map((item, j) => j === i ? { ...item, label: e.target.value } : item))} placeholder="different users onboarded" className="h-9 text-sm" />
                  </div>
                </RepeatableRow>
              ))}
              <button type="button" onClick={() => setHighlightStats((prev) => [...prev, { value: '', label: '' }])} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add stat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Use cases ── */}
      {activeTab === 'usecases' && (
        <div className="space-y-2">
          {useCases.map((uc, i) => (
            <div key={i} className={cn('flex items-center gap-3 p-4 border rounded-xl bg-white', uc.isDraft ? 'border-amber-200' : 'border-slate-200')}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{uc.title || <span className="text-slate-400 font-normal">Untitled use case</span>}</p>
                {uc.functionTag && (
                  <p className="text-xs text-slate-500 truncate">{uc.functionTag}</p>
                )}
              </div>
              {uc.isDraft && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                  <FileEdit className="w-2.5 h-2.5" /> Draft
                </span>
              )}
              <button
                type="button"
                onClick={() => openUcModal(i)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors flex-shrink-0"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setUseCases((prev) => prev.filter((_, j) => j !== i))}
                className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {useCases.length === 0 && <p className="text-slate-400 text-sm py-8 text-center">No use cases yet.</p>}
          <button
            type="button"
            onClick={openNewUcModal}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 rounded-xl px-4 py-3 w-full justify-center hover:border-slate-400 transition-colors mt-2"
          >
            <Plus className="w-4 h-4" /> Add use case
          </button>
        </div>
      )}

      {/* ── Use case modal ── */}
      {ucModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">{ucModal.index === -1 ? 'Add use case' : 'Edit use case'}</h3>
              <button type="button" onClick={() => setUcModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Title</Label>
                <Input value={ucModal.draft.title} onChange={(e) => setUcModal((m) => m && ({ ...m, draft: { ...m.draft, title: e.target.value } }))} placeholder="Use case title" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Function tag</Label>
                <Input value={ucModal.draft.functionTag} onChange={(e) => setUcModal((m) => m && ({ ...m, draft: { ...m.draft, functionTag: e.target.value } }))} placeholder="e.g. HR, Policy, Operations" className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Content (Markdown)</Label>
              <textarea
                value={ucModal.draft.content}
                onChange={(e) => setUcModal((m) => m && ({ ...m, draft: { ...m.draft, content: e.target.value } }))}
                placeholder="Describe this use case in markdown..."
                rows={6}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Cover image</Label>
              {ucModal.draft.image ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-200 h-32">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ucModal.draft.image} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setUcModal((m) => m && ({ ...m, draft: { ...m.draft, image: '' } }))} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className={`inline-flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-slate-400 cursor-pointer transition-colors ${uploading === 'usecase-modal' ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={!!uploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        setUploading('usecase-modal')
                        const fd = new FormData(); fd.append('file', file)
                        const res = await fetch('/api/uploads', { method: 'POST', body: fd })
                        const data = await res.json()
                        setUcModal((m) => m && ({ ...m, draft: { ...m.draft, image: data.url } }))
                      } catch { setError('Image upload failed.') }
                      finally { setUploading(null); e.target.value = '' }
                    }}
                  />
                  <ImagePlus className="w-4 h-4" />
                  {uploading === 'usecase-modal' ? 'Uploading...' : 'Upload cover image'}
                </label>
              )}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUcModal((m) => m && ({ ...m, draft: { ...m.draft, isDraft: !m.draft.isDraft } }))}
                className={cn('text-xs font-medium px-3 py-1.5 rounded-lg transition-colors', ucModal.draft.isDraft ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-amber-50 text-amber-700 hover:bg-amber-100')}
              >
                {ucModal.draft.isDraft ? 'Publish' : 'Save as draft'}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setUcModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
                <button type="button" onClick={saveUcModal} className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Updates ── */}
      {activeTab === 'content' && (
        <div className="space-y-2">
          {productUpdates.map((u, i) => (
            <div key={i} className={cn('flex items-center gap-3 p-4 border rounded-xl bg-white', u.isDraft ? 'border-amber-200' : 'border-slate-200')}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{u.title || <span className="text-slate-400 font-normal">Untitled update</span>}</p>
              </div>
              {u.isDraft && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                  <FileEdit className="w-2.5 h-2.5" /> Draft
                </span>
              )}
              <button
                type="button"
                onClick={() => openPuModal(i)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors flex-shrink-0"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setProductUpdates((prev) => prev.filter((_, j) => j !== i))}
                className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {productUpdates.length === 0 && <p className="text-slate-400 text-sm py-8 text-center">No updates yet.</p>}
          <button
            type="button"
            onClick={openNewPuModal}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 rounded-xl px-4 py-3 w-full justify-center hover:border-slate-400 transition-colors mt-2"
          >
            <Plus className="w-4 h-4" /> Add update
          </button>
        </div>
      )}

      {/* ── Product update modal ── */}
      {puModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">{puModal.index === -1 ? 'Add update' : 'Edit update'}</h3>
              <button type="button" onClick={() => setPuModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Title</Label>
              <Input value={puModal.draft.title} onChange={(e) => setPuModal((m) => m && ({ ...m, draft: { ...m.draft, title: e.target.value } }))} placeholder="e.g. Q2 launch milestone" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Content (Markdown)</Label>
              <textarea
                value={puModal.draft.content}
                onChange={(e) => setPuModal((m) => m && ({ ...m, draft: { ...m.draft, content: e.target.value } }))}
                placeholder="Describe this update in markdown..."
                rows={8}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y font-mono"
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPuModal((m) => m && ({ ...m, draft: { ...m.draft, isDraft: !m.draft.isDraft } }))}
                className={cn('text-xs font-medium px-3 py-1.5 rounded-lg transition-colors', puModal.draft.isDraft ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-amber-50 text-amber-700 hover:bg-amber-100')}
              >
                {puModal.draft.isDraft ? 'Publish' : 'Save as draft'}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPuModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
                <button type="button" onClick={savePuModal} className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Team ── */}
      {activeTab === 'team' && (
        <TeamTab
          whitelistedUsers={whitelistedUsers}
          memberIds={memberIds}
          setMemberIds={setMemberIds}
        />
      )}

      {error && (
        <p className="mt-8 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</p>
      )}

      <div className="flex gap-3 pt-8 pb-10">
        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-6">
          {loading ? 'Saving...' : 'Save changes'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/editor?tab=products')} className="h-10 px-4 text-slate-600">
          Cancel
        </Button>
      </div>
    </form>
  )
}
