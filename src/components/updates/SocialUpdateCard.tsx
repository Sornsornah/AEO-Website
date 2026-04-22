'use client'

import { useState } from 'react'
import { CommentButton } from './CommentButton'
import { CommentSidePanel } from './CommentSidePanel'

interface Product {
  _id: string
  name: string
  color: string
  slug: string
  domainName?: string
}

interface SocialUpdateCardProps {
  update: {
    _id: string
    title: string
    summary: string
    date: string | Date
    progressUpdates: string | string[]
    nextSteps: string | string[]
    learningPoints: string | string[]
    media: string[]
    productId: Product
    isPublished?: boolean
    domains: { _id: string; name: string }[]
    tags: { _id: string; name: string }[]
  }
  commentCount?: number
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov)$/i.test(url)
}

const SECTIONS = [
  { key: 'progressUpdates' as const, label: 'Key Milestones',  bg: 'bg-emerald-50', labelColor: 'text-emerald-700' },
  { key: 'nextSteps'       as const, label: 'Next Steps',      bg: 'bg-blue-50',    labelColor: 'text-blue-700'    },
  { key: 'learningPoints'  as const, label: 'Learning Points', bg: 'bg-amber-50',   labelColor: 'text-amber-700'   },
]

function renderItems(val: string | string[]) {
  const items: { text: string; sub: string[] }[] = []
  if (Array.isArray(val)) {
    val.forEach((text) => items.push({ text, sub: [] }))
  } else {
    for (const line of val.split('\n')) {
      const subMatch = line.match(/^[ \t]{2,}[-*•]\s+(.+)/)
      const mainMatch = line.match(/^[-*•]\s+(.+)/)
      if (subMatch && items.length > 0) {
        items[items.length - 1].sub.push(subMatch[1])
      } else if (mainMatch) {
        items.push({ text: mainMatch[1], sub: [] })
      } else if (line.trim()) {
        items.push({ text: line.trim(), sub: [] })
      }
    }
  }
  if (items.length === 0) return null
  return (
    <ol className="list-none p-0 m-0 space-y-1">
      {items.map((item, i) => (
        <li key={i} className="leading-relaxed">
          {i + 1}. {item.text}
          {item.sub.length > 0 && (
            <ol className="list-none pl-4 mt-0.5 space-y-0.5">
              {item.sub.map((sub, j) => (
                <li key={j} className="leading-relaxed">{String.fromCharCode(97 + j)}. {sub}</li>
              ))}
            </ol>
          )}
        </li>
      ))}
    </ol>
  )
}

export function SocialUpdateCard({ update, commentCount = 0 }: SocialUpdateCardProps) {
  const product = update.productId
  const hasProduct = !!product?._id
  const [commentPanelOpen, setCommentPanelOpen] = useState(false)
  const [liveCount, setLiveCount] = useState(commentCount)

  const hasTags = update.domains.length > 0 || hasProduct || update.tags.length > 0

  return (
    <>
      <article className="bg-card border border-slate-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
        {/* Bubble tags: domains + product + tags — above title */}
        {hasTags && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {update.domains.map((d) => (
              <span
                key={d._id}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600"
              >
                {d.name}
              </span>
            ))}
            {hasProduct && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: product.color }}
                />
                {product.name}
              </span>
            )}
            {update.tags.map((t) => (
              <span
                key={t._id}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600"
              >
                {t.name}
              </span>
            ))}
          </div>
        )}

        {/* Title + summary */}
        <h2 className="text-base font-semibold text-slate-900 mb-2 leading-snug">
          {update.title}
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-3">
          {update.summary}
        </p>

        {/* Structured sections */}
        <div className="space-y-2 mb-3">
          {SECTIONS.map((s) => {
            const rendered = renderItems(update[s.key] || '')
            if (!rendered) return null
            return (
              <div key={s.key} className={`rounded-lg px-3 py-2.5 ${s.bg}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${s.labelColor}`}>
                  {s.label}
                </p>
                <div className="text-xs text-black leading-relaxed">
                  {rendered}
                </div>
              </div>
            )
          })}
        </div>

        {/* Media thumbnails */}
        {update.media?.length > 0 && (
          <div className="flex gap-1.5 mb-3 overflow-hidden">
            {update.media.slice(0, 4).map((url, i) => (
              <div key={i} className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
                {isVideo(url) ? (
                  <video src={url} className="w-full h-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" className="w-full h-full object-cover" />
                )}
                {i === 3 && update.media.length > 4 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-semibold">
                    +{update.media.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-4 pt-3 border-t border-slate-100">
          <CommentButton
            count={liveCount}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              setCommentPanelOpen(true)
            }}
          />
        </div>
      </article>

      {commentPanelOpen && (
        <CommentSidePanel
          updateId={update._id}
          update={update}
          onClose={() => setCommentPanelOpen(false)}
          onCountChange={setLiveCount}
        />
      )}
    </>
  )
}
