'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TiptapEditor } from '@/components/editor/TiptapEditor'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { getCategoryDisplay, hexToBadgeStyle, hexToGradient, getInitials, type CategoriesMap } from '@/components/blog/blogUtils'
import type { BlogStatus } from '@/models/BlogPost'
import { ImagePlus, X, Clock } from 'lucide-react'

type BlogCategory = string

const SG_OFFSET_MS = 8 * 60 * 60 * 1000

function utcToSgInput(date: Date): string {
  const d = new Date(date.getTime() + SG_OFFSET_MS)
  const yr = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dy = String(d.getUTCDate()).padStart(2, '0')
  const hr = String(d.getUTCHours()).padStart(2, '0')
  const mn = String(d.getUTCMinutes()).padStart(2, '0')
  return `${yr}-${mo}-${dy}T${hr}:${mn}`
}

function sgInputToISO(value: string): string {
  return new Date(`${value}:00+08:00`).toISOString()
}

function sgDefaultFiveDays(): string {
  return utcToSgInput(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000))
}

const STATUS_OPTIONS: { value: BlogStatus; label: string; description: string }[] = [
  { value: 'draft', label: 'Draft', description: 'Not visible to readers' },
  { value: 'scheduled', label: 'Scheduled', description: 'Goes live on publish date' },
  { value: 'published', label: 'Published', description: 'Live and visible now' },
]

interface BlogPostFormProps {
  users: { _id: string; name: string }[]
  initialData?: {
    _id: string
    slug: string
    title: string
    excerpt: string
    content: string
    coverImage: string | null
    category: BlogCategory
    tags: string[]
    authorName: string
    publishedAt: string
    status: BlogStatus
    isFeatured: boolean
    featuredUntil: string | null
  }
}

