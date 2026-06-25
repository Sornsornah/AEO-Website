'use client'

import {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
  type CSSProperties,
} from 'react'
import Link from 'next/link'
import { X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ConstellationBackdrop } from '@/features/home/components/constellation-backdrop'
import {
  buildSlots,
  CONSTELLATION_REFERENCE_WIDTH,
  MAX_CONSTELLATION,
  type Slot,
} from '@/features/home/constellation-layout'

export interface HomeProductRow {
  _id: string
  name: string
  slug: string
  description?: string
  isHidden?: boolean
  logoUrl?: string
  color: string
}

const MAX_FEATURED = MAX_CONSTELLATION
// How far outside the canvas bounds a drop still counts as "on the canvas".
const EDGE_SLACK = 28
// Pointer travel before a press becomes a drag (vs. a click).
const DRAG_THRESHOLD = 5

// The fixed layout every slot is pinned to — positions never re-balance.
const LAYOUT = buildSlots(MAX_FEATURED)

// 1:1 rehearsal geometry, mirroring the live homepage section's *desktop*
// metrics so the preview is a faithful scaled screenshot (ProductsCarousel is
// the source of truth): max-w-6xl section width, px-6 + py-24 padding, and the
// lg:min-h-[40rem] constellation block the slot positions were tuned against.
const STAGE_W = CONSTELLATION_REFERENCE_WIDTH // 1152 (max-w-6xl)
const STAGE_PAD_X = 24 // px-6
const STAGE_PAD_Y = 96 // py-24
const BLOCK_H = 640 // min-h-[40rem]
const STAGE_H = BLOCK_H + STAGE_PAD_Y * 2

// `{ slot, valid }` = hovering a canvas slot (valid only when empty / its own
// origin); 'remove' = hovering off-canvas while dragging a placed tile.
type DropTarget = { slot: number; valid: boolean } | 'remove' | null

// Canonical signature of an arrangement: ids by slot, trailing empties trimmed
// (the server trims them too), so dirty-checks and saves agree.
function signature(slots: (HomeProductRow | null)[]): string {
  const ids = slots.map((p) => p?._id ?? '')
  let end = ids.length
  while (end > 0 && ids[end - 1] === '') end--
  return ids.slice(0, end).join(',')
}

// Faithful copy of the homepage's logo render (ProductsCarousel.renderLogo).
function ConstellationLogo({ p }: { p: HomeProductRow }) {
  return p.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.logoUrl} alt={p.name} className="max-h-full max-w-full object-contain" />
  ) : (
    <span
      className="flex h-full w-full items-center justify-center rounded-[0.55rem] text-lg font-bold text-white"
      style={{ backgroundColor: p.color }}
    >
      {p.name.charAt(0).toUpperCase()}
    </span>
  )
}

// Compact logo for the bench rows and the floating drag ghost.
function BenchLogo({ p, rounded = 'rounded-md' }: { p: HomeProductRow; rounded?: string }) {
  return p.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.logoUrl} alt={p.name} className="max-h-full max-w-full object-contain" />
  ) : (
    <span
      className={`flex h-full w-full items-center justify-center text-white font-bold ${rounded}`}
      style={{ backgroundColor: p.color }}
    >
      {p.name.charAt(0).toUpperCase()}
    </span>
  )
}

function nearestIndex(slots: Slot[], rect: DOMRect, px: number, py: number): number {
  let best = 0
  let bestDist = Infinity
  slots.forEach((s, i) => {
    const cx = rect.left + (s.left / 100) * rect.width
    const cy = rect.top + (s.top / 100) * rect.height
    const d = (px - cx) ** 2 + (py - cy) ** 2
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  })
  return best
}

