'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { ExternalLink, Globe, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface TeamMember {
  name: string
  email: string
}

interface ProductUpdate {
  _id: string
  title: string
  summary: string
  date: string
}

interface UseCase {
  title: string
  content: string
  image?: string
  functionTag?: string
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
    highlightStats: { value: string; label: string }[]
    useCases: UseCase[]
  }
  updates: ProductUpdate[]
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
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
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
            <ReactMarkdown>{useCase.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProductDetailClient({ product, updates }: ProductDetailProps) {
  const [tab, setTab] = useState<'overview' | 'usecases' | 'updates'>('overview')
  const [openUseCase, setOpenUseCase] = useState<UseCase | null>(null)

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
          const labels = { overview: 'Overview', usecases: 'Use cases', updates: `Updates (${updates.length})` }
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
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
            <div className="prose prose-sm max-w-none text-slate-600 [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:uppercase [&_h2]:tracking-wider [&_h2]:text-rose-600 [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:leading-relaxed [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-700 [&_p]:leading-relaxed">
              <ReactMarkdown>{product.overviewContent}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-8 text-center">No overview content yet.</p>
          )}
        </div>
      )}

      {/* Use cases tab */}
      {tab === 'usecases' && (
        <div>
          {product.useCases.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No use cases yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {product.useCases.map((uc, i) => (
                <button
                  key={i}
                  onClick={() => setOpenUseCase(uc)}
                  className="text-left border border-slate-200 rounded-xl overflow-hidden bg-white hover:shadow-sm hover:border-slate-300 transition-all"
                >
                  {uc.image && (
                    <div className="h-36 overflow-hidden bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={uc.image} alt={uc.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-4">
                    {uc.functionTag && (
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 mb-1">{uc.functionTag}</p>
                    )}
                    <p className="text-sm font-semibold text-slate-900 mb-1">{uc.title}</p>
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {uc.content.replace(/[#*`\[\]]/g, '').slice(0, 150)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Updates tab */}
      {tab === 'updates' && (
        <div>
          {updates.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No updates published yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {updates.map((update) => (
                <Link
                  key={update._id}
                  href={`/updates/${update._id}`}
                  className="block py-4 group hover:bg-slate-50 -mx-3 px-3 rounded-lg transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {update.title}
                      </p>
                      {update.summary && (
                        <p className="text-sm text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {update.summary}
                        </p>
                      )}
                    </div>
                    <time className="text-xs text-slate-400 flex-shrink-0 mt-0.5">
                      {formatDate(new Date(update.date))}
                    </time>
                  </div>
                </Link>
              ))}
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
