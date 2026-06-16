'use client'

import { useEffect, useRef, useState } from 'react'
import { CommentButton } from './comment-button'
import { CommentSidePanel } from './comment-side-panel'
import ReactMarkdown from 'react-markdown'

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
    progressUpdates: string
    nextSteps: string
    learningPoints: string
    media: string[]
    productId?: Product
    productIds?: Product[]
    isPublished?: boolean
    domains: { _id: string; name: string }[]
    tags: { _id: string; name: string }[]
  }
  commentCount?: number
  autoOpen?: boolean
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov)$/i.test(url)
}

const SECTIONS = [
  { key: 'progressUpdates' as const, label: 'Key Milestones',  bg: 'bg-emerald-150', labelColor: 'text-emerald-800' },
  { key: 'nextSteps'       as const, label: 'Next Steps',      bg: 'bg-blue-150',    labelColor: 'text-blue-800'    },
  { key: 'learningPoints'  as const, label: 'Learning Points', bg: 'bg-amber-150',   labelColor: 'text-amber-800'   },
]


export function SocialUpdateCard({ update, commentCount = 0, autoOpen = false }: SocialUpdateCardProps) {
  const products: Product[] = update.productIds?.length
    ? update.productIds
    : update.productId?._id ? [update.productId] : []
  const [commentPanelOpen, setCommentPanelOpen] = useState(autoOpen)
  const [liveCount, setLiveCount] = useState(commentCount)
  const cardRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (autoOpen && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [autoOpen])

  useEffect(() => {
    function handleOpen(e: Event) {
      const detail = (e as CustomEvent<{ updateId: string }>).detail
      if (detail?.updateId === update._id) {
        setCommentPanelOpen(true)
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
    window.addEventListener('openUpdateComments', handleOpen)
    return () => window.removeEventListener('openUpdateComments', handleOpen)
  }, [update._id])

  const hasTags = update.domains.length > 0 || products.length > 0 || update.tags.length > 0

  return (
    <>
      <article ref={cardRef} className="bg-card border border-slate-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
        {/* Bubble tags: domains + product + tags — above title */}
        {hasTags && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {update.domains.map((d) => (
              <span
                key={d._id}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700"
              >
                {d.name}
              </span>
            ))}
            {products.map((p) => (
              <span key={p._id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                {p.name}
              </span>
            ))}
            {update.tags.map((t) => (
              <span
                key={t._id}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700"
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
        {update.summary && update.summary !== '<p></p>' && (
          <div
            className="text-sm text-slate-500 leading-relaxed mb-3 prose prose-sm prose-slate max-w-none prose-a:text-blue-600 prose-a:underline [&_u]:underline [&_s]:line-through"
            dangerouslySetInnerHTML={{ __html: update.summary }}
          />
        )}

        {/* Structured sections */}
        <div className="space-y-2 mb-3">
          {SECTIONS.map((s) => {
            const content = update[s.key]
            if (!content?.trim()) return null
            return (
              <div key={s.key} className={`rounded-lg px-3 py-2.5 ${s.bg}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${s.labelColor}`}>
                  {s.label}
                </p>
                <div className="prose prose-xs max-w-none text-black leading-snug [&_ul]:my-0 [&_ol]:my-0 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol_ol]:list-[lower-alpha] [&_p]:mb-0.5 [&_li]:mb-0 [&_li]:mt-0 [&_p]:text-black [&_li]:text-black [&_*]:text-black">
                  <ReactMarkdown>{content}</ReactMarkdown>
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
