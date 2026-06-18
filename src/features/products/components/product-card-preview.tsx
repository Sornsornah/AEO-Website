'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'

export interface CardProduct {
  name: string
  slug: string
  description?: string
  shortDescription?: string
  color: string
  logoUrl?: string
  uiScreenshot?: string
  features: { title: string; description: string }[]
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

export function ProductCardPreview({ product }: { product: CardProduct }) {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-md border border-[#E8E0D6]"
      style={{ background: `linear-gradient(135deg, ${hexToRgba(product.color, 0.1)} 0%, ${hexToRgba(product.color, 0.03)} 100%), hsl(var(--card))` }}
    >
      <div className="bg-[#FDFCFB]/80 p-8">
        {/* Logo + name + link */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: product.logoUrl ? undefined : product.color }}
          >
            {product.logoUrl ? (
              <Image src={product.logoUrl} alt={product.name} width={48} height={48} className="object-contain w-full h-full" />
            ) : (
              <span style={{ color: getTextColor(product.color) }} className="text-lg font-bold">
                {product.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-1">
            <h2 className="text-xl font-bold text-[#1C1512]">{product.name}</h2>
            <Link
              href={`/products/${product.slug}`}
              className="inline-flex items-center gap-1 text-sm font-medium transition-colors"
              style={{ color: product.color }}
            >
              Find out more
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* One-liner */}
        {product.description && (
          <p className="text-sm font-medium mb-5" style={{ color: product.color }}>
            {product.description}
          </p>
        )}

        {/* UI Screenshot */}
        {product.uiScreenshot && (
          <div className="rounded-xl overflow-hidden mb-5 border border-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.uiScreenshot} alt={`${product.name} UI`} className="max-w-full h-auto object-contain mx-auto" />
          </div>
        )}

        {/* Short description */}
        {product.shortDescription && (
          <p className="text-sm text-stone-600 leading-relaxed mb-5">
            {product.shortDescription}
          </p>
        )}

        {/* Features */}
        {product.features.length > 0 && (
          <ul className="space-y-2">
            {product.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                <span className="mt-0.5 flex-shrink-0 text-base leading-none" style={{ color: product.color }}>✦</span>
                <span>{f.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
