'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

const MIN_SCALE = 1
const MAX_SCALE = 8

type Pointer = { x: number; y: number }

// A global click-to-zoom lightbox for content images. Mounted once at the app
// root, it listens for clicks on any <img> inside rendered content (`.prose`)
// and opens a zoomable overlay. Editing surfaces (Tiptap / contenteditable) are
// excluded so authoring still behaves normally.
export function ImageLightbox() {
  const [src, setSrc] = useState<string | null>(null)
  const [alt, setAlt] = useState('')
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)

  // Active pointers for drag-pan (1 pointer) and pinch-zoom (2 pointers).
  const pointers = useRef<Map<number, Pointer>>(new Map())
  const pinchDist = useRef(0)
  // Track whether the current gesture moved, so a pan/pinch isn't treated as a
  // click that closes the lightbox.
  const downPoint = useRef<Pointer | null>(null)
  const dragMoved = useRef(false)

  const open = src !== null

  const reset = useCallback(() => {
    setScale(1)
    setTx(0)
    setTy(0)
  }, [])

  const close = useCallback(() => {
    setSrc(null)
    reset()
    pointers.current.clear()
  }, [reset])

  // Zoom toward a screen point (cx, cy), keeping that point fixed in the image.
  const zoomAt = useCallback((cx: number, cy: number, factor: number) => {
    setScale((prev) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev * factor))
      const ratio = next / prev
      const originX = window.innerWidth / 2
      const originY = window.innerHeight / 2
      setTx((px) => (next === MIN_SCALE ? 0 : cx - originX - ratio * (cx - originX - px)))
      setTy((py) => (next === MIN_SCALE ? 0 : cy - originY - ratio * (cy - originY - py)))
      return next
    })
  }, [])

  // ── Global click delegation: open the lightbox for content images ──
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target || target.tagName !== 'IMG') return
      const img = target as HTMLImageElement
      // Only images inside rendered content, and never while editing.
      if (!img.closest('.prose')) return
      if (img.closest('[contenteditable="true"], .ProseMirror')) return
      // Leave linked images to their link.
      if (img.closest('a')) return
      if (!img.currentSrc && !img.src) return
      e.preventDefault()
      e.stopPropagation()
      setSrc(img.currentSrc || img.src)
      setAlt(img.alt || '')
      setScale(1)
      setTx(0)
      setTy(0)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // Lock body scroll + wire Escape while open.
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  if (!open) return null

  function onPointerDown(e: React.PointerEvent) {
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) {
      downPoint.current = { x: e.clientX, y: e.clientY }
      dragMoved.current = false
    }
    if (pointers.current.size === 2) {
      dragMoved.current = true
      const [a, b] = [...pointers.current.values()]
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y)
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const curr = { x: e.clientX, y: e.clientY }
    pointers.current.set(e.pointerId, curr)

    // Flag as a drag once the pointer travels past a small threshold.
    if (downPoint.current) {
      const moved = Math.hypot(curr.x - downPoint.current.x, curr.y - downPoint.current.y)
      if (moved > 6) dragMoved.current = true
    }

    if (pointers.current.size === 2) {
      // Pinch-zoom around the midpoint of the two pointers.
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinchDist.current > 0) {
        const factor = dist / pinchDist.current
        zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, factor)
      }
      pinchDist.current = dist
      return
    }

    // Single-pointer drag → pan (only meaningful when zoomed in).
    if (scale > 1) {
      setTx((v) => v + (curr.x - prev.x))
      setTy((v) => v + (curr.y - prev.y))
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinchDist.current = 0
    if (pointers.current.size === 0) downPoint.current = null
  }

  // Click anywhere on the stage that isn't the picture closes the lightbox —
  // but not when the click is the tail end of a pan/pinch gesture.
  function onStageClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (dragMoved.current) return
    if ((e.target as HTMLElement).tagName === 'IMG') return
    close()
  }

  function onWheel(e: React.WheelEvent) {
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15)
  }

  function onDoubleClick(e: React.MouseEvent) {
    if (scale > 1) reset()
    else zoomAt(e.clientX, e.clientY, 2.5)
  }

  const stop = (e: React.MouseEvent) => e.stopPropagation()

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm select-none"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5" onClick={stop}>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / 1.4)}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.4)}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Reset zoom"
          onClick={reset}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Image stage */}
      <div
        className="relative flex items-center justify-center w-full h-full overflow-hidden touch-none"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onClick={onStageClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            cursor: scale > 1 ? 'grab' : 'zoom-in',
            transition: pointers.current.size ? 'none' : 'transform 120ms ease-out',
          }}
          className="max-w-[92vw] max-h-[92vh] object-contain will-change-transform"
        />
      </div>

      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/50" onClick={stop}>
        Scroll or pinch to zoom · double-click to toggle · Esc to close
      </p>
    </div>,
    document.body
  )
}
