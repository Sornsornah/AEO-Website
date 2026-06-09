'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import { GripVertical, X, Plus } from 'lucide-react'
import { toast } from 'sonner'

export interface HomeProductRow {
  _id: string
  name: string
  slug: string
  logoUrl?: string
  color: string
}

const MAX_FEATURED = 8

function LogoThumb({ p, size = 32 }: { p: HomeProductRow; size?: number }) {
  return (
    <span
      className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white"
      style={{ width: size, height: size }}
    >
      {p.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.logoUrl} alt={p.name} className="h-full w-full object-contain p-1" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: p.color }}
        >
          {p.name.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  )
}

export function HomepageProductsTab({
  products,
  featuredIds,
}: {
  products: HomeProductRow[]
  featuredIds: string[]
}) {
  const byId = useMemo(() => new Map(products.map((p) => [p._id, p])), [products])
  const initialSelected = useMemo(
    () => featuredIds.map((id) => byId.get(id)).filter((p): p is HomeProductRow => Boolean(p)),
    [featuredIds, byId]
  )

  const [selected, setSelected] = useState<HomeProductRow[]>(initialSelected)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const savedRef = useRef(initialSelected.map((p) => p._id).join())
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const listRef = useRef<HTMLUListElement>(null)

  const selectedIds = new Set(selected.map((p) => p._id))
  const available = products.filter((p) => !selectedIds.has(p._id))
  const isDirty = selected.map((p) => p._id).join() !== savedRef.current
  const atCapacity = selected.length >= MAX_FEATURED

  function add(p: HomeProductRow) {
    if (selectedRef.current.length >= MAX_FEATURED) {
      toast.warning(`You can feature at most ${MAX_FEATURED} products.`)
      return
    }
    setSelected((prev) => [...prev, p])
  }

  function remove(id: string) {
    setSelected((prev) => prev.filter((p) => p._id !== id))
  }

  const startDrag = useCallback((e: React.PointerEvent<HTMLButtonElement>, id: string) => {
    e.preventDefault()
    let order = [...selectedRef.current]
    let draggedIdx = order.findIndex((p) => p._id === id)
    setDraggingId(id)

    function indexAtY(y: number): number {
      const list = listRef.current
      if (!list) return draggedIdx
      const rows = Array.from(list.children) as HTMLElement[]
      for (let i = 0; i < rows.length; i++) {
        const rect = rows[i].getBoundingClientRect()
        if (y < rect.top + rect.height / 2) return i
      }
      return rows.length - 1
    }

    function onMove(ev: PointerEvent) {
      const targetIdx = indexAtY(ev.clientY)
      if (targetIdx === draggedIdx) return
      const next = [...order]
      const [item] = next.splice(draggedIdx, 1)
      next.splice(targetIdx, 0, item)
      order = next
      draggedIdx = targetIdx
      setSelected([...next])
    }

    function onUp() {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      setDraggingId(null)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [])

  async function handleSave() {
    setSaving(true)
    const current = selectedRef.current
    try {
      const res = await fetch('/api/admin/home-products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: current.map((p) => p._id) }),
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      savedRef.current = current.map((p) => p._id).join()
      toast.success('Homepage products updated.')
      // Nudge React to recompute isDirty against the new saved baseline.
      setSelected((prev) => [...prev])
    } catch (err) {
      toast.error(err instanceof Error ? `Save failed: ${err.message}` : 'Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Homepage constellation</h2>
          <p className="mt-1 max-w-xl text-xs text-slate-500">
            Choose which products float in the homepage &ldquo;Our Products&rdquo; section and drag to set
            their order. Up to {MAX_FEATURED}. The layout adjusts to the number you pick. Leave empty to fall
            back to the first {MAX_FEATURED} products by their catalogue order.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="flex-shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Selected / ordered */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Featured ({selected.length}/{MAX_FEATURED})
            </span>
          </div>
          {selected.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
              <p className="text-xs text-slate-400">
                No products selected. Add some from the right, or leave empty for the default.
              </p>
            </div>
          ) : (
            <ul ref={listRef} className="space-y-1.5">
              {selected.map((p, i) => {
                const isDragging = draggingId === p._id
                return (
                  <li
                    key={p._id}
                    className={`flex items-center gap-3 rounded-lg border px-2.5 py-2 transition-opacity ${
                      isDragging ? 'border-slate-300 bg-slate-50 opacity-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <button
                      onPointerDown={(e) => startDrag(e, p._id)}
                      className="cursor-grab touch-none text-slate-300 transition-colors hover:text-slate-500 active:cursor-grabbing"
                      aria-label={`Reorder ${p.name}`}
                    >
                      <GripVertical size={15} />
                    </button>
                    <span className="w-4 text-center text-xs font-medium tabular-nums text-slate-400">
                      {i + 1}
                    </span>
                    <LogoThumb p={p} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                      {p.name}
                    </span>
                    <button
                      onClick={() => remove(p._id)}
                      className="flex-shrink-0 rounded-md p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600"
                      aria-label={`Remove ${p.name}`}
                    >
                      <X size={15} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Available */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Available</span>
            {atCapacity && <span className="text-[11px] text-amber-600">Limit reached</span>}
          </div>
          {available.length === 0 ? (
            <p className="px-1 py-4 text-xs text-slate-400">All products are featured.</p>
          ) : (
            <ul className="space-y-1.5">
              {available.map((p) => (
                <li
                  key={p._id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                >
                  <LogoThumb p={p} />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{p.name}</span>
                  <button
                    onClick={() => add(p)}
                    disabled={atCapacity}
                    className="flex flex-shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus size={13} />
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
