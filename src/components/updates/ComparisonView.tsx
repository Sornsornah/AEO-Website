import ReactMarkdown from 'react-markdown'
import { formatDate } from '@/lib/utils'
import { ProductBadge } from './ProductBadge'
import { UpdateDetail } from './UpdateDetail'

interface Product {
  _id: string
  name: string
  color: string
}

interface UpdateSnapshot {
  title: string
  summary: string
  date: string | Date
  progressUpdates: string
  nextSteps: string
  learningPoints: string
  media: string[]
  productId?: Product
  productIds?: Product[]
}

interface ComparisonViewProps {
  current: UpdateSnapshot
  prev: UpdateSnapshot | null
}

const SECTIONS = [
  { key: 'progressUpdates' as const, label: 'Key Milestones',  border: 'border-emerald-200', labelColor: 'text-emerald-700' },
  { key: 'nextSteps'       as const, label: 'Next Steps',      border: 'border-blue-200',    labelColor: 'text-blue-700'    },
  { key: 'learningPoints'  as const, label: 'Learning Points', border: 'border-amber-200',   labelColor: 'text-amber-700'   },
]

export function ComparisonView({ current, prev }: ComparisonViewProps) {
  if (!prev) {
    return <UpdateDetail update={current} />
  }

  const products: Product[] = current.productIds?.length
    ? current.productIds
    : current.productId ? [current.productId] : []

  const titleChanged = current.title.trim() !== prev.title.trim()
  const summaryChanged = current.summary !== prev.summary

  function isVideo(url: string) {
    return /\.(mp4|webm|mov)$/i.test(url)
  }

  return (
    <article>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {products.map((p) => (
            <ProductBadge key={p._id} name={p.name} color={p.color} />
          ))}
          <span className="text-slate-300">·</span>
          <time className="text-sm text-slate-400">{formatDate(current.date)}</time>
          <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
            vs {formatDate(prev.date)}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-900 mb-1 leading-snug">{current.title}</h1>
        {titleChanged && (
          <p className="text-sm text-slate-400 line-through mb-3">{prev.title}</p>
        )}

        {/* Summary */}
        {current.summary && current.summary !== '<p></p>' && (
          <div
            className="text-base text-slate-500 leading-7 mt-3 prose prose-base prose-slate max-w-none [&_u]:underline [&_s]:line-through prose-a:text-blue-600 prose-a:underline"
            dangerouslySetInnerHTML={{ __html: current.summary }}
          />
        )}
        {summaryChanged && prev.summary && prev.summary !== '<p></p>' && (
          <div
            className="text-sm text-slate-400 leading-6 mt-1 line-through prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: prev.summary }}
          />
        )}
      </div>

      {/* Media (current only) */}
      {current.media?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Media</h2>
          <div className="grid grid-cols-2 gap-2">
            {current.media.map((url, i) =>
              isVideo(url) ? (
                <video key={i} src={url} controls className="w-full rounded-xl max-h-64 bg-black col-span-1" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="" className="w-full rounded-xl object-cover max-h-64 cursor-pointer col-span-1" onClick={() => window.open(url)} />
              )
            )}
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {SECTIONS.map((s) => {
          const content = current[s.key]
          if (!content?.trim()) return null
          return (
            <div key={s.key} className={`p-5 bg-white rounded-xl border ${s.border}`}>
              <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${s.labelColor}`}>
                {s.label}
              </h2>
              <div className="prose prose-sm max-w-none text-slate-700">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </div>
          )
        })}
      </div>
    </article>
  )
}
