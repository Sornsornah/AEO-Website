'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GripVertical, X, Eye, EyeOff } from 'lucide-react'

interface EditorProduct {
  _id: string
  name: string
  slug: string
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

function isSnapshot(a: EditorProduct[], b: EditorProduct[]) {
  if (a.length !== b.length) return false
  return a.every((p, i) => p._id === b[i]._id && p.isHidden === b[i].isHidden)
}

export function EditorProductsList({ initialProducts }: { initialProducts: EditorProduct[] }) {
  const router = useRouter()
  const [products, setProducts] = useState(initialProducts)
  // Tracks what's currently persisted on the server
  const [saved, setSaved] = useState(initialProducts)
  const [saving, setSaving] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [newProductOpen, setNewProductOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [toast, setToast] = useState(false)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(false), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const isDirty = !isSnapshot(products, saved)

  function handleToggleVisibility(id: string) {
    setProducts((prev) => prev.map((p) => p._id === id ? { ...p, isHidden: !p.isHidden } : p))
  }

  async function handleSaveFormatting() {
    setSaving(true)
    try {
      const ids = products.map((p) => p._id)
      const visibilityChanges = products.filter((p) => {
        const orig = saved.find((s) => s._id === p._id)
        return orig && orig.isHidden !== p.isHidden
      })

      await Promise.all([
        fetch('/api/products/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
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
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setCreateError(data.error || 'Failed to create product'); return }
      setNewProductOpen(false)
      setNewName('')
      router.push(`/editor/products/${data._id}`)
    } catch {
      setCreateError('An unexpected error occurred.')
    } finally {
      setCreating(false)
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

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-4">
        <button
          onClick={handleSaveFormatting}
          disabled={!isDirty || saving}
          className="text-sm font-medium h-9 px-4 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-slate-300 text-slate-700 hover:bg-slate-50 enabled:hover:border-slate-400"
        >
          {saving ? 'Saving…' : 'Save formatting'}
        </button>
        <button
          onClick={() => { setNewProductOpen(true); setCreateError('') }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium h-9 px-4 rounded-lg transition-colors"
        >
          + New Product
        </button>
      </div>

      {newProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">New product</h3>
              <button onClick={() => setNewProductOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Product name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. API"
                  autoFocus
                  className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              {createError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{createError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setNewProductOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
                <button type="submit" disabled={creating || !newName.trim()} className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-40 transition-colors">
                  {creating ? 'Creating…' : 'Create & edit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div ref={listRef} className="space-y-2">
        {products.map((p) => (
          <div
            key={p._id}
            className={`flex items-center gap-3 p-4 border rounded-xl select-none transition-opacity duration-100 ${
              draggingId === p._id
                ? 'opacity-40 border-blue-300 bg-white'
                : p.isHidden
                  ? 'border-slate-200 bg-slate-50/60 opacity-60'
                  : 'border-slate-200 bg-white'
            }`}
          >
            <button
              onPointerDown={(e) => startDrag(e, p._id)}
              className="touch-none cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors p-0.5 flex-shrink-0"
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
              <p className="text-sm font-semibold text-slate-900">{p.name}</p>
              {p.description && <p className="text-xs text-slate-500 truncate">{p.description}</p>}
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] || STATUS_COLORS.live}`}>
              {STATUS_LABELS[p.status] || 'Live'}
            </span>
            <button
              onClick={() => handleToggleVisibility(p._id)}
              title={p.isHidden ? 'Hidden from products page — click to show' : 'Visible on products page — click to hide'}
              className={`p-1.5 rounded-lg transition-colors ${
                p.isHidden
                  ? 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              {p.isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <Link
              href={`/editor/products/${p._id}`}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
              draggable={false}
            >
              Edit
            </Link>
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-slate-400 text-sm py-8 text-center">No products yet.</p>
        )}
      </div>

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
