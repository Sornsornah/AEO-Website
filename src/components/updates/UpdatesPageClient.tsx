'use client'

import { useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { UpdateCard } from './UpdateCard'
import { UpdatePanel } from './UpdatePanel'

interface UpdateItem {
  _id: string
  title: string
  summary: string
  date: string
  highlights: string[]
  isPublished: boolean
  productId: { _id: string; name: string; color: string; slug: string }
}

interface SelectedUpdate extends UpdateItem {
  content: string
}

interface UpdatesPageClientProps {
  updates: UpdateItem[]
  selectedUpdate: SelectedUpdate | null
  savedIds: string[]
  hasFilters: boolean
  currentView: string
  unseenCount: number
  savedCount: number
  totalCount: number
  currentPage: number
  pageSize: number
}

export function UpdatesPageClient({ updates, selectedUpdate, savedIds, hasFilters, currentView, unseenCount, savedCount, totalCount, currentPage, pageSize }: UpdatesPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const savedSet = new Set(savedIds)

  const clearFiltersInView = useCallback(() => {
    const params = new URLSearchParams()
    if (currentView !== 'all') params.set('view', currentView)
    router.push(`${pathname}${params.toString() ? '?' + params.toString() : ''}`)
  }, [router, pathname, currentView])

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

  const handleSelect = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('id', id)
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const handleClose = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('id')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [router, pathname, searchParams])

  const changePage = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) {
      params.delete('page')
    } else {
      params.set('page', String(page))
    }
    params.delete('id')
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  // Escape key closes panel
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && selectedUpdate) {
        handleClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedUpdate, handleClose])

  const panelOpen = !!selectedUpdate

  return (
    <div>
      {/* View tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-slate-100 pb-0">
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

    <div className={`flex gap-0 mt-2 transition-all duration-200`}>
      {/* List column */}
      <div className={panelOpen ? 'flex-1 min-w-0' : 'w-full'}>
        {updates.length === 0 ? (
          <div className="text-center py-16">
            {currentView === 'new' ? (
              hasFilters ? (
                <>
                  <p className="text-slate-400 text-sm">No unseen updates match your filters.</p>
                  <button
                    onClick={clearFiltersInView}
                    className="text-blue-600 text-sm mt-2 inline-block hover:underline"
                  >
                    Clear filters
                  </button>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-slate-400">
                      <path d="M10 2a8 8 0 100 16A8 8 0 0010 2z" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="text-slate-700 font-medium mb-1">You&apos;re all caught up</p>
                  <p className="text-slate-400 text-sm">You&apos;ve seen all the latest updates.</p>
                </>
              )
            ) : currentView === 'saved' ? (
              hasFilters ? (
                <>
                  <p className="text-slate-400 text-sm">No saved updates match your filters.</p>
                  <button
                    onClick={clearFiltersInView}
                    className="text-blue-600 text-sm mt-2 inline-block hover:underline"
                  >
                    Clear filters
                  </button>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-slate-400">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="text-slate-700 font-medium mb-1">No saved updates</p>
                  <p className="text-slate-400 text-sm">Bookmark updates to find them here.</p>
                </>
              )
            ) : (
              <>
                <p className="text-slate-400 text-sm">
                  {hasFilters ? 'No updates match your filters.' : 'No updates yet.'}
                </p>
                {hasFilters && (
                  <a href="/updates" className="text-blue-600 text-sm mt-2 inline-block hover:underline">
                    Clear filters
                  </a>
                )}
              </>
            )}
          </div>
        ) : (
          updates.map((update) => (
            <UpdateCard
              key={update._id}
              update={update}
              isSaved={savedSet.has(update._id)}
              onSelect={handleSelect}
            />
          ))
        )}

        {/* Pagination */}
        {currentView !== 'new' && totalCount > pageSize && (
          <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-2">
            <button
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Previous
            </button>
            <span className="text-sm text-slate-400">
              {Math.min((currentPage - 1) * pageSize + 1, totalCount)}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
            </span>
            <button
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage * pageSize >= totalCount}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Side panel */}
      {panelOpen && selectedUpdate && (
        <UpdatePanel
          update={selectedUpdate}
          isSaved={savedSet.has(selectedUpdate._id)}
          onClose={handleClose}
        />
      )}
    </div>
    </div>
  )
}
