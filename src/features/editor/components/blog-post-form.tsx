'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useNavigationGuard } from '@/hooks/useNavigationGuard'
import { format } from 'date-fns'
import {
  toDateInput,
  todayDateInput,
  utcToSgtInput,
  sgtInputToUtcIso,
  nowSgtInput,
  isValidDateInput,
  isValidDateTimeLocal,
  isFutureSgtInput,
} from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TiptapEditor } from '@/features/editor/components/tiptap-editor'
import { uploadImage, imageFileFromClipboardData, fileFromUrl } from '@/features/editor/lib/image-data-url'
import { useImageCrop } from '@/features/editor/components/image-crop-dialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { getCategoryDisplay, hexToBadgeStyle, hexToGradient, getInitials, type CategoriesMap } from '@/features/blog/components/blog-utils'
import type { BlogStatus } from '@/models/BlogPost'
import { ImagePlus, X, Clock, Check, ChevronDown } from 'lucide-react'
import { track } from '@/lib/track'

type BlogCategory = string

// Surface the server's real reason for a failed save. API routes return either
// `{ error: string }` or, for Zod validation failures, `{ errors: Record<field, string[]> }`.
async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data?.error === 'string') return data.error
    if (data?.errors && typeof data.errors === 'object') {
      const fields = Object.entries(data.errors as Record<string, string[]>)
        .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(', ')}`)
        .filter(Boolean)
      if (fields.length) return fields.join(' · ')
    }
  } catch {
    // Non-JSON body — fall through to the generic message.
  }
  return 'Something went wrong.'
}

function sgDefaultFiveDays(): string {
  return utcToSgtInput(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000))
}

const STATUS_OPTIONS: { value: BlogStatus; label: string; description: string }[] = [
  { value: 'draft', label: 'Draft', description: 'Not visible to readers' },
  { value: 'published', label: 'Published', description: 'Live and visible now' },
]

interface BlogPostFormProps {
  users: { _id: string; name: string }[]
  isAdmin: boolean
  currentUserName?: string
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

export function BlogPostForm({ users, isAdmin, currentUserName, initialData }: BlogPostFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEdit = !!initialData

  const [title, setTitle] = useState(initialData?.title ?? '')
  const [excerpt, setExcerpt] = useState(initialData?.excerpt ?? '')
  const [content, setContent] = useState(initialData?.content ?? '')
  const [coverImage, setCoverImage] = useState(initialData?.coverImage ?? '')
  const [category, setCategory] = useState<BlogCategory>(initialData?.category ?? 'thought')
  const [tagInput, setTagInput] = useState(initialData?.tags.join(', ') ?? '')
  const [authorName, setAuthorName] = useState(initialData?.authorName ?? currentUserName ?? '')
  const [publishedAt, setPublishedAt] = useState(
    initialData?.publishedAt
      ? toDateInput(initialData.publishedAt)
      : todayDateInput()
  )
  const [status, setStatus] = useState<BlogStatus>(initialData?.status ?? 'draft')
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured ?? false)
  const [featuredUntil, setFeaturedUntil] = useState(
    initialData?.featuredUntil
      ? utcToSgtInput(initialData.featuredUntil)
      : sgDefaultFiveDays()
  )

  const [categories, setCategories] = useState<{ slug: string; name: string; color: string; purpose?: string }[]>([])
  const [categoryOpen, setCategoryOpen] = useState(false)
  const categoryRef = useRef<HTMLDivElement>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { cropDialog, requestCrop } = useImageCrop()
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/blog/categories')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data.map((c: { slug: string; name: string; color: string; purpose?: string }) => ({ slug: c.slug, name: c.name, color: c.color, purpose: c.purpose })))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!categoryOpen) return
    function onPointerDown(e: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setCategoryOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setCategoryOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [categoryOpen])

  const previewContentRef = useRef<HTMLDivElement>(null)

  const isDirty = useRef(false)
  const mounted = useRef(false)
  const [pendingNav, setPendingNav] = useState<null | (() => void)>(null)

  useEffect(() => {
    if (mounted.current) isDirty.current = true
    else mounted.current = true
  }, [title, excerpt, content, coverImage, category, tagInput, authorName, publishedAt, status, isFeatured, featuredUntil])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (isDirty.current) e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  useNavigationGuard({
    when: () => isDirty.current,
    onBlock: (continueNav) => setPendingNav(() => continueNav),
  })

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

  // When the author arrived from the blog page (?from=blog), return them to
  // blog → My Posts rather than the editor dashboard.
  const exitHref =
    searchParams.get('from') === 'blog'
      ? '/blog?tab=my-posts'
      : isAdmin
        ? '/editor?tab=blog'
        : '/blog'

  function handleCancel() {
    if (isDirty.current) setPendingNav(() => () => router.push(exitHref))
    else router.push(exitHref)
  }

  // Cover images are downscaled to max 1600px wide and uploaded to GridFS; the
  // stored value is the returned URL (never inline base64 — the deploy WAF 403s
  // any body containing ";base64,").
  async function handleImageUpload(file: File) {
    const cropped = await requestCrop(file, { aspect: 16 / 9, title: 'Crop cover image' })
    if (!cropped) return // user cancelled the crop dialog
    setUploading(true)
    try {
      setCoverImage(await uploadImage(cropped, 1600))
    } catch {
      setError('Could not upload cover image.')
    } finally {
      setUploading(false)
    }
  }

  function handleCoverPaste(e: React.ClipboardEvent) {
    const file = imageFileFromClipboardData(e.clipboardData)
    if (file) {
      e.preventDefault()
      handleImageUpload(file)
    }
  }

  // Click the existing cover to re-open the crop dialog on it.
  async function recropCover() {
    if (!coverImage) return
    try {
      await handleImageUpload(await fileFromUrl(coverImage, 'cover'))
    } catch { setError('Could not load cover image.') }
  }

  async function submitForm(): Promise<boolean> {
    setError('')

    if (!title.trim() || !excerpt.trim() || !authorName.trim()) {
      setError('Title, excerpt, and author are required.')
      return false
    }

    if (publishedAt && !isValidDateInput(publishedAt)) {
      setError('Please choose a valid publish date.')
      return false
    }
    if (isFeatured && featuredUntil) {
      if (!isValidDateTimeLocal(featuredUntil)) {
        setError('Please choose a valid "Featured until" date.')
        return false
      }
      if (!isFutureSgtInput(featuredUntil)) {
        setError('"Featured until" must be a future date.')
        return false
      }
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
      featuredUntil: isFeatured && featuredUntil ? sgtInputToUtcIso(featuredUntil) : null,
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
        setError(await extractErrorMessage(res))
        return false
      }
      const savedPost = await res.json().catch(() => null)
      if (status === 'published') {
        track('blog_post', { entityId: savedPost?._id, entityType: 'blog', category })
      } else if (status === 'draft') {
        track('blog_draft', { entityId: savedPost?._id, entityType: 'blog', category })
      }
      isDirty.current = false
      setSaved(true)
      router.refresh()
      return true
    } catch {
      setError('An unexpected error occurred.')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await submitForm()
    if (ok) {
      await new Promise((r) => setTimeout(r, 900))
      router.push(exitHref)
    }
  }

  const categoriesMap: CategoriesMap = Object.fromEntries(categories.map((c) => [c.slug, { name: c.name, color: c.color }]))
  const { name: categoryLabel, color: categoryColor } = getCategoryDisplay(category, categoriesMap)
  const previewGradient = hexToGradient(categoryColor)
  const badgeStyle = hexToBadgeStyle(categoryColor)
  const parsedTags = tagInput.split(',').map((t) => t.trim()).filter(Boolean)
  const displayDate = format(
    isValidDateInput(publishedAt) ? new Date(publishedAt) : new Date(),
    'MMM dd, yyyy'
  )

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
          <div
            tabIndex={0}
            onPaste={handleCoverPaste}
            onClick={(e) => (e.currentTarget as HTMLElement).focus()}
            className="space-y-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-300"
          >
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Cover Image</Label>
            {coverImage ? (
              <div className="relative rounded-xl overflow-hidden aspect-[16/9]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverImage} alt="Cover" title="Click to re-crop" onClick={recropCover} className="w-full h-full object-cover cursor-pointer" />
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
                className="relative rounded-xl overflow-hidden aspect-[16/9] cursor-text group"
                style={{ background: previewGradient }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/20 group-hover:bg-black/30 transition-colors">
                  {uploading ? (
                    <p className="text-white text-xs font-medium">Adding...</p>
                  ) : (
                    <>
                      <ImagePlus className="w-6 h-6 text-white/80" />
                      <p className="text-white/80 text-xs font-medium">Paste (Ctrl + V) your image here</p>
                    </>
                  )}
                </div>
              </div>
            )}
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
              <div ref={categoryRef} className="relative">
                <button
                  type="button"
                  onClick={() => setCategoryOpen((o) => !o)}
                  aria-haspopup="listbox"
                  aria-expanded={categoryOpen}
                  className="w-full h-9 flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <span className="truncate text-left">
                    {categories.find((c) => c.slug === category)?.name ?? category}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 flex-shrink-0 text-slate-400 transition-transform ${categoryOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {categoryOpen && categories.length > 0 && (
                  <div
                    role="listbox"
                    className="absolute z-40 mt-1.5 w-full max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
                  >
                    {categories.map((c) => {
                      const active = c.slug === category
                      return (
                        <button
                          key={c.slug}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            setCategory(c.slug)
                            setCategoryOpen(false)
                          }}
                          className={`w-full text-left px-4 py-2 transition-colors hover:bg-slate-50 ${active ? 'bg-slate-50' : ''}`}
                        >
                          <span className={`block text-sm font-semibold ${active ? 'text-orange-600' : 'text-slate-900'}`}>
                            {c.name}
                          </span>
                          {c.purpose && (
                            <span className="mt-0.5 block text-xs leading-snug text-slate-400">{c.purpose}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Author */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Author *</Label>
              {isAdmin ? (
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
              ) : (
                <div className="h-9 flex items-center px-3 rounded-md border border-input bg-slate-50 text-sm text-slate-600">
                  {authorName}
                </div>
              )}
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
                Publish Date
              </Label>
              <Input
                type="date"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`px-2 py-2.5 rounded-lg border text-center transition-all ${
                    status === opt.value
                      ? opt.value === 'published'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
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

          {/* Featured toggle — admin only */}
          {isAdmin && (
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
                    min={nowSgtInput()}
                  />
                  <p className="text-[10px] text-slate-400">Leave blank to feature indefinitely</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              disabled={saving || saved}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white h-9 text-sm"
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : isEdit ? 'Save Changes' : 'Create Post'}
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
        open={!!pendingNav}
        title="Unsaved changes"
        message="You have unsaved changes that haven't been saved yet."
        confirmLabel="Keep editing"
        cancelLabel="Cancel changes"
        onConfirm={() => setPendingNav(null)}
        onCancel={() => { const run = pendingNav!; setPendingNav(null); isDirty.current = false; run() }}
      />
      <div
        className={`fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg transition-all duration-300 ${
          saved ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <Check size={14} className="text-emerald-400 flex-shrink-0" />
        {isEdit ? 'Changes saved' : 'Post created'}
      </div>

      {cropDialog}
    </form>
  )
}
