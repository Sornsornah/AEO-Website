'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { SlidersHorizontal, Inbox, ChevronDown } from 'lucide-react'
import { formatMonthYear } from '@/lib/utils'
import { compareDomainsByOrder } from '@/features/updates/lib/domain-order'
import { SocialUpdateCard } from './social-update-card'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface FilterOption {
  name: string
  slug: string
}

function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
  onToggleAll,
}: {
  label: string
  options: FilterOption[]
  selected: string[]
  onToggle: (slug: string) => void
  onToggleAll: () => void
}) {
  const allSelected = options.length > 0 && selected.length === options.length
  const summary =
    selected.length === 0
      ? '-'
      : allSelected
      ? `All ${label.toLowerCase()}s`
      : selected.length === 1
      ? options.find((o) => o.slug === selected[0])?.name ?? '1 selected'
      : `${selected.length} selected`

  return (
    <div className="flex-1 min-w-0">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
        {label}
      </label>
      <DropdownMenu>
        <DropdownMenuTrigger className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border border-[#E8E0D6] rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-stone-300 cursor-pointer data-[state=open]:ring-2 data-[state=open]:ring-stone-300">
          <span className={`truncate ${selected.length ? 'text-stone-700' : 'text-stone-400'}`}>{summary}</span>
          <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-48 max-h-72 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-stone-400">None available</div>
          ) : (
            <>
              <DropdownMenuCheckboxItem
                checked={allSelected}
                onCheckedChange={onToggleAll}
                onSelect={(e) => e.preventDefault()}
                className="font-medium"
              >
                All {label.toLowerCase()}s
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {options.map((o) => (
                <DropdownMenuCheckboxItem
                  key={o.slug}
                  checked={selected.includes(o.slug)}
                  onCheckedChange={() => onToggle(o.slug)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {o.name}
                </DropdownMenuCheckboxItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}


interface UpdateItem {
  _id: string
  title: string
  summary: string
  date: string
  order?: number
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
  domains: FilterOption[]
  activeDomains: string[]
  products: FilterOption[]
  activeProducts: string[]
  tags: FilterOption[]
  activeTags: string[]
  openComments?: string
}

function groupByMonth(updates: UpdateItem[]): { month: string; items: UpdateItem[] }[] {
  const map = new Map<string, UpdateItem[]>()
  for (const u of updates) {
    const key = formatMonthYear(u.date)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(u)
  }
  return Array.from(map.entries()).map(([month, items]) => ({
    month,
    items: [...items].sort(
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) ||
        new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
  }))
}

export function UpdatesPageClient({
  updates,
  commentCounts,
  domains,
  activeDomains,
  products,
  activeProducts,
  tags,
  activeTags,
  openComments,
}: UpdatesPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [filterOpen, setFilterOpen] = useState(false)
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())

  // Pending (unapplied) selections — only written to the URL when the user
  // clicks "Apply filters", so toggling checkboxes doesn't trigger a refetch.
  const [pendingDomains, setPendingDomains] = useState<string[]>(activeDomains)
  const [pendingProducts, setPendingProducts] = useState<string[]>(activeProducts)
  const [pendingTags, setPendingTags] = useState<string[]>(activeTags)

  // Re-sync pending state with the applied URL params (after Apply / Clear / nav).
  useEffect(() => {
    setPendingDomains(activeDomains)
    setPendingProducts(activeProducts)
    setPendingTags(activeTags)
  }, [activeDomains.join(','), activeProducts.join(','), activeTags.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMonth = useCallback((month: string) => {
    setCollapsedMonths((prev) => {
      const next = new Set(prev)
      if (next.has(month)) next.delete(month)
      else next.add(month)
      return next
    })
  }, [])

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

  const sortedDomains = [...domains].sort(compareDomainsByOrder)
  const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name))
  const sortedTags = [...tags].sort((a, b) => a.name.localeCompare(b.name))

  const toggleValue = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string[]>>, slug: string) => {
      setter((current) =>
        current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]
      )
    },
    []
  )

  // Section (domain) and Product/Tag are mutually exclusive filter groups:
  // selecting in one group clears the other.
  const toggleSection = useCallback(
    (slug: string) => {
      toggleValue(setPendingDomains, slug)
      setPendingProducts([])
      setPendingTags([])
    },
    [toggleValue]
  )

  const toggleAllSections = useCallback(() => {
    setPendingDomains((cur) =>
      cur.length === sortedDomains.length ? [] : sortedDomains.map((d) => d.slug)
    )
    setPendingProducts([])
    setPendingTags([])
  }, [sortedDomains])

  const toggleProduct = useCallback(
    (slug: string) => {
      toggleValue(setPendingProducts, slug)
      setPendingDomains([])
    },
    [toggleValue]
  )

  const toggleAllProducts = useCallback(() => {
    setPendingProducts((cur) => (cur.length === products.length ? [] : products.map((p) => p.slug)))
    setPendingDomains([])
  }, [products])

  const toggleTag = useCallback(
    (slug: string) => {
      toggleValue(setPendingTags, slug)
      setPendingDomains([])
    },
    [toggleValue]
  )

  const toggleAllTags = useCallback(() => {
    setPendingTags((cur) => (cur.length === tags.length ? [] : tags.map((t) => t.slug)))
    setPendingDomains([])
  }, [tags])

  const applyFilters = useCallback(() => {
    pushParams({
      domain: pendingDomains.length ? pendingDomains.join(',') : null,
      product: pendingProducts.length ? pendingProducts.join(',') : null,
      tag: pendingTags.length ? pendingTags.join(',') : null,
    })
  }, [pushParams, pendingDomains, pendingProducts, pendingTags])

  const clearFilters = useCallback(() => {
    setPendingDomains([])
    setPendingProducts([])
    setPendingTags([])
    pushParams({ domain: null, product: null, tag: null })
  }, [pushParams])

  // Applied (URL) selections drive the header label and Clear visibility.
  const appliedNames = [
    ...activeDomains.map((s) => domains.find((d) => d.slug === s)?.name),
    ...activeProducts.map((s) => products.find((p) => p.slug === s)?.name),
    ...activeTags.map((s) => tags.find((t) => t.slug === s)?.name),
  ].filter(Boolean) as string[]
  const isFiltered = appliedNames.length > 0
  const activeLabel =
    appliedNames.length === 1
      ? appliedNames[0]
      : appliedNames.length > 1
      ? `${appliedNames.length} filters`
      : null

  // Has the pending selection diverged from what's applied?
  const isDirty =
    pendingDomains.join(',') !== activeDomains.join(',') ||
    pendingProducts.join(',') !== activeProducts.join(',') ||
    pendingTags.join(',') !== activeTags.join(',')
  const hasPending = pendingDomains.length + pendingProducts.length + pendingTags.length > 0

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
              ? 'bg-orange-600 text-white hover:bg-orange-700'
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
          <FilterDropdown
            label="Section"
            options={sortedDomains}
            selected={pendingDomains}
            onToggle={toggleSection}
            onToggleAll={toggleAllSections}
          />
          <FilterDropdown
            label="Product"
            options={sortedProducts}
            selected={pendingProducts}
            onToggle={toggleProduct}
            onToggleAll={toggleAllProducts}
          />
          <FilterDropdown
            label="Tag"
            options={sortedTags}
            selected={pendingTags}
            onToggle={toggleTag}
            onToggleAll={toggleAllTags}
          />

          {/* Apply */}
          <button
            onClick={applyFilters}
            disabled={!isDirty}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-orange-600 text-white transition-colors hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            Apply filters
          </button>

          {/* Clear */}
          {(isFiltered || hasPending) && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-stone-500 hover:text-stone-700 transition-colors flex-shrink-0"
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
          {monthGroups.map(({ month, items }) => {
            const isCollapsed = collapsedMonths.has(month)
            return (
              <section key={month}>
                <button
                  type="button"
                  onClick={() => toggleMonth(month)}
                  aria-expanded={!isCollapsed}
                  aria-controls={`month-${month.replace(/\s+/g, '-')}`}
                  className="w-full flex items-center gap-4 mb-4 group text-left"
                >
                  <ChevronDown
                    className={`w-6 h-6 text-stone-400 transition-transform duration-200 flex-shrink-0 ${
                      isCollapsed ? '-rotate-90' : ''
                    }`}
                  />
                  <h2 className="text-4xl font-bold text-[#1C1512] flex-shrink-0 group-hover:text-stone-700 transition-colors">
                    {month}
                  </h2>
                  <div className="flex-1 h-px bg-[#E8E0D6]" />
                  <span className="text-xs text-stone-400 flex-shrink-0">
                    {items.length} {items.length === 1 ? 'update' : 'updates'}
                  </span>
                </button>
                {!isCollapsed && (
                  <div
                    id={`month-${month.replace(/\s+/g, '-')}`}
                    className="space-y-4 ml-10"
                  >
                    {items.map((update) => (
                      <SocialUpdateCard
                        key={update._id}
                        update={update}
                        commentCount={commentCounts[update._id] ?? 0}
                        autoOpen={openComments === update._id}
                      />
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
