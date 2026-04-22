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
  progressUpdates: string[]
  nextSteps: string[]
  learningPoints: string[]
  media: string[]
  productId: Product
}

interface ComparisonViewProps {
  current: UpdateSnapshot
  prev: UpdateSnapshot | null
}

const SECTIONS = [
  { key: 'progressUpdates' as const, label: 'Key Milestones',   border: 'border-emerald-200', labelColor: 'text-emerald-700', dot: 'bg-emerald-500', addedBg: 'bg-emerald-50', addedText: 'text-emerald-700' },
  { key: 'nextSteps'       as const, label: 'Next Steps',       border: 'border-blue-200',    labelColor: 'text-blue-700',    dot: 'bg-blue-500',    addedBg: 'bg-blue-50',    addedText: 'text-blue-700'    },
  { key: 'learningPoints'  as const, label: 'Learning Points',  border: 'border-amber-200',   labelColor: 'text-amber-700',   dot: 'bg-amber-500',   addedBg: 'bg-amber-50',   addedText: 'text-amber-700'   },
]

function diffArray(current: string[], prev: string[]) {
  const normalize = (s: string) => s.trim().toLowerCase()
  const prevSet = new Set(prev.map(normalize))
  const currSet = new Set(current.map(normalize))

  const added = current.filter((item) => !prevSet.has(normalize(item)))
  const removed = prev.filter((item) => !currSet.has(normalize(item)))
  const unchanged = current.filter((item) => prevSet.has(normalize(item)))

  return { added, removed, unchanged }
}

export function ComparisonView({ current, prev }: ComparisonViewProps) {
  if (!prev) {
    return <UpdateDetail update={current} />
  }

  const product = current.productId

  const titleChanged = current.title.trim() !== prev.title.trim()
  const summaryChanged = current.summary.trim() !== prev.summary.trim()

  function isVideo(url: string) {
    return /\.(mp4|webm|mov)$/i.test(url)
  }

  return (
    <article>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {product && <ProductBadge name={product.name} color={product.color} />}
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
        <p className="text-base text-slate-500 leading-7 mt-3">{current.summary}</p>
        {summaryChanged && (
          <p className="text-sm text-slate-400 line-through leading-6 mt-1">{prev.summary}</p>
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

      {/* Diff sections */}
      <div className="space-y-4">
        {SECTIONS.map((s) => {
          const currItems = current[s.key] || []
          const prevItems = prev[s.key] || []
          if (currItems.length === 0 && prevItems.length === 0) return null

          const { added, removed, unchanged } = diffArray(currItems, prevItems)
          const hasContent = unchanged.length > 0 || added.length > 0 || removed.length > 0

          if (!hasContent) return null

          return (
            <div key={s.key} className={`p-5 bg-white rounded-xl border ${s.border}`}>
              <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${s.labelColor}`}>
                {s.label}
              </h2>
              <ol className="space-y-2 list-none">
                {unchanged.map((item, i) => (
                  <li key={`u-${i}`} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className={`flex-shrink-0 w-5 text-right text-xs font-semibold mt-0.5 ${s.labelColor}`}>{i + 1}.</span>
                    {item}
                  </li>
                ))}
                {added.map((item, i) => (
                  <li key={`a-${i}`} className={`flex items-start gap-2 text-sm ${s.addedText} ${s.addedBg} rounded-lg px-2 py-1.5 -mx-2`}>
                    <span className="flex-shrink-0 w-5 text-right text-xs font-semibold mt-0.5">{unchanged.length + i + 1}.</span>
                    {item}
                  </li>
                ))}
                {removed.map((item, i) => (
                  <li key={`r-${i}`} className="flex items-start gap-3 text-sm text-slate-400 line-through">
                    <span className="flex-shrink-0 w-5 text-right text-xs font-semibold mt-0.5">–</span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          )
        })}
      </div>
    </article>
  )
}
