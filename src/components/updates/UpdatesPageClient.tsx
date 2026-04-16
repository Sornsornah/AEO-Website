'use client'

import { useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { formatMonthYear } from '@/lib/utils'
import { SocialUpdateCard } from './SocialUpdateCard'

interface UpdateItem {
  _id: string
  title: string
  summary: string
  date: string
  progressUpdates: string[]
  nextSteps: string[]
  learningPoints: string[]
  media: string[]
  isPublished: boolean
  productId: { _id: string; name: string; color: string; slug: string; domainName?: string }
  domains: { _id: string; name: string }[]
  tags: { _id: string; name: string }[]
}

interface UpdatesPageClientProps {
  updates: UpdateItem[]
  savedIds: string[]
  currentView: string
  unseenCount: number
  savedCount: number
  commentCounts: Record<string, number>
  seenIds: string[]
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

export function UpdatesPageClient({ updates, savedIds, currentView, unseenCount, savedCount, commentCounts, seenIds }: UpdatesPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const savedSet = new Set(savedIds)
  const seenSet = new Set(seenIds)

  const switchView = useCallback(
    (view: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (view === 'all') {
        params.delete('view')
      } else {
        params.set('view', view)
      }
      params.delete('id')
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const monthGroups = groupByMonth(updates)

  return (
    <div>
      {/* View tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-100 pb-0">
        <button
          onClick={() => switchView('all')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            currentView === 'all'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          All Updates
        </button>
        <button
          onClick={() => switchView('new')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            currentView === 'new'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {"What's New"}
          {unseenCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] text-[10px] font-semibold bg-blue-600 text-white rounded-full px-1">
              {unseenCount > 99 ? '99+' : unseenCount}
            </span>
          )}
        </button>
        <button
          onClick={() => switchView('saved')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            currentView === 'saved'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Saved
          {savedCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] text-[10px] font-semibold bg-slate-200 text-slate-600 rounded-full px-1">
              {savedCount > 99 ? '99+' : savedCount}
            </span>
          )}
        </button>
      </div>

      {/* Feed */}
      {updates.length === 0 ? (
        <div className="text-center py-16">
          {currentView === 'new' ? (
            <>
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-slate-400">
                  <path d="M10 2a8 8 0 100 16A8 8 0 0010 2z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-slate-700 font-medium mb-1">{"You're all caught up"}</p>
              <p className="text-slate-400 text-sm">{"You've seen all the latest updates."}</p>
            </>
          ) : currentView === 'saved' ? (
            <>
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-slate-400">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-slate-700 font-medium mb-1">No saved updates</p>
              <p className="text-slate-400 text-sm">Bookmark updates to find them here.</p>
            </>
          ) : (
            <p className="text-slate-400 text-sm">No updates yet.</p>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {monthGroups.map(({ month, items }) => (
            <section key={month}>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                {month}
              </h2>
              <div className="space-y-4">
                {items.map((update) => (
                  <SocialUpdateCard
                    key={update._id}
                    update={update}
                    isNew={!seenSet.has(update._id)}
                    isSaved={savedSet.has(update._id)}
                    commentCount={commentCounts[update._id] ?? 0}
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
