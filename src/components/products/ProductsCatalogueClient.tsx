'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'

interface CatalogueProduct {
  _id: string
  name: string
  slug: string
  description?: string
  shortDescription?: string
  color: string
  logoUrl?: string
  uiScreenshot?: string
  features: { title: string; description: string }[]
}

interface ProductsCatalogueClientProps {
  products: CatalogueProduct[]
}

function getTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#1e293b' : '#ffffff'
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function ProductsCatalogueClient({ products }: ProductsCatalogueClientProps) {
  const [selectedId, setSelectedId] = useState<string>(products[0]?._id || '')

  const selected = products.find((p) => p._id === selectedId) || products[0]

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 text-sm">No products yet.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-center text-xs text-amber-800">
        Note: This page contains synthetic data for demonstration purposes only.
      </div>
      {/* Header */}
      <div className="pt-12 pb-8 text-center px-6">
        <p className="text-xs font-semibold tracking-[0.2em] text-amber-700 uppercase mb-3">
          — The Full Catalogue —
        </p>
        <h1 className="text-4xl font-bold text-slate-900 mb-3">Explore potential products</h1>
        <p className="text-slate-500 text-sm">
          Browse the full suite of products built for CPF officers.
        </p>
      </div>

      {/* Two-column body */}
      <div className="flex gap-6 px-8 pb-12 max-w-6xl mx-auto">
        {/* Left panel — product list */}
        <div className="w-80 flex-shrink-0 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
          {products.map((product) => {
            const isSelected = product._id === selectedId
            return (
              <button
                key={product._id}
                onMouseEnter={() => setSelectedId(product._id)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-white border-slate-200 shadow-md'
                    : 'bg-white/70 border-slate-200/70 hover:bg-white hover:border-slate-200 hover:shadow-sm'
                }`}
                style={isSelected ? { borderLeftColor: product.color, borderLeftWidth: 3 } : {}}
              >
                {/* Logo */}
                <div
                  className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: product.logoUrl ? undefined : product.color }}
                >
                  {product.logoUrl ? (
                    <Image src={product.logoUrl} alt={product.name} width={36} height={36} className="object-contain w-full h-full" />
                  ) : (
                    <span className="text-white text-xs font-bold">{product.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                {/* Name + description */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{product.name}</p>
                  {product.description && (
                    <p className="text-xs text-slate-500 truncate">{product.description}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Right panel — preview */}
        {selected && (
          <div
            className="flex-1 rounded-2xl overflow-hidden shadow-md border border-slate-200 max-h-[calc(100vh-220px)] overflow-y-auto"
            style={{ background: `linear-gradient(135deg, ${hexToRgba(selected.color, 0.1)} 0%, ${hexToRgba(selected.color, 0.03)} 100%), var(--tw-bg-card, hsl(var(--card)))` }}
          >
            <div className="bg-white/80 p-8">
              {/* Logo + name + link */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: selected.logoUrl ? undefined : selected.color }}
                >
                  {selected.logoUrl ? (
                    <Image src={selected.logoUrl} alt={selected.name} width={48} height={48} className="object-contain w-full h-full" />
                  ) : (
                    <span style={{ color: getTextColor(selected.color) }} className="text-lg font-bold">
                      {selected.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-1">
                  <h2 className="text-xl font-bold text-slate-900">{selected.name}</h2>
                  <Link
                    href={`/products/${selected.slug}`}
                    className="inline-flex items-center gap-1 text-sm font-medium transition-colors"
                    style={{ color: selected.color }}
                  >
                    Find out more
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* One-liner */}
              {selected.description && (
                <p className="text-sm font-medium mb-5" style={{ color: selected.color }}>
                  {selected.description}
                </p>
              )}

              {/* UI Screenshot */}
              {selected.uiScreenshot && (
                <div className="rounded-xl overflow-hidden mb-5 border border-black/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selected.uiScreenshot} alt={`${selected.name} UI`} className="w-full object-contain" />
                </div>
              )}

              {/* Short description */}
              {selected.shortDescription && (
                <p className="text-sm text-slate-600 leading-relaxed mb-5">
                  {selected.shortDescription}
                </p>
              )}

              {/* Features */}
              {selected.features.length > 0 && (
                <ul className="space-y-2">
                  {selected.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="mt-0.5 flex-shrink-0 text-base leading-none" style={{ color: selected.color }}>✦</span>
                      <span>{f.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
