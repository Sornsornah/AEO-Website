'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { ProductBadge } from './ProductBadge'
import { SaveButton } from './SaveButton'
import { Badge } from '@/components/ui/badge'

interface Product {
  _id: string
  name: string
  color: string
  slug: string
}

interface UpdateCardProps {
  update: {
    _id: string
    title: string
    summary: string
    date: string | Date
    highlights: string[]
    productId: Product
    isPublished?: boolean
  }
  isNew?: boolean
  showStatus?: boolean
  isSaved?: boolean
  onSelect?: (id: string) => void
}

export function UpdateCard({ update, isNew = false, showStatus = false, isSaved = false, onSelect }: UpdateCardProps) {
  const product = update.productId

  const content = (
    <div className="flex gap-8 py-8 border-b border-slate-100 hover:bg-slate-50/50 -mx-6 px-6 rounded-lg transition-colors cursor-pointer">
      {/* Date column */}
      <div className="w-32 flex-shrink-0 pt-0.5">
        <time className="text-sm text-slate-400 font-medium whitespace-nowrap">
          {formatDate(update.date)}
        </time>
      </div>

      {/* Content column */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          {product && <ProductBadge name={product.name} color={product.color} />}
          {isNew && (
            <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-xs font-medium hover:bg-blue-50">
              New
            </Badge>
          )}
          {showStatus && !update.isPublished && (
            <Badge variant="secondary" className="text-xs">Draft</Badge>
          )}
        </div>

        <h2 className="text-base font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
          {update.title}
        </h2>

        <p className="text-sm text-slate-500 leading-6 mb-3">
          {update.summary}
        </p>

        {update.highlights && update.highlights.length > 0 && (
          <ul className="space-y-1">
            {update.highlights.map((highlight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-500">
                <span className="mt-2 w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions column */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
        <SaveButton updateId={update._id} isSaved={isSaved} />
        {onSelect && (
          <Link
            href={`/updates/${update._id}`}
            className="text-slate-300 hover:text-slate-500 transition-colors"
            title="Open full page"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  )

  if (onSelect) {
    return (
      <article className="group" onClick={() => onSelect(update._id)}>
        {content}
      </article>
    )
  }

  return (
    <article className="group">
      <Link href={`/updates/${update._id}`}>
        {content}
      </Link>
    </article>
  )
}
