import ReactMarkdown from 'react-markdown'
import { formatDate } from '@/lib/utils'
import { ProductBadge } from './product-badge'

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
    progressUpdates: string
    nextSteps: string
    learningPoints: string
    media: string[]
    productId?: Product
    productIds?: Product[]
  }
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov)$/i.test(url)
}

const SECTIONS = [
  { key: 'progressUpdates' as const, label: 'Key Milestones',  border: 'border-emerald-200', labelColor: 'text-emerald-700' },
  { key: 'nextSteps'       as const, label: 'Next Steps',      border: 'border-blue-200',    labelColor: 'text-blue-700'    },
  { key: 'learningPoints'  as const, label: 'Learning Points', border: 'border-amber-200',   labelColor: 'text-amber-700'   },
]

export function UpdateDetail({ update }: UpdateDetailProps) {
  const products: Product[] = update.productIds?.length
    ? update.productIds
    : update.productId ? [update.productId] : []

  return (
    <article>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {products.map((p) => (
            <ProductBadge key={p._id} name={p.name} color={p.color} />
          ))}
          <span className="text-slate-300">·</span>
          <time className="text-sm text-slate-400">{formatDate(update.date)}</time>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">{update.title}</h1>
        {update.summary && update.summary !== '<p></p>' && (
          <div
            className="text-base text-slate-500 leading-7 prose prose-base prose-slate max-w-none [&_u]:underline [&_s]:line-through prose-a:text-blue-600 prose-a:underline"
            dangerouslySetInnerHTML={{ __html: update.summary }}
          />
        )}
      </div>

      {update.media?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Media</h2>
          <div className="grid grid-cols-2 gap-2">
            {update.media.map((url, i) =>
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

      <div className="space-y-4">
        {SECTIONS.map((s) => {
          const content = update[s.key]
          if (!content?.trim()) return null
          return (
            <div key={s.key} className={`p-5 bg-white rounded-xl border ${s.border}`}>
              <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${s.labelColor}`}>
                {s.label}
              </h2>
              <div className="prose prose-sm max-w-none text-black [&_*]:text-black [&_p]:leading-[1.5] [&_li]:leading-[1.5] [&_ul]:leading-[1.5] [&_ol]:leading-[1.5]">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </div>
          )
        })}
      </div>
    </article>
  )
}
