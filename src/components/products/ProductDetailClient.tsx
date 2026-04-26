'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import { ExternalLink, Globe, FileText } from 'lucide-react'

const markdownComponents: Components = {
  a: ({ href, children }) => {
    const isInternalUpdates = href?.startsWith('/updates')
    if (isInternalUpdates) return <span className="text-blue-600">{children}</span>
    return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
  },
}

interface TeamMember {
  name: string
  email: string
}


interface UseCase {
  title: string
  content: string
  image?: string
  functionTag?: string
  department?: string
}

interface SimpleProductUpdate {
  title: string
  content: string
  date: string
}

interface ProductDetailProps {
  product: {
    _id: string
    name: string
    slug: string
    description?: string
    shortDescription?: string
    color: string
    logoUrl?: string
    uiScreenshot?: string
    status: 'live' | 'beta' | 'coming_soon'
    websiteUrl?: string
    deckUrl?: string
    productManagers: TeamMember[]
    developers: TeamMember[]
    overviewContent?: string
    vision?: string
    mission?: string
    goals?: string
    highlightStats: { value: string; label: string }[]
    useCases: UseCase[]
    productUpdates: SimpleProductUpdate[]
  }
}

const STATUS_CONFIG = {
  live: { label: 'LIVE', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  beta: { label: 'BETA', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  coming_soon: { label: 'COMING SOON', dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100' },
}

const AVATAR_COLORS = [
  'bg-pink-200 text-pink-800', 'bg-blue-200 text-blue-800',
  'bg-emerald-200 text-emerald-800', 'bg-purple-200 text-purple-800',
  'bg-orange-200 text-orange-800', 'bg-yellow-200 text-yellow-800',
]

function getAvatarColor(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function TeamBox({ title, members, color }: { title: string; members: TeamMember[]; color: string }) {
  if (members.length === 0) return null
  return (
    <div className="border border-slate-200 rounded-xl p-4 flex-1">
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color }}>
        {title}
      </p>
      <div className="space-y-3">
        {members.map((m, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${getAvatarColor(m.email)}`}>
              {getInitials(m.name)}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-800 leading-tight">{m.name}</p>
              <p className="text-xs text-slate-400 leading-tight">{m.email}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function UseCaseModal({ useCase, onClose }: { useCase: UseCase; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {useCase.image && (
          <div className="relative h-48 overflow-hidden rounded-t-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={useCase.image} alt={useCase.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              {useCase.functionTag && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 mb-1">{useCase.functionTag}</p>
              )}
              <h2 className="text-lg font-bold text-slate-900">{useCase.title}</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-4 flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="prose prose-sm max-w-none text-slate-600 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:leading-relaxed">
            <ReactMarkdown components={markdownComponents}>{useCase.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProductDetailClient({ product }: ProductDetailProps) {
  const [tab, setTab] = useState<'overview' | 'usecases' | 'updates'>('overview')
  const [openUseCase, setOpenUseCase] = useState<UseCase | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const status = STATUS_CONFIG[product.status] || STATUS_CONFIG.live
  const hasTeam = product.productManagers.length > 0 || product.developers.length > 0

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-8">
        <Link href="/products" className="hover:text-slate-600 transition-colors">All products</Link>
        <span>›</span>
        <span className="text-slate-600">{product.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: product.logoUrl ? undefined : product.color }}
        >
          {product.logoUrl ? (
            <Image src={product.logoUrl} alt={product.name} width={56} height={56} className="object-contain w-full h-full" />
          ) : (
            <span className="text-white text-xl font-bold">{product.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
          {product.shortDescription && (
            <p className="text-sm text-slate-500 leading-relaxed mb-3 max-w-2xl">{product.shortDescription}</p>
          )}
          {(product.websiteUrl || product.deckUrl) && (
            <div className="flex items-center gap-2">
              {product.websiteUrl && (
                <a
                  href={product.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-900 bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Visit website
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}
              {product.deckUrl && (
                <a
                  href={product.deckUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:border-slate-300 hover:text-slate-900 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  View deck
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Team */}
      {hasTeam && (
        <div className="flex gap-4 mb-8">
          <TeamBox title="Product Managers" members={product.productManagers} color={product.color} />
          <TeamBox title="Developers" members={product.developers} color={product.color} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-8">
        {(['overview', 'usecases', 'updates'] as const).map((t) => {
          const labels = { overview: 'Overview', usecases: 'Use cases', updates: 'Updates' }
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {labels[t]}
            </button>
          )
        })}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="max-w-3xl">
          {product.highlightStats.length > 0 && (
            <div className="flex justify-end mb-6">
              <div className="border border-slate-200 rounded-xl p-4 w-52 flex-shrink-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Highlights</p>
                <div className="space-y-3">
                  {product.highlightStats.map((s, i) => (
                    <div key={i}>
                      <p className="text-xl font-bold text-slate-900">{s.value}</p>
                      <p className="text-xs text-slate-500">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {product.uiScreenshot && (
            <div className="rounded-xl overflow-hidden border border-slate-200 mb-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.uiScreenshot} alt={`${product.name} UI`} className="w-full object-cover" />
            </div>
          )}

          {product.overviewContent ? (
            <div
              className="prose prose-sm max-w-none text-slate-600 [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:uppercase [&_h2]:tracking-wider [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:leading-relaxed [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-700 [&_p]:leading-relaxed [&_h2]:[color:var(--product-color)]"
              style={{ '--product-color': product.color } as React.CSSProperties}
            >
              <ReactMarkdown components={markdownComponents}>{product.overviewContent}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-8 text-center">No overview content yet.</p>
          )}
        </div>
      )}

      {/* Use cases tab */}
      {tab === 'usecases' && (() => {
        const allTags = Array.from(new Set(product.useCases.map((uc) => uc.functionTag).filter(Boolean))) as string[]
        const filtered = activeTag ? product.useCases.filter((uc) => uc.functionTag === activeTag) : product.useCases
        return (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Learn how others are using the platform
              </p>
              <span className="text-xs text-slate-400">
                {product.useCases.length} {product.useCases.length === 1 ? 'story' : 'stories'}
              </span>
            </div>

            {/* Tag filter pills */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setActiveTag(null)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeTag === null
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      activeTag === tag
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {product.useCases.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No use cases yet.</p>
            ) : (
              <div className="space-y-4">
                {filtered.map((uc, i) => (
                  <button
                    key={i}
                    onClick={() => setOpenUseCase(uc)}
                    className="w-full text-left border border-slate-200 rounded-xl p-5 bg-card hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      {uc.department ? (
                        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: product.color }}>
                          {uc.department}
                        </p>
                      ) : <span />}
                      {uc.functionTag && (
                        <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-md border border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                          {uc.functionTag}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1.5 leading-snug">{uc.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                      {uc.content.replace(/[#*`[\]]/g, '').slice(0, 200)}
                    </p>
                    <p className="text-xs text-slate-400 mt-3">More details</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* Updates tab */}
      {tab === 'updates' && (
        <div>
          {product.productUpdates.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No updates published yet.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
              <div className="space-y-10">
                {product.productUpdates.map((update, idx) => (
                  <div key={idx} className="flex gap-5">
                    <div className="flex-shrink-0 w-4 flex flex-col items-center pt-1">
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-background ring-2 z-10" style={{ backgroundColor: product.color }} />
                    </div>
                    <div className="flex-1 min-w-0 pb-2">
                      <div className="mb-2">
                        <h3 className="text-sm font-bold uppercase tracking-wide leading-snug" style={{ color: product.color }}>
                          {update.title}
                        </h3>
                      </div>
                      <div className="prose prose-sm max-w-none text-slate-600 [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:uppercase [&_h2]:tracking-wider [&_h2]:text-slate-500 [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-800 [&_h3]:mt-3 [&_h3]:mb-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-0.5 [&_p]:leading-relaxed [&_li]:leading-relaxed [&_strong]:font-semibold [&_em]:italic [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-500">
                        <ReactMarkdown components={markdownComponents}>{update.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Use case modal */}
      {openUseCase && (
        <UseCaseModal useCase={openUseCase} onClose={() => setOpenUseCase(null)} />
      )}
    </>
  )
}
