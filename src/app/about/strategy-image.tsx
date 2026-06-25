'use client'

import { useEffect, useState } from 'react'

const SRC = '/ai-strategy.png'
const ALT =
  'AI strategy framework: a human-centred AI vision supported by three key thrusts (Elevate, Explore, Evolve) delivering enhanced productivity, transformed product and service experiences, and transformed work experiences, all built on the enablers of People, Platforms, and Processes.'

export function StrategyImage() {
  const [open, setOpen] = useState(false)
  const [zoomed, setZoomed] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  // Reset zoom whenever the lightbox closes.
  useEffect(() => {
    if (!open) setZoomed(false)
  }, [open])

  return (
    <>
      <figure className="rounded-2xl border border-[#E8E0D6] bg-[#FDFCFB] p-3 sm:p-6 shadow-sm">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full cursor-zoom-in rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDFCFB]"
          aria-label="Expand strategy diagram"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SRC}
            alt={ALT}
            className="w-full h-auto rounded-lg transition-opacity hover:opacity-95"
            loading="lazy"
          />
        </button>
      </figure>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Strategy diagram, expanded"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 overflow-auto overscroll-contain bg-white p-4 sm:p-8"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
            }}
            aria-label="Close"
            className="fixed right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E0D6] bg-white text-xl leading-none text-[#1C1512] shadow-sm hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            &times;
          </button>
          <div className="flex min-h-full min-w-full items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SRC}
              alt={ALT}
              onClick={(e) => {
                e.stopPropagation()
                setZoomed((z) => !z)
              }}
              className={
                zoomed
                  ? 'w-auto max-w-none cursor-zoom-out'
                  : 'max-h-[calc(100vh-4rem)] max-w-full cursor-zoom-in'
              }
            />
          </div>
        </div>
      )}
    </>
  )
}
