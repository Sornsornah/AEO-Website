'use client'

import type { CSSProperties } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export interface HomeProduct {
  _id: string
  name: string
  slug: string
  description?: string
  shortDescription?: string
  color: string
  logoUrl?: string
  uiScreenshot?: string
}

interface ProductsCarouselProps {
  products: HomeProduct[]
}

interface Slot {
  left: number
  top: number
  size: number
  rot: number
  dur: number
  delay: number
}

// Hand-tuned, balanced constellation layouts per product count (1–8). Each set
// rings the central title and clears the middle text column. Positions are
// percentages of the canvas; size/rotation/drift vary per tile for life.
const LAYOUTS: Record<number, Slot[]> = {
  1: [{ left: 50, top: 16, size: 108, rot: -4, dur: 6.8, delay: 0 }],
  2: [
    { left: 19, top: 25, size: 104, rot: -7, dur: 6.6, delay: 0 },
    { left: 81, top: 25, size: 104, rot: 6, dur: 7.2, delay: 0.3 },
  ],
  3: [
    { left: 18, top: 24, size: 100, rot: -7, dur: 6.6, delay: 0 },
    { left: 82, top: 25, size: 100, rot: 6, dur: 7.2, delay: 0.3 },
    { left: 50, top: 84, size: 96, rot: -3, dur: 7.0, delay: 0.6 },
  ],
  4: [
    { left: 17, top: 23, size: 104, rot: -8, dur: 6.6, delay: 0 },
    { left: 83, top: 24, size: 100, rot: 7, dur: 7.0, delay: 0.25 },
    { left: 21, top: 82, size: 94, rot: -5, dur: 6.9, delay: 0.5 },
    { left: 79, top: 83, size: 96, rot: 5, dur: 7.6, delay: 0.15 },
  ],
  5: [
    { left: 16, top: 27, size: 100, rot: -7, dur: 6.6, delay: 0 },
    { left: 84, top: 28, size: 98, rot: 7, dur: 7.0, delay: 0.25 },
    { left: 23, top: 82, size: 92, rot: -5, dur: 6.9, delay: 0.5 },
    { left: 77, top: 83, size: 94, rot: 5, dur: 7.6, delay: 0.15 },
    { left: 50, top: 12, size: 96, rot: -3, dur: 7.3, delay: 0.8 },
  ],
  6: [
    { left: 17, top: 22, size: 104, rot: -8, dur: 6.6, delay: 0 },
    { left: 83, top: 23, size: 100, rot: 7, dur: 7.0, delay: 0.25 },
    { left: 21, top: 83, size: 92, rot: -5, dur: 6.9, delay: 0.5 },
    { left: 79, top: 84, size: 96, rot: 6, dur: 7.6, delay: 0.15 },
    { left: 9, top: 53, size: 82, rot: 5, dur: 7.4, delay: 0.8 },
    { left: 91, top: 55, size: 80, rot: -6, dur: 6.3, delay: 1.0 },
  ],
  7: [
    { left: 17, top: 24, size: 100, rot: -8, dur: 6.6, delay: 0 },
    { left: 83, top: 25, size: 98, rot: 7, dur: 7.0, delay: 0.25 },
    { left: 21, top: 84, size: 92, rot: -5, dur: 6.9, delay: 0.5 },
    { left: 79, top: 85, size: 94, rot: 6, dur: 7.6, delay: 0.15 },
    { left: 9, top: 55, size: 80, rot: 5, dur: 7.4, delay: 0.8 },
    { left: 91, top: 56, size: 80, rot: -6, dur: 6.3, delay: 1.0 },
    { left: 50, top: 11, size: 90, rot: -3, dur: 7.1, delay: 0.6 },
  ],
  8: [
    { left: 17, top: 25, size: 98, rot: -8, dur: 6.6, delay: 0 },
    { left: 83, top: 26, size: 96, rot: 7, dur: 7.0, delay: 0.25 },
    { left: 20, top: 80, size: 90, rot: -5, dur: 6.9, delay: 0.5 },
    { left: 80, top: 81, size: 92, rot: 6, dur: 7.6, delay: 0.15 },
    { left: 9, top: 54, size: 80, rot: 5, dur: 7.4, delay: 0.8 },
    { left: 91, top: 55, size: 78, rot: -6, dur: 6.3, delay: 1.0 },
    { left: 50, top: 11, size: 88, rot: -3, dur: 7.1, delay: 0.6 },
    { left: 50, top: 92, size: 86, rot: 4, dur: 6.7, delay: 0.35 },
  ],
}

