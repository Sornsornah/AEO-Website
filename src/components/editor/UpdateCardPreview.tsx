'use client'

import ReactMarkdown from 'react-markdown'

interface Product {
  _id: string
  name: string
  color: string
}

interface UpdateCardPreviewProps {
  title: string
  summary: string
  progressUpdates: string
  nextSteps: string
  learningPoints: string
  products: Product[]
  domains: { _id: string; name: string }[]
  tags: { _id: string; name: string }[]
}

const SECTIONS = [
  { key: 'progressUpdates' as const, label: 'Key Milestones',  bg: 'bg-emerald-50', labelColor: 'text-emerald-700' },
  { key: 'nextSteps'       as const, label: 'Next Steps',      bg: 'bg-blue-50',    labelColor: 'text-blue-700'    },
  { key: 'learningPoints'  as const, label: 'Learning Points', bg: 'bg-amber-50',   labelColor: 'text-amber-700'   },
]

export function UpdateCardPreview({
  title,
  summary,
  progressUpdates,
  nextSteps,
  learningPoints,
  products,
  domains,
  tags,
}: UpdateCardPreviewProps) {
  const content = { progressUpdates, nextSteps, learningPoints }
  const hasTags = domains.length > 0 || products.length > 0 || tags.length > 0
  const isEmpty = !title && !summary && !progressUpdates && !nextSteps && !learningPoints

  if (isEmpty) {
    return (
      <div className="bg-card border border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px] text-center">
        <p className="text-sm text-slate-400">Your card preview will appear here as you type.</p>
      </div>
    )
  }

  return (
    <article className="bg-card border border-slate-200 rounded-xl p-5">
      {hasTags && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {domains.map((d) => (
            <span key={d._id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              {d.name}
            </span>
          ))}
          {products.map((p) => (
            <span key={p._id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
              {p.name}
            </span>
          ))}
          {tags.map((t) => (
            <span key={t._id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              {t.name}
            </span>
          ))}
        </div>
      )}

      {title && (
        <h2 className="text-base font-semibold text-slate-900 mb-2 leading-snug">{title}</h2>
      )}

      {summary && summary !== '<p></p>' && (
        <div
          className="text-sm text-slate-500 leading-relaxed mb-3 prose prose-sm prose-slate max-w-none prose-a:text-blue-600 prose-a:underline [&_u]:underline [&_s]:line-through"
          dangerouslySetInnerHTML={{ __html: summary }}
        />
      )}

      <div className="space-y-2 mb-3">
        {SECTIONS.map((s) => {
          const val = content[s.key]
          if (!val?.trim()) return null
          return (
            <div key={s.key} className={`rounded-lg px-3 py-2.5 ${s.bg}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${s.labelColor}`}>
                {s.label}
              </p>
              <div className="prose prose-xs max-w-none text-black leading-relaxed [&_ol]:list-decimal [&_ol]:pl-4 [&_ol_ol]:list-[lower-alpha] [&_p]:mb-1 [&_li]:mb-0.5">
                <ReactMarkdown>{val}</ReactMarkdown>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-4 pt-3 border-t border-slate-100">
        <span className="text-xs text-slate-400 italic">Preview — comments hidden</span>
      </div>
    </article>
  )
}
