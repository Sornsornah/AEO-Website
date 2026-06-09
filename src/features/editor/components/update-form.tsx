'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useNavigationGuard } from '@/hooks/useNavigationGuard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MarkdownEditor } from '@/features/editor/components/markdown-editor'
import { UpdateCardPreview } from '@/features/editor/components/update-card-preview'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Clock, ChevronDown, Check } from 'lucide-react'
import { TiptapEditor } from '@/features/editor/components/tiptap-editor'
import {
  toMonthInput,
  utcToSgtInput,
  sgtInputToUtcIso,
  nowSgtInput,
  isValidDateTimeLocal,
  isFutureSgtInput,
  isValidMonthInput,
} from '@/lib/date'

interface MultiSelectOption {
  _id: string
  name: string
  color?: string
}

function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
}: {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (ids: string[]) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOptions = options.filter((o) => selected.includes(o._id))

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-slate-50 transition-colors"
      >
        <span className="flex flex-wrap gap-1 min-w-0">
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedOptions.map((o) => (
              <span
                key={o._id}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium"
              >
                {o.color && (
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: o.color }} />
                )}
                {o.name}
              </span>
            ))
          )}
        </span>
        <ChevronDown size={14} className={`ml-2 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-52 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-400">No options available</p>
          ) : (
            options.map((o) => {
              const isSelected = selected.includes(o._id)
              return (
                <button
                  key={o._id}
                  type="button"
                  onClick={() => toggle(o._id)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors"
                >
                  <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-slate-900 border-slate-900' : 'border-slate-300'}`}>
                    {isSelected && <Check size={10} className="text-white" />}
                  </span>
                  {o.color && (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: o.color }} />
                  )}
                  <span className="text-slate-700">{o.name}</span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

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
    productIds?: string[]
    tagIds?: string[]
    date?: string
    isPublished?: boolean
    scheduledAt?: string
    progressUpdates?: string
    nextSteps?: string
    learningPoints?: string
  }
}

