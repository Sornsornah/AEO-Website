'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImagePlus, X, Plus, Trash2 } from 'lucide-react'

interface TeamMember { name: string; email: string }
interface HighlightStat { value: string; label: string }
interface UseCase { title: string; content: string; image: string; functionTag: string }

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

export function ProductDetailForm({ productId, defaultValues }: ProductDetailFormProps) {
  const router = useRouter()

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

  const [uploading, setUploading] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  async function handleUseCaseImageUpload(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const url = await uploadFile(file, `usecase-${index}`)
      setUseCases((prev) => prev.map((uc, i) => i === index ? { ...uc, image: url } : uc))
    } catch { setError('Use case image upload failed.') }
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
          overviewContent, highlightStats, useCases,
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
    <form onSubmit={handleSubmit} className="space-y-10">

      {/* ── Basics ── */}
      <section>
        <SectionHeader title="Basics" />
        <div className="space-y-4">
          {/* Logo */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Logo</Label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0">
                  <Image src={logoUrl} alt="Logo" fill className="object-contain p-1" />
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

      {/* ── Team ── */}
      <section>
        <SectionHeader title="Team" />
        <div className="grid grid-cols-2 gap-6">
          {/* Product Managers */}
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
          {/* Developers */}
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

      {/* ── Overview content ── */}
      <section>
        <SectionHeader title="Overview content" />
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

          {/* Overview content (markdown) */}
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
      </section>

      {/* ── Use cases ── */}
      <section>
        <SectionHeader title="Use cases" />
        <div className="space-y-6">
          {useCases.map((uc, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-3 relative">
              <button
                type="button"
                onClick={() => setUseCases((prev) => prev.filter((_, j) => j !== i))}
                className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Title</Label>
                  <Input value={uc.title} onChange={(e) => setUseCases((prev) => prev.map((item, j) => j === i ? { ...item, title: e.target.value } : item))} placeholder="Use case title" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Function tag</Label>
                  <Input value={uc.functionTag} onChange={(e) => setUseCases((prev) => prev.map((item, j) => j === i ? { ...item, functionTag: e.target.value } : item))} placeholder="e.g. HR, Policy, Operations" className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Content (Markdown)</Label>
                <textarea
                  value={uc.content}
                  onChange={(e) => setUseCases((prev) => prev.map((item, j) => j === i ? { ...item, content: e.target.value } : item))}
                  placeholder="Describe this use case in markdown..."
                  rows={5}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Cover image</Label>
                {uc.image ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 h-32">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={uc.image} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setUseCases((prev) => prev.map((item, j) => j === i ? { ...item, image: '' } : item))}
                      className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className={`inline-flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-slate-400 cursor-pointer transition-colors ${uploading === `usecase-${i}` ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUseCaseImageUpload(i, e)} disabled={!!uploading} />
                    <ImagePlus className="w-4 h-4" />
                    {uploading === `usecase-${i}` ? 'Uploading...' : 'Upload cover image'}
                  </label>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setUseCases((prev) => [...prev, { title: '', content: '', image: '', functionTag: '' }])}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 rounded-xl px-4 py-3 w-full justify-center hover:border-slate-400 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add use case
          </button>
        </div>
      </section>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</p>
      )}

      <div className="flex gap-3 pt-2 pb-10">
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
