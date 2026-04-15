import Link from 'next/link'
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
  }
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/updates?product=${product.slug}`}>
      <div className="group border border-slate-200 rounded-xl p-5 bg-white hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex-shrink-0"
              style={{ backgroundColor: product.color + '20' }}
            >
              <div
                className="w-full h-full rounded-lg opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                style={{ backgroundColor: product.color }}
              >
                <span className="text-white text-xs font-bold">
                  {product.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
              {product.name}
            </h3>
          </div>
          <Badge variant="secondary" className="text-xs flex-shrink-0 ml-2">
            {product.updateCount} update{product.updateCount !== 1 ? 's' : ''}
          </Badge>
        </div>

        {product.description && (
          <p className="text-sm text-slate-500 leading-5 mb-3 line-clamp-2">
            {product.description}
          </p>
        )}

        {product.latestUpdateTitle && (
          <p className="text-xs text-slate-400 line-clamp-1">
            Latest: {product.latestUpdateTitle}
          </p>
        )}
      </div>
    </Link>
  )
}
