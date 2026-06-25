'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GripVertical } from 'lucide-react'
import { formatMonthYear } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface UpdateRow {
  _id: string
  title: string
  date: string
  isPublished: boolean
  order: number
}

// Preserves array order — no re-sort, so drag state is never clobbered
function groupByMonth(updates: UpdateRow[]): { monthKey: string; items: UpdateRow[] }[] {
  const map = new Map<string, UpdateRow[]>()
  for (const u of updates) {
    const key = formatMonthYear(u.date)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(u)
  }
  return Array.from(map.entries()).map(([monthKey, items]) => ({ monthKey, items }))
}

// Pre-sort by month desc, then within each month by order asc / date desc
function presort(updates: UpdateRow[]): UpdateRow[] {
  const groups = groupByMonth(updates)
  groups.sort((a, b) => new Date(b.items[0].date).getTime() - new Date(a.items[0].date).getTime())
  for (const g of groups) {
    g.items.sort((a, b) => (a.order - b.order) || (new Date(b.date).getTime() - new Date(a.date).getTime()))
  }
  return groups.flatMap((g) => g.items)
}

function isSnapshotEqual(a: UpdateRow[], b: UpdateRow[]) {
  return a.length === b.length && a.every((item, i) => item._id === b[i]._id)
}

export function UpdateReorderView({ updates: initial }: { updates: UpdateRow[] }) {
  const router = useRouter()
  const [updates, setUpdates] = useState(() => presort(initial))
  const [saved, setSaved] = useState(() => presort(initial))
  const [saving, setSaving] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [toast, setToast] = useState(false)

  const monthGroups = groupByMonth(updates)
  const savedGroups = groupByMonth(saved)

  const dirtyMonths = new Set(
    monthGroups
      .filter((g) => {
        const s = savedGroups.find((sg) => sg.monthKey === g.monthKey)
        return !s || !isSnapshotEqual(g.items, s.items)
      })
      .map((g) => g.monthKey)
  )

  const isDirty = dirtyMonths.size > 0

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(false), 3000)
    return () => clearTimeout(t)
  }, [toast])

  async function handleSaveOrder() {
    setSaving(true)
    try {
      for (const monthKey of Array.from(dirtyMonths)) {
        const group = monthGroups.find((g) => g.monthKey === monthKey)
        if (!group) continue
        await fetch('/api/updates/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monthKey, ids: group.items.map((u) => u._id) }),
        })
      }
      setSaved([...updates])
      setToast(true)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  // One listRef per month group — keyed by monthKey
  const listRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const updatesRef = useRef(updates)
  updatesRef.current = updates

  const startDrag = useCallback((e: React.PointerEvent<HTMLButtonElement>, id: string, monthKey: string) => {
    e.preventDefault()

    // Snapshot just this month's items
    const getMonthItems = () => groupByMonth(updatesRef.current).find((g) => g.monthKey === monthKey)?.items ?? []
    let monthItems = getMonthItems()
    let draggedIdx = monthItems.findIndex((u) => u._id === id)
    setDraggingId(id)

    function indexAtY(y: number): number {
      const list = listRefs.current.get(monthKey)
      if (!list) return draggedIdx
      const children = Array.from(list.children) as HTMLElement[]
      for (let i = 0; i < children.length; i++) {
        const rect = children[i].getBoundingClientRect()
        if (y < rect.top + rect.height / 2) return i
      }
      return children.length - 1
    }

    function onMove(ev: PointerEvent) {
      const targetIdx = indexAtY(ev.clientY)
      if (targetIdx === draggedIdx) return
      const next = [...monthItems]
      const [item] = next.splice(draggedIdx, 1)
      next.splice(targetIdx, 0, item)
      monthItems = next
      draggedIdx = targetIdx

      // Merge back into full updates list preserving other months
      setUpdates((prev) => {
        const prevGroups = groupByMonth(prev)
        const result: UpdateRow[] = []
        for (const g of prevGroups) {
          if (g.monthKey === monthKey) {
            result.push(...next)
          } else {
            result.push(...g.items)
          }
        }
        return result
      })
    }

    function onUp() {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      setDraggingId(null)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (updates.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl mt-6">
        <p className="text-slate-400 text-sm">No updates to reorder.</p>
      </div>
    )
  }

  return (
    <div className="mt-6">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-background py-3 border-b border-slate-100 mb-6">
        <p className="text-xs text-slate-500 font-medium">
          Drag items within a month to reorder. Changes take effect on save.
        </p>
        <button
          onClick={handleSaveOrder}
          disabled={!isDirty || saving}
          className={`text-sm font-medium h-9 px-4 rounded-lg border transition-colors disabled:cursor-not-allowed ${
            isDirty
              ? 'border-transparent bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-70'
              : 'border-slate-300 text-slate-700 opacity-40'
          }`}
        >
          {saving ? 'Saving…' : 'Save order'}
        </button>
      </div>

      <div className="space-y-10">
        {monthGroups.map(({ monthKey, items }) => (
          <section key={monthKey}>
            <div className="flex items-center gap-4 mb-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex-shrink-0">
                {monthKey}
              </h2>
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400 flex-shrink-0">
                {items.length} {items.length === 1 ? 'update' : 'updates'}
                {dirtyMonths.has(monthKey) && (
                  <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 align-middle" title="Unsaved changes" />
                )}
              </span>
            </div>

            <div
              ref={(el) => {
                if (el) listRefs.current.set(monthKey, el)
                else listRefs.current.delete(monthKey)
              }}
              className="space-y-1.5"
            >
              {items.map((update) => (
                <div
                  key={update._id}
                  className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg select-none transition-opacity duration-100 bg-white ${
                    draggingId === update._id
                      ? 'opacity-40 border-blue-300'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <button
                    onPointerDown={(e) => items.length > 1 && startDrag(e, update._id, monthKey)}
                    disabled={items.length <= 1}
                    className="touch-none cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors p-0.5 flex-shrink-0 disabled:cursor-default disabled:opacity-30"
                    aria-label="Drag to reorder"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{update.title}</p>
                  </div>

                  <div className="flex-shrink-0">
                    {update.isPublished ? (
                      <Badge className="bg-green-50 text-green-700 border-green-100 text-xs hover:bg-green-50">Published</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Draft</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Toast */}
      <div
        className={`fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg transition-all duration-300 ${
          toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        Order saved
      </div>
    </div>
  )
}
