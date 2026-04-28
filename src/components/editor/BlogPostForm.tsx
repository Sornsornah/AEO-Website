'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MarkdownEditor } from '@/components/editor/MarkdownEditor'
import { CATEGORY_LABELS, CATEGORY_GRADIENTS } from '@/components/blog/blogUtils'
import type { BlogCategory, BlogStatus } from '@/models/BlogPost'
import { ImagePlus, X } from 'lucide-react'

const CATEGORIES: { value: BlogCategory; label: string }[] = [
  { value: 'thought', label: CATEGORY_LABELS['thought'] },
  { value: 'learning-journey', label: CATEGORY_LABELS['learning-journey'] },
  { value: 'field-notes', label: CATEGORY_LABELS['field-notes'] },
  { value: 'deep-dive', label: CATEGORY_LABELS['deep-dive'] },
]

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

  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      router.push('/editor?tab=blog')
      router.refresh()
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setSaving(false)
    }
  }

  const previewGradient = CATEGORY_GRADIENTS[category]

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
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

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Content (Markdown)</Label>
            <MarkdownEditor value={content} onChange={setContent} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
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
                className={`relative rounded-xl overflow-hidden aspect-[16/9] bg-gradient-to-br ${previewGradient} cursor-pointer group`}
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

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Category *</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BlogCategory)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
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

          {/* Publish date — always shown, required for scheduled */}
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

          {/* Featured toggle */}
          <label className="flex items-center justify-between cursor-pointer pt-1">
            <span className="text-sm font-medium text-slate-700">Featured Article</span>
            <button
              type="button"
              onClick={() => setIsFeatured((v) => !v)}
              className={`relative rounded-full transition-colors ${isFeatured ? 'bg-amber-400' : 'bg-slate-200'}`}
              style={{ height: '22px', width: '40px' }}
            >
              <span
                className={`absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform ${isFeatured ? 'translate-x-[18px]' : 'translate-x-0'}`}
                style={{ width: '18px', height: '18px' }}
              />
            </button>
          </label>

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
              onClick={() => router.push('/editor?tab=blog')}
              className="h-9 px-3 text-sm text-slate-500"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