export function HomepageProductsTab({
  products,
  featuredIds,
}: {
  products: HomeProductRow[]
  featuredIds: (string | null)[]
}) {
  const byId = useMemo(() => new Map(products.map((p) => [p._id, p])), [products])
  const initialSlots = useMemo(() => {
    const arr: (HomeProductRow | null)[] = Array(MAX_FEATURED).fill(null)
    featuredIds.slice(0, MAX_FEATURED).forEach((id, i) => {
      if (id) {
        const p = byId.get(id)
        if (p) arr[i] = p
      }
    })
    return arr
  }, [featuredIds, byId])

  const [slots, setSlots] = useState<(HomeProductRow | null)[]>(initialSlots)
  const [target, setTarget] = useState<DropTarget>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number; p: HomeProductRow } | null>(null)
  const [saving, setSaving] = useState(false)
  // Uniform scale that fits the 1152px-wide stage into the available column.
  const [scale, setScale] = useState(0)

  const savedRef = useRef(signature(initialSlots))
  const slotsRef = useRef(slots)
  slotsRef.current = slots
  const targetRef = useRef<DropTarget>(null)
  const suppressClickRef = useRef(false)
  const stageWrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const pressRef = useRef<{
    product: HomeProductRow
    // null = dragged from the bench; a number = dragged from that canvas slot.
    originSlot: number | null
    startX: number
    startY: number
    active: boolean
  } | null>(null)

  const placed = useMemo(() => new Set(slots.filter(Boolean).map((p) => p!._id)), [slots])
  const available = products.filter((p) => !placed.has(p._id))
  // Any featured product currently marked invisible — surfaced as a note so the
  // admin knows it won't actually render on the live homepage.
  const hiddenFeaturedCount = slots.filter((p) => p?.isHidden).length
  const filledCount = slots.filter(Boolean).length
  const isDirty = signature(slots) !== savedRef.current
  const atCapacity = filledCount >= MAX_FEATURED
  // The homepage section is hidden when nothing is featured, so at least one
  // product is required before an arrangement can be saved.
  const isEmpty = filledCount === 0

  // Keep the stage scaled 1:1 to its column width on mount + resize.
  useEffect(() => {
    const el = stageWrapRef.current
    if (!el) return
    const update = () => setScale(el.clientWidth / STAGE_W)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const setTargetState = useCallback((next: DropTarget) => {
    targetRef.current = next
    setTarget(next)
  }, [])

  const updatePreview = useCallback(
    (px: number, py: number) => {
      const press = pressRef.current
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!press || !rect) return
      const over =
        px >= rect.left - EDGE_SLACK &&
        px <= rect.right + EDGE_SLACK &&
        py >= rect.top - EDGE_SLACK &&
        py <= rect.bottom + EDGE_SLACK

      if (!over) {
        // Off-canvas: a placed tile is being removed; a bench tile just cancels.
        setTargetState(press.originSlot === null ? null : 'remove')
        return
      }

      const idx = nearestIndex(LAYOUT, rect, px, py)
      const occupant = slotsRef.current[idx]
      const ownSlot = press.originSlot === idx
      setTargetState({ slot: idx, valid: !occupant || ownSlot })
    },
    [setTargetState]
  )

  // Stable document listeners that delegate to the latest callbacks via refs,
  // so addEventListener/removeEventListener always pair on the same reference.
  const moveRef = useRef<(e: PointerEvent) => void>(() => {})
  const upRef = useRef<(e: PointerEvent) => void>(() => {})
  const moveProxy = useCallback((e: PointerEvent) => moveRef.current(e), [])
  const upProxy = useCallback((e: PointerEvent) => upRef.current(e), [])

  const endDrag = useCallback(() => {
    document.removeEventListener('pointermove', moveProxy)
    document.removeEventListener('pointerup', upProxy)
    pressRef.current = null
    setDragId(null)
    setGhost(null)
    setTargetState(null)
  }, [moveProxy, upProxy, setTargetState])

  const onMove = useCallback(
    (ev: PointerEvent) => {
      const press = pressRef.current
      if (!press) return
      if (!press.active) {
        if (Math.hypot(ev.clientX - press.startX, ev.clientY - press.startY) < DRAG_THRESHOLD) return
        press.active = true
        setDragId(press.product._id)
      }
      setGhost({ x: ev.clientX, y: ev.clientY, p: press.product })
      updatePreview(ev.clientX, ev.clientY)
    },
    [updatePreview]
  )

  const onUp = useCallback(() => {
    const press = pressRef.current
    if (press && press.active) {
      // Suppress the synthetic click that follows a real drag so onClick
      // (plain clicks / keyboard activation) doesn't double-fire.
      suppressClickRef.current = true
      const t = targetRef.current

      if (press.originSlot === null) {
        // From the bench.
        if (t && t !== 'remove') {
          if (t.valid) {
            setSlots((prev) => {
              const next = [...prev]
              next[t.slot] = press.product
              return next
            })
          } else {
            toast.warning('That slot is taken — remove the product there first.')
          }
        }
      } else {
        // From a canvas slot.
        if (t === 'remove') {
          const from = press.originSlot
          setSlots((prev) => {
            const next = [...prev]
            next[from] = null
            return next
          })
        } else if (t) {
          if (t.valid && t.slot !== press.originSlot) {
            const from = press.originSlot
            setSlots((prev) => {
              const next = [...prev]
              next[from] = null
              next[t.slot] = press.product
              return next
            })
          } else if (!t.valid) {
            toast.warning('That slot is taken — remove the product there first.')
          }
        }
      }
    }
    endDrag()
  }, [endDrag])

  moveRef.current = onMove
  upRef.current = onUp

  const startPress = useCallback(
    (e: React.PointerEvent, product: HomeProductRow, originSlot: number | null) => {
      if (e.button !== 0) return
      e.preventDefault()
      pressRef.current = { product, originSlot, startX: e.clientX, startY: e.clientY, active: false }
      document.addEventListener('pointermove', moveProxy)
      document.addEventListener('pointerup', upProxy)
    },
    [moveProxy, upProxy]
  )

  useEffect(() => {
    return () => {
      document.removeEventListener('pointermove', moveProxy)
      document.removeEventListener('pointerup', upProxy)
    }
  }, [moveProxy, upProxy])

  function removeSlot(i: number) {
    setSlots((prev) => {
      const next = [...prev]
      next[i] = null
      return next
    })
  }

  function featureFromBench(p: HomeProductRow) {
    // Skip the synthetic click that trails a drag (handled in onUp).
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    const empty = slotsRef.current.findIndex((x) => x === null)
    if (empty < 0) {
      toast.warning(`You can feature at most ${MAX_FEATURED} products.`)
      return
    }
    setSlots((prev) => {
      const next = [...prev]
      next[empty] = p
      return next
    })
  }

  async function handleSave() {
    const current = slotsRef.current
    if (current.every((p) => p === null)) {
      toast.warning('Feature at least one product before saving.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/home-products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: current.map((p) => p?._id ?? null) }),
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      savedRef.current = signature(current)
      toast.success('Homepage products updated.')
      setSlots((prev) => [...prev])
    } catch (err) {
      toast.error(err instanceof Error ? `Save failed: ${err.message}` : 'Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const canvasActive = Boolean(dragId) && target !== null && target !== 'remove'
  const benchActive = Boolean(dragId) && target === 'remove'

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Homepage constellation</h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">
            A 1:1 scaled preview of the live homepage &ldquo;Available Products&rdquo; section. Drag products
            from the bench into the {MAX_FEATURED} fixed slots — each stays exactly where you place it. To swap
            a slot, remove the product in it first (the &times; button); slots won&rsquo;t overwrite. At least
            one product must be featured — with none, the &ldquo;Available Products&rdquo; section is hidden
            from the homepage. <span className="text-slate-400">Dimmed products are marked invisible and
            won&rsquo;t show on the homepage — make them visible under{' '}
            <Link href="/editor?tab=products" className="font-medium text-[#3B82F6] underline-offset-2 hover:underline">
              Editor&nbsp;&rsaquo;&nbsp;Products
            </Link>{' '}
            first.</span>
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving || isEmpty}
          title={isEmpty ? 'Feature at least one product before saving.' : undefined}
          className="flex-shrink-0 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Left: the 1:1 scaled preview stage. */}
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Live preview · 1:1
            </span>
            <span className="text-[11px] font-medium tabular-nums text-slate-400">
              {filledCount} / {MAX_FEATURED} featured
            </span>
          </div>

          {hiddenFeaturedCount > 0 && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-700">
              {hiddenFeaturedCount === 1
                ? '1 featured product is currently invisible'
                : `${hiddenFeaturedCount} featured products are currently invisible`}{' '}
              (shown dimmed) and won&rsquo;t appear on the live homepage. Make them visible under{' '}
              <Link href="/editor?tab=products" className="font-medium underline underline-offset-2 hover:text-amber-800">
                Editor&nbsp;&rsaquo;&nbsp;Products
              </Link>{' '}
              to display them.
            </div>
          )}

          <div
            ref={stageWrapRef}
            className={`relative w-full overflow-hidden rounded-xl border bg-background transition-colors duration-200 ${
              canvasActive ? 'border-[#3B82F6] ring-2 ring-[#3B82F6]/25' : 'border-slate-200'
            }`}
            style={{ height: STAGE_H * scale }}
          >
            {/* The homepage section at its natural size, scaled down to fit. */}
            <div
              style={{
                width: STAGE_W,
                height: STAGE_H,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              <div style={{ padding: `${STAGE_PAD_Y}px ${STAGE_PAD_X}px` }}>
                <div ref={canvasRef} className="relative" style={{ height: BLOCK_H }}>
                  <ConstellationBackdrop interactive={false} />

                  {/* The eight fixed slots: a product tile or an empty placeholder. */}
                  {LAYOUT.map((s, i) => {
                    const p = slots[i]
                    const targeted =
                      target && target !== 'remove' && target.slot === i ? target.valid : null
                    const slotStyle = {
                      left: `${s.left}%`,
                      top: `${s.top}%`,
                      width: s.size,
                      height: s.size,
                      '--rot': `${s.rot}deg`,
                    } as CSSProperties

                    if (!p) {
                      return (
                        <div key={i} className="cn-slot" style={slotStyle}>
                          <div className="cn-rot">
                            <div
                              className={`flex h-full w-full items-center justify-center rounded-2xl border-2 border-dashed transition-colors duration-150 ${
                                targeted === true
                                  ? 'border-[#3B82F6] bg-[#3B82F6]/[0.06]'
                                  : 'border-slate-300/80 bg-slate-50/40'
                              }`}
                            >
                              <Plus
                                className={targeted === true ? 'text-[#3B82F6]' : 'text-slate-300'}
                                style={{ width: '22%', height: '22%' }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    }

                    const dragged = dragId === p._id
                    return (
                      <div
                        key={i}
                        className={`cn-slot group cursor-grab touch-none select-none active:cursor-grabbing ${
                          p.isHidden ? 'opacity-40' : ''
                        }`}
                        style={slotStyle}
                        onPointerDown={(e) => startPress(e, p, i)}
                        aria-label={`${p.name}${p.isHidden ? ' (hidden — not shown on the live homepage)' : ''}. Drag to an empty slot, or use the remove button.`}
                      >
                        <div className="cn-rot">
                          <div
                            className={`cn-card ${
                              dragged
                                ? 'opacity-30'
                                : targeted === false
                                  ? 'outline outline-2 outline-[#EF4444]'
                                  : ''
                            }`}
                          >
                            <ConstellationLogo p={p} />

                            {/* Remove → returns the product to the bench, empties the slot. */}
                            <button
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={() => removeSlot(i)}
                              aria-label={`Remove ${p.name}`}
                              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-500 shadow-md ring-1 ring-slate-200 transition-colors hover:bg-[#EF4444] hover:text-white hover:ring-[#EF4444]"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                        <span className="cn-cap">
                          <span className="cn-cap-name">{p.name}</span>
                          {p.description && <span className="cn-cap-line">{p.description}</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: the bench — available products, also the drop-to-remove zone. */}
        <aside
          className={`flex-shrink-0 rounded-xl border p-3 transition-colors duration-200 lg:w-72 ${
            benchActive
              ? 'border-[#EF4444]/60 bg-[#EF4444]/[0.04] ring-2 ring-[#EF4444]/15'
              : 'border-slate-200 bg-[#F4F4F6]/40'
          }`}
        >
          <div className="mb-2.5 flex items-center justify-between px-0.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {benchActive ? 'Release to remove' : 'Bench'}
            </span>
            {atCapacity && !benchActive && (
              <span className="text-[11px] font-medium text-amber-600">All slots full</span>
            )}
          </div>

          {available.length === 0 ? (
            <p className="px-1 py-3 text-xs text-slate-400">Every product is featured.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {available.map((p) => (
                <button
                  key={p._id}
                  onPointerDown={(e) => startPress(e, p, null)}
                  onClick={() => featureFromBench(p)}
                  aria-label={`Feature ${p.name}${p.isHidden ? ' (hidden — make it visible under Editor › Products to show it on the homepage)' : ''}`}
                  title={
                    p.isHidden
                      ? 'Hidden — won’t appear on the homepage until you make it visible under Editor › Products'
                      : atCapacity
                        ? `Remove a product first (max ${MAX_FEATURED})`
                        : `Drag into a slot, or click to feature ${p.name}`
                  }
                  className={`group flex touch-none select-none items-center gap-2 rounded-lg border border-slate-200 bg-white py-1.5 pl-1.5 pr-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 ${
                    p.isHidden ? 'opacity-50' : ''
                  } ${atCapacity ? 'cursor-grab opacity-60' : 'cursor-grab active:cursor-grabbing'}`}
                >
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-100 bg-white p-0.5">
                    <BenchLogo p={p} />
                  </span>
                  <span className="flex-1 truncate text-xs font-medium text-slate-700">{p.name}</span>
                  {p.isHidden && (
                    <span className="flex-shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      Hidden
                    </span>
                  )}
                  <Plus
                    size={13}
                    className="flex-shrink-0 text-slate-300 transition-colors group-hover:text-[#3B82F6]"
                  />
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Floating drag ghost */}
      {ghost && (
        <div
          className="pointer-events-none fixed z-50 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-[#FDBA74] bg-white p-2 shadow-[0_18px_36px_-12px_rgba(234,88,12,0.55)]"
          style={{ left: ghost.x, top: ghost.y }}
        >
          <BenchLogo p={ghost.p} rounded="rounded-lg" />
        </div>
      )}
    </div>
  )
}
