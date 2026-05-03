'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImagePlus, X, Plus, Trash2, FileEdit } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ProductDetailClient } from '@/components/products/ProductDetailClient'
import { ProductCardPreview } from '@/components/products/ProductCardPreview'
import { TiptapEditor } from '@/components/editor/TiptapEditor'

interface TeamMember { name: string; email: string }
interface HighlightStat { value: string; label: string }
interface UseCase { title: string; content: string; image: string; functionTag: string; isDraft: boolean }
interface ProductUpdate { title: string; content: string; date: string; isDraft: boolean }
interface WhitelistedUser { _id: string; name: string; email: string }

type Tab = 'card' | 'overview' | 'usecases' | 'content' | 'team'

const TABS: { id: Tab; label: string }[] = [
  { id: 'card', label: 'Card information' },
  { id: 'overview', label: 'Overview' },
  { id: 'usecases', label: 'Use cases' },
  { id: 'content', label: 'Updates' },
  { id: 'team', label: 'Team' },
]

interface ProductDetailFormProps {
  productId: string
  productSlug: string
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
    contactUsUrl: string
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

export function ProductDetailForm({ productId, productSlug, defaultValues, whitelistedUsers }: ProductDetailFormProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('card')

  const [name, setName] = useState(defaultValues.name)
  const [description, setDescription] = useState(defaultValues.description)
  const [shortDescription, setShortDescription] = useState(defaultValues.shortDescription)
  const [status, setStatus] = useState(defaultValues.status)
  const [color, setColor] = useState(defaultValues.color)
  const [logoUrl, setLogoUrl] = useState(defaultValues.logoUrl)
  const [uiScreenshot, setUiScreenshot] = useState(defaultValues.uiScreenshot)
  const [websiteUrl, setWebsiteUrl] = useState(defaultValues.websiteUrl)
  const [deckUrl, setDeckUrl] = useState(defaultValues.deckUrl)
  const [contactUsUrl, setContactUsUrl] = useState(defaultValues.contactUsUrl)
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

  const isDirty = useRef(false)
  const mounted = useRef(false)
  const [leaveModal, setLeaveModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ message: string; action: () => void } | null>(null)

  useEffect(() => {
    if (mounted.current) isDirty.current = true
    else mounted.current = true
  }, [name, description, shortDescription, status, color, logoUrl, uiScreenshot, websiteUrl, deckUrl, contactUsUrl, productManagers, developers, overviewContent, highlightStats, useCases, productUpdates, memberIds])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (isDirty.current) e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  function handleCancel() {
    if (isDirty.current) setLeaveModal(true)
    else router.push('/editor?tab=products')
  }

  // Accordion state for use cases
  const [activeUcIndex, setActiveUcIndex] = useState<number | null>(null)
  const [ucDraft, setUcDraft] = useState<UseCase | null>(null)
  function openUcAccordion(index: number) {
    setActiveUcIndex(index)
    setUcDraft({ ...useCases[index] })
  }
  function openNewUcAccordion() {
    setActiveUcIndex(-1)
    setUcDraft({ title: '', content: '', image: '', functionTag: '', isDraft: false })
  }
  function saveUcAccordion() {
    if (!ucDraft) return
    if (activeUcIndex === -1) {
      setUseCases((prev) => [...prev, ucDraft])
    } else if (activeUcIndex !== null) {
      setUseCases((prev) => prev.map((uc, i) => i === activeUcIndex ? ucDraft : uc))
    }
    setActiveUcIndex(null)
    setUcDraft(null)
  }

  // Accordion state for product updates
  const [activePuIndex, setActivePuIndex] = useState<number | null>(null)
  const [puDraft, setPuDraft] = useState<ProductUpdate | null>(null)
  function openPuAccordion(index: number) {
    setActivePuIndex(index)
    setPuDraft({ ...productUpdates[index] })
  }
  function openNewPuAccordion() {
    setActivePuIndex(-1)
    setPuDraft({ title: '', content: '', date: '', isDraft: false })
  }
  function savePuAccordion() {
    if (!puDraft) return
    if (activePuIndex === -1) {
      setProductUpdates((prev) => [...prev, puDraft])
    } else if (activePuIndex !== null) {
      setProductUpdates((prev) => prev.map((u, i) => i === activePuIndex ? puDraft : u))
    }
    setActivePuIndex(null)
    setPuDraft(null)
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
          websiteUrl: websiteUrl || null, deckUrl: deckUrl || null, contactUsUrl: contactUsUrl || null,
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
      isDirty.current = false
      router.push('/editor?tab=products')
      router.refresh()
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const previewUseCases = (() => {
    const base = useCases.map((uc, i) => {
      if (activeUcIndex === i && ucDraft) return ucDraft
      return uc
    })
    if (activeUcIndex === -1 && ucDraft) return [...base, ucDraft]
    return base
  })()

  const previewProductUpdates = (() => {
    const base = productUpdates.map((u, i) => {
      if (activePuIndex === i && puDraft) return puDraft
      return u
    })
    if (activePuIndex === -1 && puDraft) return [...base, puDraft]
    return base
  })()

  const previewProduct = {
    _id: productId,
    name: name || 'Product name',
    slug: productSlug,
    description: description || undefined,
    shortDescription: shortDescription || undefined,
    color,
    logoUrl: logoUrl || undefined,
    uiScreenshot: uiScreenshot || undefined,
    status: (status as 'live' | 'beta' | 'coming_soon') || 'live',
    websiteUrl: websiteUrl || undefined,
    deckUrl: deckUrl || undefined,
    contactUsUrl: contactUsUrl || undefined,
    productManagers: productManagers.filter((m) => m.name || m.email),
    developers: developers.filter((d) => d.name || d.email),
    overviewContent: overviewContent || undefined,
    vision: undefined,
    mission: undefined,
    goals: undefined,
    highlightStats: highlightStats.filter((s) => s.value || s.label),
    useCases: previewUseCases.map((uc) => ({ title: uc.title, content: uc.content, image: uc.image || undefined, functionTag: uc.functionTag || undefined, isDraft: uc.isDraft })),
    productUpdates: previewProductUpdates.map((u) => ({ title: u.title, content: u.content, date: u.date, isDraft: u.isDraft })),
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-8 items-start">
      {/* ── Left: editor ── */}
      <div className="flex-1 min-w-0">
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

      {/* ── Card information ── */}
      {activeTab === 'card' && (
        <div className="space-y-6">
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

          {/* Brand color */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Brand colour</Label>
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
                title="Custom colour"
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

          {/* Product UI screenshot */}
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
        </div>
      )}

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="space-y-10">
          <section>
            <SectionHeader title="Details" />
            <div className="space-y-4">
              {/* Status */}
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
              <div className="space-y-1.5">
                <Label htmlFor="contactUsUrl" className="text-sm font-medium text-slate-700">Contact us URL</Label>
                <Input id="contactUsUrl" value={contactUsUrl} onChange={(e) => setContactUsUrl(e.target.value)} placeholder="https://..." className="h-10" />
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
                    <RepeatableRow key={i} onRemove={() => setDeleteConfirm({ message: 'Remove this person from the team?', action: () => setProductManagers((prev) => prev.filter((_, j) => j !== i)) })}>
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
                    <RepeatableRow key={i} onRemove={() => setDeleteConfirm({ message: 'Remove this person from the team?', action: () => setDevelopers((prev) => prev.filter((_, j) => j !== i)) })}>
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

          <section>
            <SectionHeader title="Content" />
            <div className="space-y-5">
              {/* Overview content */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Overview content</Label>
                <TiptapEditor value={overviewContent} onChange={setOverviewContent} placeholder="Write an overview — headings, bullet lists, bold, links..." minHeight="240px" />
              </div>

              {/* Highlights */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Highlights</Label>
                <div className="space-y-2">
                  {highlightStats.map((s, i) => (
                    <RepeatableRow key={i} onRemove={() => setDeleteConfirm({ message: 'Remove this highlight stat?', action: () => setHighlightStats((prev) => prev.filter((_, j) => j !== i)) })}>
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
          </section>
        </div>
      )}

      {/* ── Use cases ── */}
      {activeTab === 'usecases' && (
        <div className="space-y-2">
          {useCases.map((uc, i) => (
            <div key={i} className={cn('border rounded-xl bg-white overflow-hidden', activeUcIndex === i ? 'border-slate-400' : uc.isDraft ? 'border-amber-200' : 'border-slate-200')}>
              {/* Collapsed header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{uc.title || <span className="text-slate-400 font-normal">Untitled use case</span>}</p>
                  {uc.functionTag && <p className="text-xs text-slate-500 truncate">{uc.functionTag}</p>}
                </div>
                {uc.isDraft && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                    <FileEdit className="w-2.5 h-2.5" /> Draft
                  </span>
                )}
                {activeUcIndex !== i && (
                  <button type="button" onClick={() => openUcAccordion(i)} className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors flex-shrink-0">
                    Edit
                  </button>
                )}
                <button type="button" onClick={() => setDeleteConfirm({ message: 'Delete this use case? This cannot be undone.', action: () => { setUseCases((prev) => prev.filter((_, j) => j !== i)); if (activeUcIndex === i) { setActiveUcIndex(null); setUcDraft(null) } } })} className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {/* Expanded form */}
              {activeUcIndex === i && ucDraft && (
                <div className="border-t border-slate-100 px-4 py-4 space-y-3 bg-slate-50">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-500">Title</Label>
                      <Input value={ucDraft.title} onChange={(e) => setUcDraft((d) => d && ({ ...d, title: e.target.value }))} placeholder="Use case title" className="h-9 text-sm bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-500">Function tag</Label>
                      <Input value={ucDraft.functionTag} onChange={(e) => setUcDraft((d) => d && ({ ...d, functionTag: e.target.value }))} placeholder="e.g. HR, Policy, Operations" className="h-9 text-sm bg-white" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Content</Label>
                    <TiptapEditor value={ucDraft.content} onChange={(v) => setUcDraft((d) => d && ({ ...d, content: v }))} placeholder="Describe this use case..." minHeight="140px" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Cover image</Label>
                    {ucDraft.image ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 h-32">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ucDraft.image} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setUcDraft((d) => d && ({ ...d, image: '' }))} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 text-white"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <label className={`inline-flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-slate-400 cursor-pointer transition-colors ${uploading === 'uc-accordion' ? 'opacity-50 pointer-events-none' : ''}`}>
                        <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={async (e) => {
                          const file = e.target.files?.[0]; if (!file) return
                          try {
                            setUploading('uc-accordion')
                            const fd = new FormData(); fd.append('file', file)
                            const res = await fetch('/api/uploads', { method: 'POST', body: fd })
                            const data = await res.json()
                            setUcDraft((d) => d && ({ ...d, image: data.url }))
                          } catch { setError('Image upload failed.') }
                          finally { setUploading(null); e.target.value = '' }
                        }} />
                        <ImagePlus className="w-4 h-4" />
                        {uploading === 'uc-accordion' ? 'Uploading...' : 'Upload cover image'}
                      </label>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <button type="button" onClick={() => setUcDraft((d) => d && ({ ...d, isDraft: !d.isDraft }))} className={cn('text-xs font-medium px-3 py-1.5 rounded-lg transition-colors', ucDraft.isDraft ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-amber-50 text-amber-700 hover:bg-amber-100')}>
                      {ucDraft.isDraft ? 'Publish' : 'Save as draft'}
                    </button>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setActiveUcIndex(null); setUcDraft(null) }} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
                      <button type="button" onClick={saveUcAccordion} className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors">Save</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* New use case accordion */}
          {activeUcIndex === -1 && ucDraft ? (
            <div className="border border-slate-400 rounded-xl bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-700">New use case</p>
              </div>
              <div className="px-4 py-4 space-y-3 bg-slate-50">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Title</Label>
                    <Input value={ucDraft.title} onChange={(e) => setUcDraft((d) => d && ({ ...d, title: e.target.value }))} placeholder="Use case title" className="h-9 text-sm bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Function tag</Label>
                    <Input value={ucDraft.functionTag} onChange={(e) => setUcDraft((d) => d && ({ ...d, functionTag: e.target.value }))} placeholder="e.g. HR, Policy, Operations" className="h-9 text-sm bg-white" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Content</Label>
                  <TiptapEditor value={ucDraft.content} onChange={(v) => setUcDraft((d) => d && ({ ...d, content: v }))} placeholder="Describe this use case..." minHeight="140px" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Cover image</Label>
                  {ucDraft.image ? (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 h-32">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ucDraft.image} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setUcDraft((d) => d && ({ ...d, image: '' }))} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 text-white"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <label className={`inline-flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-slate-400 cursor-pointer transition-colors ${uploading === 'uc-accordion' ? 'opacity-50 pointer-events-none' : ''}`}>
                      <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={async (e) => {
                        const file = e.target.files?.[0]; if (!file) return
                        try {
                          setUploading('uc-accordion')
                          const fd = new FormData(); fd.append('file', file)
                          const res = await fetch('/api/uploads', { method: 'POST', body: fd })
                          const data = await res.json()
                          setUcDraft((d) => d && ({ ...d, image: data.url }))
                        } catch { setError('Image upload failed.') }
                        finally { setUploading(null); e.target.value = '' }
                      }} />
                      <ImagePlus className="w-4 h-4" />
                      {uploading === 'uc-accordion' ? 'Uploading...' : 'Upload cover image'}
                    </label>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <button type="button" onClick={() => setUcDraft((d) => d && ({ ...d, isDraft: !d.isDraft }))} className={cn('text-xs font-medium px-3 py-1.5 rounded-lg transition-colors', ucDraft.isDraft ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-amber-50 text-amber-700 hover:bg-amber-100')}>
                    {ucDraft.isDraft ? 'Publish' : 'Save as draft'}
                  </button>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setActiveUcIndex(null); setUcDraft(null) }} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
                    <button type="button" onClick={saveUcAccordion} className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors">Save</button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button type="button" onClick={openNewUcAccordion} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 rounded-xl px-4 py-3 w-full justify-center hover:border-slate-400 transition-colors mt-2">
              <Plus className="w-4 h-4" /> Add use case
            </button>
          )}
        </div>
      )}

      {/* ── Updates ── */}
      {activeTab === 'content' && (
        <div className="space-y-2">
          {productUpdates.map((u, i) => (
            <div key={i} className={cn('border rounded-xl bg-white overflow-hidden', activePuIndex === i ? 'border-slate-400' : u.isDraft ? 'border-amber-200' : 'border-slate-200')}>
              {/* Collapsed header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{u.title || <span className="text-slate-400 font-normal">Untitled update</span>}</p>
                </div>
                {u.isDraft && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                    <FileEdit className="w-2.5 h-2.5" /> Draft
                  </span>
                )}
                {activePuIndex !== i && (
                  <button type="button" onClick={() => openPuAccordion(i)} className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors flex-shrink-0">
                    Edit
                  </button>
                )}
                <button type="button" onClick={() => setDeleteConfirm({ message: 'Delete this update? This cannot be undone.', action: () => { setProductUpdates((prev) => prev.filter((_, j) => j !== i)); if (activePuIndex === i) { setActivePuIndex(null); setPuDraft(null) } } })} className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {/* Expanded form */}
              {activePuIndex === i && puDraft && (
                <div className="border-t border-slate-100 px-4 py-4 space-y-3 bg-slate-50">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Title</Label>
                    <Input value={puDraft.title} onChange={(e) => setPuDraft((d) => d && ({ ...d, title: e.target.value }))} placeholder="e.g. Q2 launch milestone" className="h-9 text-sm bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">Content</Label>
                    <TiptapEditor value={puDraft.content} onChange={(v) => setPuDraft((d) => d && ({ ...d, content: v }))} placeholder="Describe this update..." minHeight="160px" />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <button type="button" onClick={() => setPuDraft((d) => d && ({ ...d, isDraft: !d.isDraft }))} className={cn('text-xs font-medium px-3 py-1.5 rounded-lg transition-colors', puDraft.isDraft ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-amber-50 text-amber-700 hover:bg-amber-100')}>
                      {puDraft.isDraft ? 'Publish' : 'Save as draft'}
                    </button>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setActivePuIndex(null); setPuDraft(null) }} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
                      <button type="button" onClick={savePuAccordion} className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors">Save</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* New update accordion */}
          {activePuIndex === -1 && puDraft ? (
            <div className="border border-slate-400 rounded-xl bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-700">New update</p>
              </div>
              <div className="px-4 py-4 space-y-3 bg-slate-50">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Title</Label>
                  <Input value={puDraft.title} onChange={(e) => setPuDraft((d) => d && ({ ...d, title: e.target.value }))} placeholder="e.g. Q2 launch milestone" className="h-9 text-sm bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Content</Label>
                  <TiptapEditor value={puDraft.content} onChange={(v) => setPuDraft((d) => d && ({ ...d, content: v }))} placeholder="Describe this update..." minHeight="160px" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <button type="button" onClick={() => setPuDraft((d) => d && ({ ...d, isDraft: !d.isDraft }))} className={cn('text-xs font-medium px-3 py-1.5 rounded-lg transition-colors', puDraft.isDraft ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-amber-50 text-amber-700 hover:bg-amber-100')}>
                    {puDraft.isDraft ? 'Publish' : 'Save as draft'}
                  </button>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setActivePuIndex(null); setPuDraft(null) }} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
                    <button type="button" onClick={savePuAccordion} className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors">Save</button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button type="button" onClick={openNewPuAccordion} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 rounded-xl px-4 py-3 w-full justify-center hover:border-slate-400 transition-colors mt-2">
              <Plus className="w-4 h-4" /> Add update
            </button>
          )}
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
        <Button type="button" variant="ghost" onClick={handleCancel} className="h-10 px-4 text-slate-600">
          Cancel
        </Button>
      </div>
      </div>{/* end left column */}

      {/* ── Right: live preview ── */}
      <div className="w-[48%] flex-shrink-0 sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white">
        <div className="px-1 py-2 border-b border-slate-100 flex items-center justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Live preview</span>
        </div>
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div
          className="px-6 py-6"
          onClickCapture={(e) => {
            const t = e.target as HTMLElement
            const btn = t.closest('button')
            if (btn && btn.type === 'submit') e.preventDefault()
            const a = t.closest('a')
            if (a && a.target !== '_blank') e.preventDefault()
          }}
        >
          {activeTab === 'card' ? (
            <ProductCardPreview product={{ ...previewProduct, features: [] }} />
          ) : (
            <ProductDetailClient product={previewProduct} />
          )}
        </div>
      </div>
      <ConfirmDialog
        open={leaveModal}
        title="Unsaved changes"
        message="You have unsaved changes. If you leave now, your changes will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Continue editing"
        variant="danger"
        onConfirm={() => { isDirty.current = false; router.push('/editor?tab=products') }}
        onCancel={() => setLeaveModal(false)}
      />
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Are you sure?"
        message={deleteConfirm?.message ?? ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => { deleteConfirm?.action(); setDeleteConfirm(null) }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </form>
  )
}
