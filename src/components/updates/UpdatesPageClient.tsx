'use client'

import { useState, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { SlidersHorizontal, Inbox } from 'lucide-react'
import { formatMonthYear } from '@/lib/utils'
import { SocialUpdateCard } from './SocialUpdateCard'

const DOMAIN_ORDER = [
  'General',
  'Products',
  'Central Solutions',
  'Frontier',
  'Performance',
  'AI Governance',
  'Strategy, Partnerships & Cap Dev',
  'People & Culture',
]

interface UpdateItem {
  _id: string
  title: string
  summary: string
  date: string
  progressUpdates: string
  nextSteps: string
  learningPoints: string
  media: string[]
  isPublished: boolean
  productId?: { _id: string; name: string; color: string; slug: string; domainName?: string }
  productIds?: { _id: string; name: string; color: string; slug: string; domainName?: string }[]
  domains: { _id: string; name: string }[]
  tags: { _id: string; name: string }[]
}

interface UpdatesPageClientProps {
  updates: UpdateItem[]
  commentCounts: Record<string, number>
  domains: { name: string; slug: string }[]
  activeDomain?: string
  products: { name: string; slug: string }[]
  activeProduct?: string
  openComments?: string
}

function groupByMonth(updates: UpdateItem[]): { month: string; items: UpdateItem[] }[] {
  const map = new Map<string, UpdateItem[]>()
  for (const u of updates) {
    const key = formatMonthYear(u.date)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(u)
  }
  return Array.from(map.entries()).map(([month, items]) => ({ month, items }))
}

export function UpdatesPageClient({
  updates,
  commentCounts,
  domains,
  activeDomain,
  products,
  activeProduct,
  openComments,
}: UpdatesPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [filterOpen, setFilterOpen] = useState(false)

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('page')
      for (const [key, val] of Object.entries(updates)) {
        if (val) params.set(key, val)
        else params.delete(key)
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const sortedDomains = [...domains].sort((a, b) => {
    const ai = DOMAIN_ORDER.indexOf(a.name)
    const bi = DOMAIN_ORDER.indexOf(b.name)
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const isFiltered = !!(activeDomain || activeProduct)
  const activeLabel = activeDomain
    ? domains.find((d) => d.slug === activeDomain)?.name
    : activeProduct
    ? products.find((p) => p.slug === activeProduct)?.name
    : null
  const monthGroups = groupByMonth(updates)

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-5xl font-bold text-[#1C1512] mb-2">Internal Updates</h1>
          <p className="text-stone-500 text-sm whitespace-nowrap">
            AEO&apos;s progress: what&apos;s shipped, what&apos;s next and what we&apos;ve learnt along the way
          </p>
        </div>
        <button
          onClick={() => setFilterOpen((o) => !o)}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            isFiltered
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : filterOpen
              ? 'bg-[#1C1512] text-white'
              : 'bg-[#1C1512] text-white hover:opacity-90'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {isFiltered && activeLabel ? `FILTER · ${activeLabel}` : 'FILTER'}
        </button>
      </div>

      {/* Filter bar */}
      {filterOpen && (
        <div className="flex items-end gap-3 mb-6 p-4 bg-[#F2EDE6] border border-[#E8E0D6] rounded-xl">
          {/* Section dropdown */}
          <div className="flex-1">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
              Section
            </label>
            <select
              value={activeDomain ?? ''}
              onChange={(e) => pushParams({ domain: e.target.value || null, product: null })}
              className="w-full px-3 py-2 text-sm border border-[#E8E0D6] rounded-lg bg-card text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300 cursor-pointer"
            >
              <option value="">All sections</option>
              {sortedDomains.map((d) => (
                <option key={d.slug} value={d.slug}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Product dropdown */}
          <div className="flex-1">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
              Product
            </label>
            <select
              value={activeProduct ?? ''}
              onChange={(e) => pushParams({ product: e.target.value || null, domain: null })}
              className="w-full px-3 py-2 text-sm border border-[#E8E0D6] rounded-lg bg-card text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300 cursor-pointer"
            >
              <option value="">All products</option>
              {products.map((p) => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Clear */}
          {isFiltered && (
            <button
              onClick={() => pushParams({ domain: null, product: null })}
              className="px-3 py-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Feed */}
      {updates.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-8 h-8 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-400 text-sm font-medium">No updates found</p>
          <p className="text-stone-300 text-xs mt-1">
            {isFiltered ? 'Try clearing your filters' : 'Published updates will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {monthGroups.map(({ month, items }) => (
            <section key={month}>
              <div className="flex items-center gap-4 mb-4">
                <h2 className="text-base font-bold text-[#1C1512] uppercase tracking-widest flex-shrink-0">
                  {month}
                </h2>
                <div className="flex-1 h-px bg-[#E8E0D6]" />
                <span className="text-xs text-stone-400 flex-shrink-0">
                  {items.length} {items.length === 1 ? 'update' : 'updates'}
                </span>
              </div>
              <div className="space-y-4">
                {items.map((update) => (
                  <SocialUpdateCard
                    key={update._id}
                    update={update}
                    commentCount={commentCounts[update._id] ?? 0}
                    autoOpen={openComments === update._id}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