export function BlogPostForm({ users, initialData }: BlogPostFormProps) {
  const router = useRouter()
  const isEdit = !!initialData

  const [title, setTitle] = useState(initialData?.title ?? '')
  const [excerpt, setExcerpt] = useState(initialData?.excerpt ?? '')
  const [content, setContent] = useState(initialData?.content ?? '')
  const [coverImage, setCoverImage] = useState(initialData?.coverImage ?? '')
  const [category, setCategory] = useState<BlogCategory>(initialData?.category ?? 'thought')
  const [tagInput, setTagInput] = useState(initialData?.tags.join(', ') ?? '')
  const [authorName, setAuthorName] = useState(initialData?.authorName ?? '')
  const [publishedAt, setPublishedAt] = useState(
    initialData?.publishedAt
      ? format(new Date(initialData.publishedAt), "yyyy-MM-dd'T'HH:mm")
      : format(new Date(), "yyyy-MM-dd'T'HH:mm")
  )
  const [status, setStatus] = useState<BlogStatus>(initialData?.status ?? 'draft')
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured ?? false)
  const [featuredUntil, setFeaturedUntil] = useState(
    initialData?.featuredUntil
      ? utcToSgInput(new Date(initialData.featuredUntil))
      : sgDefaultFiveDays()
  )

  const [categories, setCategories] = useState<{ slug: string; name: string; color: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/blog-categories')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data.map((c: { slug: string; name: string; color: string }) => ({ slug: c.slug, name: c.name, color: c.color })))
      })
      .catch(() => {})
  }, [])
  const previewContentRef = useRef<HTMLDivElement>(null)

  const isDirty = useRef(false)
  const mounted = useRef(false)
  const [leaveModal, setLeaveModal] = useState(false)

  useEffect(() => {
    if (mounted.current) isDirty.current = true
    else mounted.current = true
  }, [title, excerpt, content, coverImage, category, tagInput, authorName, publishedAt, status, isFeatured, featuredUntil])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (isDirty.current) e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // Write preview HTML on every change, preserving existing video DOM nodes so they don't glitch
  useEffect(() => {
    const el = previewContentRef.current
    if (!el) return
    // Save live video elements keyed by src before wiping innerHTML
    const saved = new Map<string, HTMLVideoElement>()
    el.querySelectorAll<HTMLVideoElement>('video').forEach((v) => { if (v.src) saved.set(v.src, v) })
    el.innerHTML = content
    // Swap newly-created video elements with the preserved originals
    el.querySelectorAll<HTMLVideoElement>('video').forEach((v) => {
      const original = saved.get(v.src)
      if (original) v.replaceWith(original)
    })
  }, [content])

  function handleCancel() {
    if (isDirty.current) setLeaveModal(true)
    else router.push('/editor?tab=blog')
  }

  async function handleImageUpload(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/uploads', { method: 'POST', body: formData })
      if (res.ok) {
        const { url } = await res.json()
        setCoverImage(url)
      }
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!title.trim() || !excerpt.trim() || !authorName.trim()) {
      setError('Title, excerpt, and author are required.')
      return
    }

    setSaving(true)
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const body = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      content,
      coverImage: coverImage.trim() || null,
      category,
      tags,
      authorName: authorName.trim(),
      publishedAt,
      status,
      isFeatured,
      featuredUntil: isFeatured && featuredUntil ? sgInputToISO(featuredUntil) : null,
    }

    try {
      let res: Response
      if (isEdit) {
        res = await fetch(`/api/blog/${initialData!.slug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Something went wrong.')
        return
      }
      isDirty.current = false
      router.push('/editor?tab=blog')
      router.refresh()
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setSaving(false)
    }
  }

  const categoriesMap: CategoriesMap = Object.fromEntries(categories.map((c) => [c.slug, { name: c.name, color: c.color }]))
  const { name: categoryLabel, color: categoryColor } = getCategoryDisplay(category, categoriesMap)
  const previewGradient = hexToGradient(categoryColor)
  const badgeStyle = hexToBadgeStyle(categoryColor)
  const parsedTags = tagInput.split(',').map((t) => t.trim()).filter(Boolean)
  const displayDate = publishedAt
    ? format(new Date(publishedAt), 'MMM dd, yyyy')
    : format(new Date(), 'MMM dd, yyyy')

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-[calc(100vh-140px)]">

        {/* ── Left: form ── */}
        <div className="space-y-5 pr-0 lg:pr-8 lg:border-r lg:border-slate-200 pb-10">

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What did you learn, ship, or discover?"
              className="h-10 text-base font-medium"
              required
            />
          </div>

          {/* Excerpt */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Excerpt / Subtitle *</Label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="One sentence that draws readers in..."
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              required
            />
          </div>

          {/* Cover image */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Cover Image</Label>
            {coverImage ? (
              <div className="relative rounded-xl overflow-hidden aspect-[16/9]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setCoverImage('')}
                  className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                className="relative rounded-xl overflow-hidden aspect-[16/9] cursor-pointer group"
                style={{ background: previewGradient }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/20 group-hover:bg-black/30 transition-colors">
                  {uploading ? (
                    <p className="text-white text-xs font-medium">Uploading...</p>
                  ) : (
                    <>
                      <ImagePlus className="w-6 h-6 text-white/80" />
                      <p className="text-white/80 text-xs font-medium">Click to upload</p>
                    </>
                  )}
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImageUpload(file)
              }}
            />
            <Input
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="or paste image URL..."
              className="h-8 text-xs"
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Content</Label>
            <TiptapEditor value={content} onChange={setContent} minHeight="300px" />
          </div>

          <div className="border-t border-slate-100 pt-5 grid grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Category *</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {categories.length === 0 && <option value={category}>{category}</option>}
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Author */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Author *</Label>
              <select
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="">Select author...</option>
                {users.map((u) => (
                  <option key={u._id} value={u.name}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Tags</Label>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Design, Trust, Adoption"
                className="h-9 text-sm"
              />
              <p className="text-[10px] text-slate-400">Comma-separated</p>
            </div>

            {/* Publish date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {status === 'scheduled' ? 'Publish Date *' : 'Publish Date'}
              </Label>
              <Input
                type="datetime-local"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className="h-9 text-sm"
                required={status === 'scheduled'}
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`px-2 py-2.5 rounded-lg border text-center transition-all ${
                    status === opt.value
                      ? opt.value === 'published'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : opt.value === 'scheduled'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-slate-100 border-slate-300 text-slate-700'
                      : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                  }`}
                >
                  <p className="text-xs font-semibold">{opt.label}</p>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400">
              {STATUS_OPTIONS.find((o) => o.value === status)?.description}
            </p>
          </div>

          {/* Featured toggle */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-slate-700">Featured Article</span>
              <button
                type="button"
                onClick={() => {
                setIsFeatured((v) => {
                  if (!v && !featuredUntil) setFeaturedUntil(sgDefaultFiveDays())
                  return !v
                })
              }}
                className={`relative rounded-full transition-colors ${isFeatured ? 'bg-amber-400' : 'bg-slate-200'}`}
                style={{ height: '22px', width: '40px' }}
              >
                <span
                  className={`absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform ${isFeatured ? 'translate-x-[18px]' : 'translate-x-0'}`}
                  style={{ width: '18px', height: '18px' }}
                />
              </button>
            </label>
            {isFeatured && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Featured Until <span className="normal-case font-normal text-slate-400">(SGT, UTC+8)</span></Label>
                <Input
                  type="datetime-local"
                  value={featuredUntil}
                  onChange={(e) => setFeaturedUntil(e.target.value)}
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-slate-400">Leave blank to feature indefinitely</p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Post'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              className="h-9 px-3 text-sm text-slate-500"
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* ── Right: live preview ── */}
        <div className="hidden lg:block pl-8">
          <div className="sticky top-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Preview</p>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden max-h-[calc(100vh-140px)] overflow-y-auto">
              <div className="px-8 py-8">

                {/* Category + date */}
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={badgeStyle}
                  >
                    {categoryLabel}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    {displayDate}
                    <span>·</span>
                    <Clock className="w-3 h-3" />
                    1 min read
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-slate-900 leading-tight mb-3">
                  {title || <span className="text-slate-300">Your title will appear here</span>}
                </h1>

                {/* Excerpt */}
                <p className="text-base text-slate-500 italic leading-relaxed mb-6">
                  {excerpt || <span className="text-slate-300">Your excerpt will appear here</span>}
                </p>

                {/* Cover image */}
                <div className="mb-6 rounded-xl overflow-hidden aspect-[16/9]">
                  {coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverImage} alt={title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ background: previewGradient }} />
                  )}
                </div>

                {/* Author row */}
                {authorName && (
                  <div className="flex items-center gap-3 mb-8 pb-8 border-b border-slate-100">
                    <span className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 text-sm font-bold flex items-center justify-center flex-shrink-0">
                      {getInitials(authorName)}
                    </span>
                    <p className="text-sm font-semibold text-slate-900">{authorName}</p>
                  </div>
                )}

                {/* Content — ref-managed to avoid replacing playing video nodes */}
                {!content && (
                  <p className="text-slate-300 text-sm mb-6">Your content will appear here...</p>
                )}
                <div
                  ref={previewContentRef}
                  className="prose prose-slate prose-sm max-w-none mb-6 prose-headings:font-bold prose-a:text-orange-600 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-orange-400 prose-blockquote:pl-4 prose-blockquote:text-slate-500 prose-blockquote:not-italic prose-blockquote:bg-transparent prose-blockquote:border-r-0 prose-blockquote:border-t-0 prose-blockquote:border-b-0"
                />

                {/* Tags */}
                {parsedTags.length > 0 && (
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tags</span>
                    <div className="flex flex-wrap gap-1.5">
                      {parsedTags.map((tag) => (
                        <span key={tag} className="text-xs px-2.5 py-1 rounded-full border border-slate-200 text-slate-500">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      <ConfirmDialog
        open={leaveModal}
        title="Unsaved changes"
        message="You have unsaved changes. If you leave now, your changes will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Continue editing"
        variant="danger"
        onConfirm={() => { isDirty.current = false; router.push('/editor?tab=blog') }}
        onCancel={() => setLeaveModal(false)}
      />
    </form>
  )
}
