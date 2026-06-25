'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNavigationGuard } from '@/hooks/useNavigationGuard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ImagePlus, X, Plus, Trash2, FileEdit, CheckCircle2, ArrowLeft, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ProductDetailClient } from '@/features/products/components/product-detail-client'
import { ProductCardPreview } from '@/features/products/components/product-card-preview'
import { TiptapEditor } from '@/features/editor/components/tiptap-editor'
import { uploadImage, imageFileFromClipboardData } from '@/features/editor/lib/image-data-url'

interface TeamMember { name: string; email: string }
interface UseCase { title: string; content: string; functionTag: string; isDraft: boolean }
interface ProductUpdate { title: string; content: string; date: string; isDraft: boolean }

type Tab = 'card' | 'overview' | 'usecases' | 'content'

const TABS: { id: Tab; label: string }[] = [
  { id: 'card', label: 'Card information' },
  { id: 'overview', label: 'Overview' },
  { id: 'usecases', label: 'Use cases' },
  { id: 'content', label: 'Release Notes' },
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
    maintainedByAEO: boolean
    maintainerNote: string
    productManagers: TeamMember[]
    developers: TeamMember[]
    overviewContent: string
    useCases: UseCase[]
    productUpdates: ProductUpdate[]
  }
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

// Normalize Tiptap's empty-paragraph output so an untouched editor isn't dirty
function normHtml(s: string) {
  return (!s || s === '<p></p>' || s === '<p><br class="ProseMirror-trailingBreak"></p>') ? '' : s
}

// Pointer-based drag-to-reorder for a flat list (mirrors update-reorder-view).
// `onReorder` is called as the drag moves (and once with null to clear the
// dragging highlight); `onDrop` fires once on release with the final order.
function beginPointerReorder<T>(
  e: React.PointerEvent,
  startIndex: number,
  list: T[],
  listEl: HTMLElement | null,
  onReorder: (next: T[], draggingIndex: number | null) => void,
  onDrop: (next: T[]) => void,
) {
  e.preventDefault()
  let items = [...list]
  let draggedIdx = startIndex
  onReorder(items, startIndex)

  function indexAtY(y: number): number {
    if (!listEl) return draggedIdx
    const children = Array.from(listEl.children) as HTMLElement[]
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect()
      if (y < rect.top + rect.height / 2) return i
    }
    return children.length - 1
  }

  function onMove(ev: PointerEvent) {
    const targetIdx = indexAtY(ev.clientY)
    if (targetIdx === draggedIdx) return
    const next = [...items]
    const [item] = next.splice(draggedIdx, 1)
    next.splice(targetIdx, 0, item)
    items = next
    draggedIdx = targetIdx
    onReorder(items, draggedIdx)
  }

  function onUp() {
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onUp)
    onReorder(items, null)
    onDrop(items)
  }

  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', onUp)
}