function buildSlots(n: number): Slot[] {
  if (n < 1) return []
  return LAYOUTS[Math.min(n, 8)] ?? LAYOUTS[8]
}

export function ProductsCarousel({ products }: ProductsCarouselProps) {
  const renderLogo = (p: HomeProduct) =>
    p.logoUrl ? (
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

  const centerBlock = (
    <div className="text-center">
      <h2 className="text-4xl font-bold tracking-tight text-[#1C1512] md:text-5xl">
        Available <span className="text-orange-600">Products</span>
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-sm text-stone-500">
        All the products made in-house available for CPF officers.
      </p>
      <Link
        href="/products"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-[#F8FAFC] shadow-sm transition-colors hover:bg-[#EA580C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2"
      >
        Check out products
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )

  const slots = buildSlots(products.length)

  return (
    <section className="relative mx-auto max-w-6xl 2xl:max-w-[78vw] px-6 py-20 md:py-24">
      {/* Desktop: scattered floating-logo constellation around the centred title. */}
      <div className="relative hidden min-h-[36rem] md:block lg:min-h-[40rem]">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(closest-side, rgba(234,88,12,0.06), rgba(234,88,12,0))',
          }}
        />

        <div className="absolute left-1/2 top-1/2 z-20 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-6">
          {centerBlock}
        </div>

        {products.map((p, i) => {
          const s = slots[i]
          if (!s) return null
          const line = p.description
          return (
            <div
              key={p._id}
              className="cn-slot group"
              style={
                {
                  left: `${s.left}%`,
                  top: `${s.top}%`,
                  width: s.size,
                  height: s.size,
                  '--rot': `${s.rot}deg`,
                  '--float-dur': `${s.dur}s`,
                  '--float-delay': `${s.delay}s`,
                } as CSSProperties
              }
            >
              <div className="cn-rot">
                <div className="cn-float">
                  <Link href={`/products/${p.slug}`} className="cn-card" aria-label={p.name}>
                    {renderLogo(p)}
                  </Link>
                </div>
              </div>
              <span className="cn-cap">
                <span className="cn-cap-name">{p.name}</span>
                {line && <span className="cn-cap-line">{line}</span>}
              </span>
            </div>
          )
        })}
      </div>

      {/* Mobile / narrow: centred stack, no scatter, names always visible. */}
      <div className="md:hidden">
        {centerBlock}
        {products.length > 0 && (
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {products.map((p) => (
              <Link
                key={p._id}
                href={`/products/${p.slug}`}
                className="group flex flex-col items-center gap-2.5 text-center"
              >
                <span className="flex aspect-square w-full items-center justify-center rounded-2xl border border-[#EFE7DC] bg-white p-4 shadow-[0_6px_16px_-8px_rgba(28,21,18,0.18)] transition-[box-shadow,border-color] group-hover:border-[#FDBA74] group-hover:shadow-[0_16px_30px_-12px_rgba(234,88,12,0.28)]">
                  <span className="flex h-12 w-full items-center justify-center">
                    {renderLogo(p)}
                  </span>
                </span>
                <span className="text-sm font-semibold text-[#1C1512] transition-colors group-hover:text-orange-600">
                  {p.name}
                </span>
                {p.description && (
                  <span className="line-clamp-2 text-xs leading-snug text-stone-500">
                    {p.description}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
