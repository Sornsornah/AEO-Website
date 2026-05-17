'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ProductCardPreview } from './product-card-preview'

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


export function ProductsCatalogueClient({ products }: ProductsCatalogueClientProps) {
  const [selectedId, setSelectedId] = useState<string>(products[0]?._id || '')

  const selected = products.find((p) => p._id === selectedId) || products[0]

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-stone-400 text-sm">No products yet.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="pt-12 pb-8 text-center px-6">
        <p className="text-xs font-semibold tracking-[0.2em] text-orange-700 uppercase mb-3">
The Full Catalogue
        </p>
        <h1 className="text-4xl font-bold text-[#1C1512] mb-3">Explore potential products</h1>
        <p className="text-stone-500 text-sm">
          Browse the full suite of products built for CPF officers.
        </p>
      </div>

      {/* Mobile horizontal scroll strip */}
      <div className="md:hidden px-4 pb-4 overflow-x-auto">
        <div className="flex gap-2 w-max">
          {products.map((product) => {
            const isSelected = product._id === selectedId
            return (
              <button
                key={product._id}
                onClick={() => setSelectedId(product._id)}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-[#FDFCFB] border-[#1C1512] shadow-md'
                    : 'bg-[#FDFCFB]/70 border-[#E8E0D6]/70'
                }`}
              >
                <div
                  className="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: product.logoUrl ? undefined : product.color }}
                >
                  {product.logoUrl ? (
                    <Image src={product.logoUrl} alt={product.name} width={28} height={28} className="object-contain w-full h-full" />
                  ) : (
                    <span className="text-white text-xs font-bold">{product.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="text-sm font-semibold text-[#1C1512] whitespace-nowrap">{product.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Two-column body — desktop */}
      <div className="flex gap-6 px-8 pb-12 max-w-6xl mx-auto">
        {/* Left panel — product list (hidden on mobile) */}
        <div className="hidden md:block w-80 flex-shrink-0 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
          {products.map((product) => {
            const isSelected = product._id === selectedId
            return (
              <button
                key={product._id}
                onMouseEnter={() => setSelectedId(product._id)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-[#FDFCFB] border-[#1C1512] shadow-md'
                    : 'bg-[#FDFCFB]/70 border-[#E8E0D6]/70 hover:bg-[#FDFCFB] hover:border-[#E8E0D6] hover:shadow-sm'
                }`}
              >
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
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#1C1512] truncate">{product.name}</p>
                  {product.description && (
                    <p className="text-xs text-stone-500 truncate">{product.description}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Right panel — preview */}
        {selected && (
          <div className="flex-1 max-h-[calc(100vh-220px)] overflow-y-auto">
            <ProductCardPreview product={selected} />
          </div>
        )}
      </div>
    </div>
  )
}
