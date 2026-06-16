'use client'

import type { CSSProperties } from 'react'
import Link from 'next/link'
import { buildSlots, MAX_CONSTELLATION } from '@/features/home/constellation-layout'
import {
  ConstellationBackdrop,
  ConstellationCenter,
} from '@/features/home/components/constellation-backdrop'

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
  // Positional: index = constellation slot (0–7), `null` = an empty slot.
  products: (HomeProduct | null)[]
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

  // Fixed 8-slot layout: products sit in their stored slots, gaps stay empty.
  const slots = buildSlots(MAX_CONSTELLATION)
  const visibleProducts = products.filter((p): p is HomeProduct => p !== null)

  return (
    <section className="relative mx-auto max-w-6xl 2xl:max-w-[78vw] px-6 py-20 md:py-24">
      {/* Desktop: scattered floating-logo constellation around the centred title. */}
      <div className="relative hidden min-h-[36rem] md:block lg:min-h-[40rem]">
        <ConstellationBackdrop />

        {products.map((p, i) => {
          const s = slots[i]
          if (!s || !p) return null
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
        <ConstellationCenter />
        {visibleProducts.length > 0 && (
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {visibleProducts.map((p) => (
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
