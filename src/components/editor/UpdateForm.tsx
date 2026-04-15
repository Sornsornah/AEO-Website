'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { MarkdownEditor } from './MarkdownEditor'
import { HighlightsInput } from './HighlightsInput'
import { UpdateDetail } from '@/components/updates/UpdateDetail'
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
  defaultValues?: {
    _id?: string
    title?: string
    summary?: string
    content?: string
    productId?: string
    date?: string
    highlights?: string[]
    isPublished?: boolean
  }
}

export function UpdateForm({ mode, domainGroups, defaultValues = {} }: UpdateFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(defaultValues.title || '')
  const [summary, setSummary] = useState(defaultValues.summary || '')
  const [content, setContent] = useState(defaultValues.content || '')
  const [productId, setProductId] = useState(defaultValues.productId || '')
  const [date, setDate] = useState(
    defaultValues.date
      ? format(new Date(defaultValues.date), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd')
  )
  const [highlights, setHighlights] = useState<string[]>(defaultValues.highlights || [])
  const [isPublished, setIsPublished] = useState(defaultValues.isPublished || false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  const allProducts = domainGroups.flatMap((g) => g.products)
  const selectedProduct = allProducts.find((p) => p._id === productId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!title || !summary || !content || !productId || !date) {
      setError('Please fill in all required fields.')
      return
    }

    setLoading(true)

    try {
      const url = mode === 'create' ? '/api/updates' : `/api/updates/${defaultValues._id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, summary, content, productId, date, highlights, isPublished }),
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
      {/* Edit / Preview toggle */}
      <div className="flex items-center gap-1 border-b border-slate-100 pb-0 -mt-2 mb-6">
        <button
          type="button"
          onClick={() => setPreviewMode(false)}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            !previewMode ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setPreviewMode(true)}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            previewMode ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Preview
        </button>
      </div>

      {previewMode ? (
        <div className="border border-slate-200 rounded-xl p-6">
          <UpdateDetail
            update={{
              title: title || '(No title)',
              summary: summary || '(No summary)',
              content: content || '',
              date: date || new Date().toISOString(),
              highlights,
              productId: selectedProduct
                ? { _id: selectedProduct._id, name: selectedProduct.name, color: selectedProduct.color }
                : { _id: '', name: 'No product selected', color: '#94a3b8' },
            }}
          />
        </div>
      ) : (
      <>
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

      {/* Product + Date row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">
            Product <span className="text-red-500">*</span>
          </Label>
          <Select value={productId} onValueChange={setProductId} required>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {domainGroups.map((group) => (
                <SelectGroup key={group._id}>
                  <SelectLabel className="text-xs text-slate-400 font-medium py-1 pl-3 pr-2">
                    {group.name}
                  </SelectLabel>
                  {group.products.map((p) => (
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
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date" className="text-sm font-medium text-slate-700">
            Date <span className="text-red-500">*</span>
          </Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10"
            required
          />
        </div>
      </div>

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

      {/* Key Highlights */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">Key Highlights</Label>
        <p className="text-xs text-slate-400">Bullet points shown in the feed preview</p>
        <HighlightsInput value={highlights} onChange={setHighlights} />
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">
          Full Content <span className="text-red-500">*</span>
        </Label>
        <p className="text-xs text-slate-400">Supports Markdown formatting</p>
        <MarkdownEditor value={content} onChange={setContent} />
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
      </>
      )}

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
