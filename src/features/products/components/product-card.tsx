import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'

interface ProductCardProps {
  product: {
    _id: string
    name: string
    slug: string
    description?: string
    color: string
    updateCount: number
    latestUpdateTitle?: string
    logoUrl?: string
  }
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/products/${product.slug}`}>
      <div className="group border border-slate-200 rounded-xl p-5 bg-white hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer h-full flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: product.logoUrl ? undefined : product.color }}
            >
              {product.logoUrl ? (
                <Image src={product.logoUrl} alt={product.name} width={36} height={36} className="object-contain w-full h-full" />
              ) : (
                <span className="text-white text-xs font-bold">
                  {product.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
              {product.name}
            </h3>
          </div>
          <Badge variant="secondary" className="text-xs flex-shrink-0 ml-2">
            {product.updateCount} update{product.updateCount !== 1 ? 's' : ''}
          </Badge>
        </div>

        {product.description ? (
          <p className="text-sm text-slate-500 leading-5 mb-3 line-clamp-3 flex-1">
            {product.description}
          </p>
        ) : (
          <p className="text-sm text-slate-300 leading-5 mb-3 italic flex-1">No description yet.</p>
        )}

        {product.latestUpdateTitle && (
          <p className="text-xs text-slate-400 line-clamp-1 pt-2 border-t border-slate-100">
            Latest: {product.latestUpdateTitle}
          </p>
        )}
      </div>
    </Link>
  )
}
