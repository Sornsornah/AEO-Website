'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GripVertical, Eye, EyeOff } from 'lucide-react'

interface ProductRow {
  _id: string
  name: string
  description?: string
  color: string
  logoUrl?: string
  status: string
  isHidden: boolean
}

const STATUS_LABELS: Record<string, string> = { live: 'Live', beta: 'Beta', coming_soon: 'Coming Soon' }
const STATUS_COLORS: Record<string, string> = {
  live: 'bg-emerald-50 text-emerald-700',
  beta: 'bg-amber-50 text-amber-700',
  coming_soon: 'bg-slate-100 text-slate-600',
}

function isSnapshotEqual(a: ProductRow[], b: ProductRow[]) {
  return a.length === b.length && a.every((p, i) => p._id === b[i]._id && p.isHidden === b[i].isHidden)
}

export function ProductReorderView({ products: initial }: { products: ProductRow[] }) {
  const router = useRouter()
  const [products, setProducts] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [toast, setToast] = useState(false)

  const isDirty = !isSnapshotEqual(products, saved)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(false), 3000)
    return () => clearTimeout(t)
  }, [toast])

  function handleToggleVisibility(id: string) {
    setProducts((prev) => prev.map((p) => p._id === id ? { ...p, isHidden: !p.isHidden } : p))
  }

  async function handleSaveFormatting() {
    setSaving(true)
    try {
      const visibilityChanges = products.filter((p) => {
        const orig = saved.find((s) => s._id === p._id)
        return orig && orig.isHidden !== p.isHidden
      })

      await Promise.all([
        fetch('/api/products/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: products.map((p) => p._id) }),
        }),
        ...visibilityChanges.map((p) =>
          fetch(`/api/products/${p._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isHidden: p.isHidden }),
          })
        ),
      ])

      setSaved([...products])
      setToast(true)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const listRef = useRef<HTMLDivElement>(null)
  const productsRef = useRef(products)
  productsRef.current = products

  const startDrag = useCallback((e: React.PointerEvent<HTMLButtonElement>, id: string) => {
    e.preventDefault()

    let order = [...productsRef.current]
    let draggedIdx = order.findIndex((p) => p._id === id)
    setDraggingId(id)

    function indexAtY(y: number): number {
      const list = listRef.current
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
      const next = [...order]
      const [item] = next.splice(draggedIdx, 1)
      next.splice(targetIdx, 0, item)
      order = next
      draggedIdx = targetIdx
      setProducts([...next])
    }

    function onUp() {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      setDraggingId(null)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (products.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl mt-6">
        <p className="text-slate-400 text-sm">No products to reorder.</p>
      </div>
    )
  }

  return (
    <div className="mt-6">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-background py-3 border-b border-slate-100 mb-6">
        <p className="text-xs text-slate-500 font-medium">
          Drag to reorder, toggle visibility. Changes take effect on save.
        </p>
        <button
          onClick={handleSaveFormatting}
          disabled={!isDirty || saving}
          className={`text-sm font-medium h-9 px-4 rounded-lg border transition-colors disabled:cursor-not-allowed ${
            isDirty
              ? 'border-transparent bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-70'
              : 'border-slate-300 text-slate-700 opacity-40'
          }`}
        >
          {saving ? 'Saving…' : 'Save formatting'}
        </button>
      </div>

      <div ref={listRef} className="space-y-1.5">
        {products.map((p) => (
          <div
            key={p._id}
            className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg select-none transition-opacity duration-100 ${
              draggingId === p._id
                ? 'opacity-40 border-blue-300 bg-white'
                : p.isHidden
                  ? 'border-slate-200 bg-slate-50/60 opacity-60'
                  : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <button
              onPointerDown={(e) => products.length > 1 && startDrag(e, p._id)}
              disabled={products.length <= 1}
              className="touch-none cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors p-0.5 flex-shrink-0 disabled:cursor-default disabled:opacity-30"
              aria-label="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>

            <div
              className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: p.logoUrl ? undefined : p.color }}
            >
              {p.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.logoUrl} alt={p.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-white text-xs font-bold">{p.name.charAt(0)}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
              {p.description && <p className="text-xs text-slate-500 truncate">{p.description}</p>}
            </div>

            <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[p.status] || STATUS_COLORS.live}`}>
              {STATUS_LABELS[p.status] || 'Live'}
            </span>
            <button
              onClick={() => handleToggleVisibility(p._id)}
              title={p.isHidden ? 'Hidden from products page — click to show' : 'Visible on products page — click to hide'}
              className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                p.isHidden
                  ? 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              {p.isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        ))}
      </div>

      {/* Toast */}
      <div
        className={`fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg transition-all duration-300 ${
          toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        Formatting saved
      </div>
    </div>
  )
}