export function ProductDetailForm({ productId, productSlug, defaultValues }: ProductDetailFormProps) {
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
  const [maintainedByAEO, setMaintainedByAEO] = useState(defaultValues.maintainedByAEO)
  const [maintainerNote, setMaintainerNote] = useState(defaultValues.maintainerNote)
  const [productManagers, setProductManagers] = useState<TeamMember[]>(defaultValues.productManagers)
  const [developers, setDevelopers] = useState<TeamMember[]>(defaultValues.developers)
  const [overviewContent, setOverviewContent] = useState(defaultValues.overviewContent)
  const [useCases, setUseCases] = useState<UseCase[]>(defaultValues.useCases)
  const [productUpdates, setProductUpdates] = useState<ProductUpdate[]>(defaultValues.productUpdates)

  const [uploading, setUploading] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPublished, setShowPublished] = useState(false)

  const [pendingNav, setPendingNav] = useState<null | (() => void)>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ message: string; action: () => void } | null>(null)

  // --- Dirty detection via value comparison ---

  function makeSnapshot(overrides?: { useCases?: UseCase[]; productUpdates?: ProductUpdate[] }): string {
    return JSON.stringify({
      name, description, shortDescription, status, color,
      logoUrl: logoUrl || '',
      uiScreenshot: uiScreenshot || '',
      websiteUrl: websiteUrl || '',
      deckUrl: deckUrl || '',
      contactUsUrl: contactUsUrl || '',
      maintainedByAEO, maintainerNote,
      productManagers, developers,
      overviewContent: normHtml(overviewContent),
      useCases: overrides?.useCases ?? useCases,
      productUpdates: overrides?.productUpdates ?? productUpdates,
    })
  }

  // Baseline is captured from initial state (== defaultValues) on first render
  const baseline = useRef<string>(makeSnapshot())

  function isFormDirty(): boolean {
    return makeSnapshot() !== baseline.current
  }

  // Keep a ref so event handlers (beforeunload, navigation guard) always read latest state
  const isFormDirtyRef = useRef(isFormDirty)
  isFormDirtyRef.current = isFormDirty

  useNavigationGuard({
    when: () => isFormDirtyRef.current(),
    onBlock: (continueNav) => setPendingNav(() => continueNav),
  })

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (isFormDirtyRef.current()) e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  function handleCancel() {
    if (isFormDirty()) setPendingNav(() => () => router.push('/editor?tab=products'))
    else router.push('/editor?tab=products')
  }

  // Drag-to-reorder for the use case / release note lists
  const ucListRef = useRef<HTMLDivElement | null>(null)
  const puListRef = useRef<HTMLDivElement | null>(null)
  const [ucDragIndex, setUcDragIndex] = useState<number | null>(null)
  const [puDragIndex, setPuDragIndex] = useState<number | null>(null)

  function startUcDrag(e: React.PointerEvent, index: number) {
    if (useCases.length < 2 || activeUcIndex !== null) return
    beginPointerReorder(
      e, index, useCases, ucListRef.current,
      (next, d) => { setUseCases(next); setUcDragIndex(d) },
      (next) => { void submitForm({ useCases: next }) },
    )
  }

  function startPuDrag(e: React.PointerEvent, index: number) {
    if (productUpdates.length < 2 || activePuIndex !== null) return
    beginPointerReorder(
      e, index, productUpdates, puListRef.current,
      (next, d) => { setProductUpdates(next); setPuDragIndex(d) },
      (next) => { void submitForm({ productUpdates: next }) },
    )
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
    setUcDraft({ title: '', content: '', functionTag: '', isDraft: false })
  }
  async function saveUcAccordion(isDraft: boolean) {
    if (!ucDraft) return
    const entry = { ...ucDraft, isDraft }
    const next = activeUcIndex === -1
      ? [entry, ...useCases]
      : useCases.map((uc, i) => i === activeUcIndex ? entry : uc)
    setUseCases(next)
    const ok = await submitForm({ useCases: next })
    if (ok) {
      setActiveUcIndex(null)
      setUcDraft(null)
    }
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
  async function savePuAccordion(isDraft: boolean) {
    if (!puDraft) return
    const entry = { ...puDraft, isDraft }
    const next = activePuIndex === -1
      ? [entry, ...productUpdates]
      : productUpdates.map((u, i) => i === activePuIndex ? entry : u)
    setProductUpdates(next)
    const ok = await submitForm({ productUpdates: next })
    if (ok) {
      setActivePuIndex(null)
      setPuDraft(null)
    }
  }

  // Upload a picked/pasted image to GridFS and store the returned URL. Both the
  // logo and the UI screenshot are uploaded as-is (screenshots are downscaled to
  // max 1600px wide). Never inline base64 — the deploy WAF 403s any body with ";base64,".
  async function setImageFromFile(file: File, target: 'logo' | 'screenshot') {
    setUploading(target)
    try {
      const url = await uploadImage(file, target === 'screenshot' ? 1600 : undefined)
      if (target === 'logo') setLogoUrl(url)
      else setUiScreenshot(url)
    }
    catch { setError(`Could not upload ${target} image.`) }
    finally { setUploading(null) }
  }

  function handleImagePaste(e: React.ClipboardEvent, target: 'logo' | 'screenshot') {
    const file = imageFileFromClipboardData(e.clipboardData)
    if (file) {
      e.preventDefault()
      setImageFromFile(file, target)
    }
  }

  async function submitForm(overrides?: { useCases?: UseCase[]; productUpdates?: ProductUpdate[] }): Promise<boolean> {
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
          maintainedByAEO, maintainerNote,
          productManagers, developers,
          overviewContent,
          useCases: overrides?.useCases ?? useCases,
          productUpdates: overrides?.productUpdates ?? productUpdates,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save')
        return false
      }
      baseline.current = makeSnapshot(overrides)
      router.refresh()
      setShowPublished(true)
      setTimeout(() => setShowPublished(false), 3000)
      return true
    } catch {
      setError('An unexpected error occurred.')
      return false
    } finally {
      setLoading(false)
    }
  }

  function handleTabClick(tabId: Tab) {
    if (tabId === activeTab) return
    const leavingGuarded = activeTab === 'card' || activeTab === 'overview'
    if (leavingGuarded && isFormDirty()) {
      setPendingNav(() => () => setActiveTab(tabId))
    } else {
      setActiveTab(tabId)
    }
  }

  const previewUseCases = (() => {
    const base = useCases.map((uc, i) => {
      if (activeUcIndex === i && ucDraft) return ucDraft
      return uc
    })
    if (activeUcIndex === -1 && ucDraft) return [ucDraft, ...base]
    return base
  })()

  const previewProductUpdates = (() => {
    const base = productUpdates.map((u, i) => {
      if (activePuIndex === i && puDraft) return puDraft
      return u
    })
    if (activePuIndex === -1 && puDraft) return [puDraft, ...base]
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
    maintainedByAEO,
    maintainerNote,
    productManagers: productManagers.filter((m) => m.name || m.email),
    developers: developers.filter((d) => d.name || d.email),
    overviewContent: overviewContent || undefined,
    vision: undefined,
    mission: undefined,
    goals: undefined,
    useCases: previewUseCases.map((uc) => ({ title: uc.title, content: uc.content, functionTag: uc.functionTag || undefined, isDraft: uc.isDraft })),
    productUpdates: previewProductUpdates.map((u) => ({ title: u.title, content: u.content, date: u.date, isDraft: u.isDraft })),
  }

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      {/* Back button — above the page heading */}
      <button
        type="button"
        onClick={handleCancel}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to editor
      </button>
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Edit product page</h1>
      <div className="flex gap-8 items-start">
      {/* ── Left: editor ── */}
      <div className="flex-1 min-w-0 pb-8">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab.id)}
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
            <div
              tabIndex={0}
              onPaste={(e) => handleImagePaste(e, 'logo')}
              onClick={(e) => (e.currentTarget as HTMLElement).focus()}
              className="flex items-center gap-4 rounded-xl outline-none focus:ring-2 focus:ring-slate-300"
            >
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
              <span className={`inline-flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 cursor-text transition-colors ${uploading === 'logo' ? 'opacity-50' : ''}`}>
                <ImagePlus className="w-4 h-4" />
                {uploading === 'logo' ? 'Adding...' : 'Paste (Ctrl + V) your image here'}
              </span>
            </div>
            <p className="text-xs text-slate-400">Click the logo area, then paste your image (Ctrl/⌘+V).</p>
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
            <div
              tabIndex={0}
              onPaste={(e) => handleImagePaste(e, 'screenshot')}
              onClick={(e) => (e.currentTarget as HTMLElement).focus()}
              className="rounded-xl outline-none focus:ring-2 focus:ring-slate-300"
            >
            {uiScreenshot ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={uiScreenshot} alt="UI screenshot" className="max-w-full h-auto max-h-[28rem] object-contain mx-auto block" />
                <button type="button" onClick={() => setUiScreenshot('')} className="absolute top-2 right-2 bg-black/50 rounded-full p-1 text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className={`inline-flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 cursor-text transition-colors ${uploading === 'screenshot' ? 'opacity-50' : ''}`}>
                <ImagePlus className="w-4 h-4" />
                {uploading === 'screenshot' ? 'Adding...' : 'Paste (Ctrl + V) your image here'}
              </span>
            )}
            </div>
            <p className="text-xs text-slate-400">Click the screenshot area, then paste your image (Ctrl/⌘+V).</p>
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

          {/* Inline save row */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            {error && <p className="text-sm text-red-600 mr-auto">{error}</p>}
            <Button type="button" variant="ghost" onClick={handleCancel} className="h-9 px-4 text-slate-600">
              Cancel
            </Button>
            <Button type="button" disabled={loading} onClick={() => submitForm()} className="bg-orange-600 hover:bg-orange-700 text-white h-9 px-5">
              {loading ? 'Publishing...' : 'Publish changes'}
            </Button>
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
                    <SelectItem value="live"><span className="text-emerald-500">●</span> Live</SelectItem>
                    <SelectItem value="beta"><span className="text-amber-500">●</span> Beta</SelectItem>
                    <SelectItem value="coming_soon"><span className="text-slate-400">●</span> Coming Soon</SelectItem>
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

            {/* Maintained-by-AEO toggle */}
            <div className="flex items-start justify-between gap-4 mb-5 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-700">Maintained by AEO</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Turn off if another department owns this product — you&apos;ll add a contact note instead of a team.
                </p>
              </div>
              <Switch checked={maintainedByAEO} onCheckedChange={setMaintainedByAEO} className="mt-0.5" />
            </div>

            {!maintainedByAEO ? (
              <div className="space-y-1.5">
                <Label htmlFor="maintainerNote" className="text-sm font-medium text-slate-700">Maintainer note</Label>
                <Input
                  id="maintainerNote"
                  value={maintainerNote}
                  onChange={(e) => setMaintainerNote(e.target.value)}
                  placeholder="Maintained by the X team — contact name@company.com"
                  className="h-10"
                />
                <p className="text-xs text-slate-400">Shown to users in place of the Product Managers / Developers boxes.</p>
              </div>
            ) : (
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
            )}
          </section>

          <section>
            <SectionHeader title="Content" />
            <div className="space-y-5">
              {/* Overview content */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Overview content</Label>
                <TiptapEditor value={overviewContent} onChange={setOverviewContent} placeholder="Write an overview — headings, bullet lists, bold, links..." minHeight="240px" />
              </div>

            </div>
          </section>

          {/* Inline save row */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            {error && <p className="text-sm text-red-600 mr-auto">{error}</p>}
            <Button type="button" variant="ghost" onClick={handleCancel} className="h-9 px-4 text-slate-600">
              Cancel
            </Button>
            <Button type="button" disabled={loading} onClick={() => submitForm()} className="bg-orange-600 hover:bg-orange-700 text-white h-9 px-5">
              {loading ? 'Publishing...' : 'Publish changes'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Use cases ── */}
      {activeTab === 'usecases' && (
        <div className="space-y-2">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div ref={ucListRef} className="space-y-2">
          {useCases.map((uc, i) => (
            <div key={i} className={cn('border rounded-xl bg-white overflow-hidden transition-opacity', ucDragIndex === i && 'opacity-40', activeUcIndex === i ? 'border-slate-400' : uc.isDraft ? 'border-amber-200' : 'border-slate-200')}>
              {/* Collapsed header */}
              <div className="flex items-center gap-3 px-4 py-3">
                {useCases.length > 1 && activeUcIndex === null && (
                  <button
                    type="button"
                    onPointerDown={(e) => startUcDrag(e, i)}
                    className="touch-none cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0 -ml-1"
                    aria-label="Drag to reorder"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>
                )}
                <div className="flex-1 min-w-0 flex items-baseline gap-2">
                  <p className="text-sm font-semibold text-slate-900 truncate">{uc.title || <span className="text-slate-400 font-normal">Untitled use case</span>}</p>
                  {uc.functionTag && <p className="text-xs text-slate-500 truncate flex-shrink-0">{uc.functionTag}</p>}
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
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                    <button type="button" onClick={() => { setActiveUcIndex(null); setUcDraft(null) }} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
                    <button type="button" disabled={loading} onClick={() => saveUcAccordion(true)} className="px-4 py-2 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
                      {loading ? 'Saving…' : 'Save as draft'}
                    </button>
                    <button type="button" disabled={loading} onClick={() => saveUcAccordion(false)} className="px-4 py-2 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50">
                      {loading ? 'Saving…' : 'Publish'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          </div>

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
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button type="button" onClick={() => { setActiveUcIndex(null); setUcDraft(null) }} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
                  <button type="button" disabled={loading} onClick={() => saveUcAccordion(true)} className="px-4 py-2 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
                    {loading ? 'Saving…' : 'Save as draft'}
                  </button>
                  <button type="button" disabled={loading} onClick={() => saveUcAccordion(false)} className="px-4 py-2 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50">
                    {loading ? 'Saving…' : 'Publish'}
                  </button>
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div ref={puListRef} className="space-y-2">
          {productUpdates.map((u, i) => (
            <div key={i} className={cn('border rounded-xl bg-white overflow-hidden transition-opacity', puDragIndex === i && 'opacity-40', activePuIndex === i ? 'border-slate-400' : u.isDraft ? 'border-amber-200' : 'border-slate-200')}>
              {/* Collapsed header */}
              <div className="flex items-center gap-3 px-4 py-3">
                {productUpdates.length > 1 && activePuIndex === null && (
                  <button
                    type="button"
                    onPointerDown={(e) => startPuDrag(e, i)}
                    className="touch-none cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0 -ml-1"
                    aria-label="Drag to reorder"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{u.title || <span className="text-slate-400 font-normal">Untitled release note</span>}</p>
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
                <button type="button" onClick={() => setDeleteConfirm({ message: 'Delete this release note? This cannot be undone.', action: () => { setProductUpdates((prev) => prev.filter((_, j) => j !== i)); if (activePuIndex === i) { setActivePuIndex(null); setPuDraft(null) } } })} className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
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
                    <TiptapEditor value={puDraft.content} onChange={(v) => setPuDraft((d) => d && ({ ...d, content: v }))} placeholder="Describe this release note..." minHeight="160px" />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                    <button type="button" onClick={() => { setActivePuIndex(null); setPuDraft(null) }} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
                    <button type="button" disabled={loading} onClick={() => savePuAccordion(true)} className="px-4 py-2 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
                      {loading ? 'Saving…' : 'Save as draft'}
                    </button>
                    <button type="button" disabled={loading} onClick={() => savePuAccordion(false)} className="px-4 py-2 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50">
                      {loading ? 'Saving…' : 'Publish'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          </div>

          {/* New update accordion */}
          {activePuIndex === -1 && puDraft ? (
            <div className="border border-slate-400 rounded-xl bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-700">New release note</p>
              </div>
              <div className="px-4 py-4 space-y-3 bg-slate-50">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Title</Label>
                  <Input value={puDraft.title} onChange={(e) => setPuDraft((d) => d && ({ ...d, title: e.target.value }))} placeholder="e.g. Q2 launch milestone" className="h-9 text-sm bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Content</Label>
                  <TiptapEditor value={puDraft.content} onChange={(v) => setPuDraft((d) => d && ({ ...d, content: v }))} placeholder="Describe this release note..." minHeight="160px" />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button type="button" onClick={() => { setActivePuIndex(null); setPuDraft(null) }} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
                  <button type="button" disabled={loading} onClick={() => savePuAccordion(true)} className="px-4 py-2 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
                    {loading ? 'Saving…' : 'Save as draft'}
                  </button>
                  <button type="button" disabled={loading} onClick={() => savePuAccordion(false)} className="px-4 py-2 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50">
                    {loading ? 'Saving…' : 'Publish'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button type="button" onClick={openNewPuAccordion} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 rounded-xl px-4 py-3 w-full justify-center hover:border-slate-400 transition-colors mt-2">
              <Plus className="w-4 h-4" /> Add release note
            </button>
          )}
        </div>
      )}

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
      </div>{/* end flex row */}

      {/* Unsaved changes — three-way modal (card/overview tab switches and leave-page) */}
      <ConfirmDialog
        open={!!pendingNav}
        title="Unsaved changes"
        message="You have unsaved changes. Save before continuing or discard them."
        confirmLabel="Publish and continue"
        tertiaryLabel="Discard changes"
        cancelLabel="Stay here"
        onConfirm={async () => {
          const nav = pendingNav!
          setPendingNav(null)
          const ok = await submitForm()
          if (ok) { baseline.current = makeSnapshot(); nav() }
        }}
        onTertiary={() => { const nav = pendingNav!; setPendingNav(null); baseline.current = makeSnapshot(); nav() }}
        onCancel={() => setPendingNav(null)}
      />
      {/* Published toast */}
      {showPublished && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          Changes published
        </div>
      )}

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