export function UpdateForm({ mode, domainGroups, allDomains, allTags, defaultValues = {} }: UpdateFormProps) {
  const router = useRouter()
  const sortedDomains = [...allDomains].sort((a, b) => {
    if (a.name.toLowerCase() === 'general') return -1
    if (b.name.toLowerCase() === 'general') return 1
    return a.name.localeCompare(b.name)
  })
  const [title, setTitle] = useState(defaultValues.title || '')
  const [summary, setSummary] = useState(defaultValues.summary || '')
  const [domainIds, setDomainIds] = useState<string[]>(defaultValues.domainIds || [])
  const [productIds, setProductIds] = useState<string[]>(defaultValues.productIds || [])
  const [tagIds, setTagIds] = useState<string[]>(defaultValues.tagIds || [])
  const [date, setDate] = useState(toMonthInput(defaultValues.date))
  const initialPublishState = defaultValues.isPublished
    ? 'publish'
    : defaultValues.scheduledAt
    ? 'schedule'
    : 'draft'
  const [publishState, setPublishState] = useState<'draft' | 'publish' | 'schedule'>(initialPublishState)
  const [scheduledAt, setScheduledAt] = useState(
    defaultValues.scheduledAt ? utcToSgtInput(defaultValues.scheduledAt) : ''
  )
  const [progressUpdates, setProgressUpdates] = useState<string>(defaultValues.progressUpdates ?? '')
  const [nextSteps, setNextSteps] = useState<string>(defaultValues.nextSteps ?? '')
  const [learningPoints, setLearningPoints] = useState<string>(defaultValues.learningPoints ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const isDirty = useRef(false)
  const mounted = useRef(false)
  const [pendingNav, setPendingNav] = useState<null | (() => void)>(null)

  useEffect(() => {
    if (mounted.current) isDirty.current = true
    else mounted.current = true
  }, [title, summary, domainIds, productIds, tagIds, date, publishState, scheduledAt, progressUpdates, nextSteps, learningPoints])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (isDirty.current) e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  useNavigationGuard({
    when: () => isDirty.current,
    onBlock: (continueNav) => setPendingNav(() => continueNav),
  })

  function handleCancel() {
    if (isDirty.current) setPendingNav(() => () => router.push('/editor'))
    else router.push('/editor')
  }

  const availableProducts = domainGroups.flatMap((g) => g.products)

  async function submitForm(): Promise<boolean> {
    setError('')

    if (!title || !date) {
      setError('Please fill in all required fields.')
      return false
    }
    if (!isValidMonthInput(date)) {
      setError('Please choose a valid update period.')
      return false
    }
    if (domainIds.length === 0) {
      setError('Please select at least one section.')
      return false
    }
    const hasContent = (s: string) => s.split('\n').some(l => l.replace(/^(\d+\.|[-*•])\s*/, '').trim().length > 0)
    if (!hasContent(progressUpdates) && !hasContent(nextSteps) && !hasContent(learningPoints)) {
      setError('Add content to at least one of Key Milestones, Next Steps, or Learning Points.')
      return false
    }
    if (publishState === 'schedule') {
      if (!scheduledAt || !isValidDateTimeLocal(scheduledAt)) {
        setError('Please select a valid date and time for scheduled publishing.')
        return false
      }
      if (!isFutureSgtInput(scheduledAt)) {
        setError('Scheduled publish time must be in the future.')
        return false
      }
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
          productIds,
          tagIds,
          date: date + '-01',
          progressUpdates,
          nextSteps,
          learningPoints,
          isPublished: publishState === 'publish',
          scheduledAt: publishState === 'schedule' ? sgtInputToUtcIso(scheduledAt) : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save update')
        return false
      }

      isDirty.current = false
      setSaved(true)
      router.refresh()
      return true
    } catch {
      setError('An unexpected error occurred.')
      return false
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await submitForm()
    if (ok) {
      await new Promise((r) => setTimeout(r, 900))
      router.push('/editor')
    }
  }

  const previewProducts = useMemo(() => {
    const all = domainGroups.flatMap((g) => g.products)
    return all.filter((p) => productIds.includes(p._id))
  }, [domainGroups, productIds])

  const previewDomains = useMemo(
    () => allDomains.filter((d) => domainIds.includes(d._id)),
    [allDomains, domainIds]
  )

  const previewTags = useMemo(
    () => allTags.filter((t) => tagIds.includes(t._id)),
    [allTags, tagIds]
  )

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-8 items-start">
        {/* ── Left: form inputs ── */}
        <div className="space-y-6">

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

      {/* Section + Date row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">
            Section <span className="text-red-500">*</span>
          </Label>
          <MultiSelect
            options={sortedDomains}
            selected={domainIds}
            onChange={(ids) => {
              const nextDomainIds = ids
              setDomainIds(nextDomainIds)
            }}
            placeholder="Select sections..."
          />
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

      {/* Products */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">Products</Label>
        <MultiSelect
          options={availableProducts}
          selected={productIds}
          onChange={setProductIds}
          placeholder={availableProducts.length === 0 ? 'No products available' : 'Select products...'}
        />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">Tags</Label>
        <MultiSelect
          options={allTags}
          selected={tagIds}
          onChange={setTagIds}
          placeholder={allTags.length === 0 ? 'No tags yet' : 'Select tags...'}
        />
      </div>

      {/* Additional Information */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">Additional Information</Label>
        <TiptapEditor
          value={summary}
          onChange={setSummary}
          placeholder="Add any additional context, images, or links..."
          limitedToolbar
        />
      </div>

      {/* Key Milestones */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">Key Milestones</Label>
        <p className="text-xs text-slate-400">What was accomplished this period</p>
        <MarkdownEditor value={progressUpdates} onChange={setProgressUpdates} forceOrderedList />
      </div>

      {/* Next Steps */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">Next Steps</Label>
        <p className="text-xs text-slate-400">{"What's planned for the next period"}</p>
        <MarkdownEditor value={nextSteps} onChange={setNextSteps} forceOrderedList />
      </div>

      {/* Learning Points */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">Learning Points</Label>
        <p className="text-xs text-slate-400">Insights and lessons from this period</p>
        <MarkdownEditor value={learningPoints} onChange={setLearningPoints} forceOrderedList />
      </div>

      {/* Publish control */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
        <div>
          <p className="text-sm font-medium text-slate-700 mb-1">Visibility</p>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white overflow-hidden">
            {(['draft', 'publish', 'schedule'] as const).map((state) => (
              <button
                key={state}
                type="button"
                onClick={() => setPublishState(state)}
                className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                  publishState === state
                    ? state === 'publish'
                      ? 'bg-green-600 text-white'
                      : state === 'schedule'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {state === 'draft' ? 'Draft' : state === 'publish' ? 'Publish Now' : 'Schedule'}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            {publishState === 'publish'
              ? 'Visible to all users immediately'
              : publishState === 'schedule'
              ? 'Will become visible at the selected time'
              : 'Only visible to editors'}
          </p>
        </div>
        {publishState === 'schedule' && (
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-slate-400 flex-shrink-0" />
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="h-8 text-sm w-auto"
              min={nowSgtInput()}
            />
            <span className="text-xs text-slate-400 font-medium">SGT</span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading || saved}
          className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-6"
        >
          {loading ? 'Saving...' : saved ? 'Saved!' : mode === 'create' ? 'Create Update' : 'Save Changes'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleCancel}
          className="h-10 px-4 text-slate-600"
        >
          Cancel
        </Button>
      </div>

        </div>{/* end left column */}

        {/* ── Right: live preview ── */}
        <div className="sticky top-20">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Live Preview</p>
          <UpdateCardPreview
            title={title}
            summary={summary}
            progressUpdates={progressUpdates}
            nextSteps={nextSteps}
            learningPoints={learningPoints}
            products={previewProducts}
            domains={previewDomains}
            tags={previewTags}
          />
        </div>

      </div>{/* end grid */}
      <ConfirmDialog
        open={!!pendingNav}
        title="Unsaved changes"
        message="You have unsaved changes that haven't been saved yet."
        confirmLabel="Keep editing"
        cancelLabel="Cancel changes"
        onConfirm={() => setPendingNav(null)}
        onCancel={() => { const run = pendingNav!; setPendingNav(null); run() }}
      />
      <div
        className={`fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg transition-all duration-300 ${
          saved ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <Check size={14} className="text-emerald-400 flex-shrink-0" />
        {mode === 'create' ? 'Update created' : 'Changes saved'}
      </div>
    </form>
  )
}
