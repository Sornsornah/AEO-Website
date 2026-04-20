'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ImagePlus, X } from 'lucide-react'
import { format } from 'date-fns'

interface Product {
  _id: string
  name: string
  color: string
}

interface DomainGroup {
  _id: string
  name: string
  products: Product[]
}

interface UpdateFormProps {
  mode: 'create' | 'edit'
  domainGroups: DomainGroup[]
  allDomains: { _id: string; name: string }[]
  allTags: { _id: string; name: string }[]
  defaultValues?: {
    _id?: string
    title?: string
    summary?: string
    domainIds?: string[]
    productId?: string
    tagIds?: string[]
    date?: string
    isPublished?: boolean
    progressUpdates?: string
    nextSteps?: string
    learningPoints?: string
    media?: string[]
  }
}

const PRODUCT_DOMAIN_NAMES = ['Products', 'Central Solutions']

export function UpdateForm({ mode, domainGroups, allDomains, allTags, defaultValues = {} }: UpdateFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(defaultValues.title || '')
  const [summary, setSummary] = useState(defaultValues.summary || '')
  const [domainIds, setDomainIds] = useState<string[]>(defaultValues.domainIds || [])
  const [productId, setProductId] = useState(defaultValues.productId || '')
  const [tagIds, setTagIds] = useState<string[]>(defaultValues.tagIds || [])
  const [date, setDate] = useState(
    defaultValues.date
      ? format(new Date(defaultValues.date), 'yyyy-MM')
      : format(new Date(), 'yyyy-MM')
  )
  const [isPublished, setIsPublished] = useState(defaultValues.isPublished || false)
  const [progressUpdates, setProgressUpdates] = useState<string>(defaultValues.progressUpdates || '')
  const [nextSteps, setNextSteps] = useState<string>(defaultValues.nextSteps || '')
  const [learningPoints, setLearningPoints] = useState<string>(defaultValues.learningPoints || '')
  const [media, setMedia] = useState<string[]>(defaultValues.media || [])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedDomains = allDomains.filter((d) => domainIds.includes(d._id))
  const showProduct = selectedDomains.some((d) => PRODUCT_DOMAIN_NAMES.includes(d.name))

  const availableProducts = domainIds.length > 0
    ? domainGroups.filter((g) => domainIds.includes(g._id)).flatMap((g) => g.products)
    : domainGroups.flatMap((g) => g.products)

  function toggleDomain(id: string) {
    setDomainIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
    if (productId) {
      const nextDomainIds = domainIds.includes(id)
        ? domainIds.filter((x) => x !== id)
        : [...domainIds, id]
      const nextProducts = domainGroups.filter((g) => nextDomainIds.includes(g._id)).flatMap((g) => g.products)
      if (!nextProducts.some((p) => p._id === productId)) setProductId('')
    }
  }

  function isVideo(url: string) {
    return /\.(mp4|webm|mov)$/i.test(url)
  }

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    try {
      const urls = await Promise.all(
        files.map(async (file) => {
          const fd = new FormData()
          fd.append('file', file)
          const res = await fetch('/api/uploads', { method: 'POST', body: fd })
          if (!res.ok) throw new Error('Upload failed')
          const data = await res.json()
          return data.url as string
        })
      )
      setMedia((prev) => [...prev, ...urls])
    } catch {
      setError('One or more files failed to upload.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function removeMedia(index: number) {
    setMedia((prev) => prev.filter((_, i) => i !== index))
  }

  function toggleTag(id: string) {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!title || !summary || !date) {
      setError('Please fill in all required fields.')
      return
    }
    if (domainIds.length === 0) {
      setError('Please select at least one domain.')
      return
    }
    if (!progressUpdates.trim() && !nextSteps.trim() && !learningPoints.trim()) {
      setError('Add content to at least one of Progress Updates, Next Steps, or Learning Points.')
      return
    }

    setLoading(true)

    try {
      const url = mode === 'create' ? '/api/updates' : `/api/updates/${defaultValues._id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          summary,
          domainIds,
          productId: showProduct ? (productId || undefined) : undefined,
          tagIds: showProduct ? [] : tagIds,
          date: date + '-01',
          progressUpdates,
          nextSteps,
          learningPoints,
          media,
          isPublished,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save update')
        return
      }

      router.push('/editor')
      router.refresh()
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-sm font-medium text-slate-700">
          Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What changed in this update?"
          className="h-10"
          required
        />
      </div>

      {/* Domain + Date row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">
            Domain <span className="text-red-500">*</span>
          </Label>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {allDomains.map((d) => (
              <button
                key={d._id}
                type="button"
                onClick={() => toggleDomain(d._id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  domainIds.includes(d._id)
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date" className="text-sm font-medium text-slate-700">
            Month <span className="text-red-500">*</span>
          </Label>
          <Input
            id="date"
            type="month"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10"
            required
          />
        </div>
      </div>

      {/* Product (conditional) or Tags */}
      {showProduct ? (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Product</Label>
          <Select value={productId || 'none'} onValueChange={(val) => setProductId(val === 'none' ? '' : val)}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="No specific product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No specific product</SelectItem>
              {availableProducts.map((p) => (
                <SelectItem key={p._id} value={p._id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Tags</Label>
          {allTags.length === 0 ? (
            <p className="text-xs text-slate-400">No tags yet. Add tags in the Admin panel.</p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-0.5">
              {allTags.map((t) => (
                <button
                  key={t._id}
                  type="button"
                  onClick={() => toggleTag(t._id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                    tagIds.includes(t._id)
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="space-y-1.5">
        <Label htmlFor="summary" className="text-sm font-medium text-slate-700">
          Summary <span className="text-red-500">*</span>
        </Label>
        <textarea
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="A short plain-text description shown in the feed..."
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          required
        />
      </div>

      {/* Progress Updates */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">Progress Updates</Label>
        <p className="text-xs text-slate-400">What was accomplished this period — supports Markdown</p>
        <textarea
          value={progressUpdates}
          onChange={(e) => setProgressUpdates(e.target.value)}
          placeholder="- Shipped the new dashboard&#10;- Fixed auth bug&#10;&#10;**Bold** and *italic* supported"
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y font-mono"
        />
      </div>

      {/* Next Steps */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">Next Steps</Label>
        <p className="text-xs text-slate-400">{"What's planned for the next period — supports Markdown"}</p>
        <textarea
          value={nextSteps}
          onChange={(e) => setNextSteps(e.target.value)}
          placeholder="- Deploy to staging&#10;- Review with stakeholders"
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y font-mono"
        />
      </div>

      {/* Learning Points */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">Learning Points</Label>
        <p className="text-xs text-slate-400">Insights and lessons from this period — supports Markdown</p>
        <textarea
          value={learningPoints}
          onChange={(e) => setLearningPoints(e.target.value)}
          placeholder="- Users prefer X over Y&#10;- Caching reduced latency by 40%"
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y font-mono"
        />
      </div>

      {/* Photos & Videos */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Photos & Videos</Label>
        <p className="text-xs text-slate-400">Attach images or videos to this update</p>
        {media.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {media.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                {isVideo(url) ? (
                  <video src={url} className="w-full h-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(i)}
                  className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5 text-white"
                  aria-label="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <label className={`inline-flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 cursor-pointer transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleMediaUpload}
            disabled={uploading}
          />
          <ImagePlus className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Add photos or videos'}
        </label>
      </div>

      {/* Published toggle */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div>
          <p className="text-sm font-medium text-slate-700">Publish update</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {isPublished ? 'Visible to all users' : 'Draft — only visible to editors'}
          </p>
        </div>
        <Switch
          checked={isPublished}
          onCheckedChange={setIsPublished}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-6"
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create Update' : 'Save Changes'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/editor')}
          className="h-10 px-4 text-slate-600"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
