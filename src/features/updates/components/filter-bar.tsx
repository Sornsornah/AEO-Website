'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useState, useEffect } from 'react'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface Product {
  _id: string
  name: string
  slug: string
  color: string
}

interface DomainGroup {
  _id: string
  name: string
  slug: string
  products: Product[]
}

interface DomainOption {
  _id: string
  name: string
  slug: string
}

interface FilterBarProps {
  domains: DomainGroup[]
  allDomains: DomainOption[]
  availableYears: number[]
  currentSearch?: string
  showStatus?: boolean
}

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

export function FilterBar({ domains, allDomains, availableYears, currentSearch = '', showStatus = false }: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentProduct = searchParams.get('product') || ''
  const currentDomain = searchParams.get('domain') || ''
  const currentYear = searchParams.get('year') || ''
  const currentMonth = searchParams.get('month') || ''
  const currentSort = searchParams.get('sort') || 'desc'
  const currentStatus = searchParams.get('status') || ''
  const currentId = searchParams.get('id') || ''

  const [searchInput, setSearchInput] = useState(currentSearch)

  // Sync local input if URL changes externally
  useEffect(() => {
    setSearchInput(currentSearch)
  }, [currentSearch])

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      })
      params.delete('page')
      if (currentId) params.set('id', currentId)
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams, currentId]
  )

  const clearFilters = () => {
    setSearchInput('')
    const params = new URLSearchParams()
    if (currentId) params.set('id', currentId)
    router.push(`${pathname}${params.toString() ? '?' + params.toString() : ''}`)
  }

  const hasFilters = currentProduct || currentDomain || currentYear || currentMonth || currentSearch || (showStatus && currentStatus)

  return (
    <div className="flex flex-wrap items-end gap-4 pb-6 border-b border-slate-100">
      {/* Search */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Search</Label>
        <Input
          type="text"
          placeholder="Search updates..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') updateParams({ search: searchInput })
          }}
          onBlur={() => {
            if (searchInput !== currentSearch) updateParams({ search: searchInput })
          }}
          className="w-52 h-9 text-sm"
        />
      </div>

      {/* Section */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Section</Label>
        <Select
          value={currentDomain || 'all'}
          onValueChange={(val) => updateParams({ domain: val === 'all' ? '' : val, product: '' })}
        >
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="All sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sections</SelectItem>
            {allDomains.map((d) => (
              <SelectItem key={d._id} value={d.slug}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Product</Label>
        <Select
          value={currentProduct || 'all'}
          onValueChange={(val) => updateParams({ product: val === 'all' ? '' : val })}
        >
          <SelectTrigger className="w-48 h-9 text-sm">
            <SelectValue placeholder="All products" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            {domains.map((domain) => (
              <SelectGroup key={domain._id}>
                <SelectLabel className="text-xs text-slate-400 font-medium py-1 pl-3 pr-2">
                  {domain.name}
                </SelectLabel>
                {domain.products.map((p) => (
                  <SelectItem key={p._id} value={p.slug}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Year */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Year</Label>
        <Select
          value={currentYear || 'all'}
          onValueChange={(val) => updateParams({ year: val === 'all' ? '' : val, month: '' })}
        >
          <SelectTrigger className="w-28 h-9 text-sm">
            <SelectValue placeholder="All years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {availableYears.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Month */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Month</Label>
        <Select
          value={currentMonth || 'all'}
          onValueChange={(val) => updateParams({ month: val === 'all' ? '' : val })}
          disabled={!currentYear}
        >
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      {showStatus && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Status</Label>
          <Select
            value={currentStatus || 'all'}
            onValueChange={(val) => updateParams({ status: val === 'all' ? '' : val })}
          >
            <SelectTrigger className="w-32 h-9 text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Sort */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Sort</Label>
        <Select
          value={currentSort}
          onValueChange={(val) => updateParams({ sort: val })}
        >
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Newest first</SelectItem>
            <SelectItem value="asc">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 text-slate-500 hover:text-slate-900 text-sm"
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}
