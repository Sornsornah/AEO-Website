import { formatDate } from '@/lib/utils'
import { ProductBadge } from './ProductBadge'

interface Product {
  _id: string
  name: string
  color: string
}

interface UpdateDetailProps {
  update: {
    title: string
    summary: string
    date: string | Date
    progressUpdates: string[]
    nextSteps: string[]
    learningPoints: string[]
    media: string[]
    productId: Product
  }
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov)$/i.test(url)
}

const SECTIONS = [
  { key: 'progressUpdates' as const, label: 'Progress Updates', border: 'border-emerald-200', labelColor: 'text-emerald-700', dotColor: '#10b981' },
  { key: 'nextSteps'       as const, label: 'Next Steps',       border: 'border-blue-200',    labelColor: 'text-blue-700',    dotColor: '#3b82f6' },
  { key: 'learningPoints'  as const, label: 'Learning Points',  border: 'border-amber-200',   labelColor: 'text-amber-700',   dotColor: '#f59e0b' },
]

export function UpdateDetail({ update }: UpdateDetailProps) {
  const product = update.productId

  return (
    <article>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          {product && <ProductBadge name={product.name} color={product.color} />}
          <span className="text-slate-300">·</span>
          <time className="text-sm text-slate-400">{formatDate(update.date)}</time>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">{update.title}</h1>
        <p className="text-base text-slate-500 leading-7">{update.summary}</p>
      </div>

      {update.media?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Media</h2>
          <div className="grid grid-cols-2 gap-2">
            {update.media.map((url, i) =>
              isVideo(url) ? (
                <video
                  key={i}
                  src={url}
                  controls
                  className="w-full rounded-xl max-h-64 bg-black col-span-1"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-full rounded-xl object-cover max-h-64 cursor-pointer col-span-1"
                  onClick={() => window.open(url)}
                />
              )
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {SECTIONS.map((s) => {
          const items = update[s.key] || []
          if (items.length === 0) return null
          return (
            <div key={s.key} className={`p-5 bg-white rounded-xl border ${s.border}`}>
              <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${s.labelColor}`}>
                {s.label}
              </h2>
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <span
                      className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: s.dotColor }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </article>
  )
}
