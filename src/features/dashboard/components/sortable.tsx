'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type SortDir = 'asc' | 'desc'
export interface SortState<K extends string> {
  key: K
  dir: SortDir
}

/** Sorts rows by the active key/direction. Strings sort alphabetically, numbers numerically. */
export function useSort<T, K extends string & keyof T>(
  rows: T[],
  initial: SortState<K>
) {
  const [sort, setSort] = useState<SortState<K>>(initial)

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      if (typeof av === 'string' && typeof bv === 'string') {
        return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      const an = Number(av)
      const bn = Number(bv)
      return sort.dir === 'asc' ? an - bn : bn - an
    })
    return copy
  }, [rows, sort])

  // Numeric columns default to "most first" (desc); text columns to A→Z (asc).
  function toggle(key: K, defaultDir: SortDir = 'desc') {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: defaultDir }))
  }

  return { sorted, sort, toggle }
}

interface SortHeadProps<K extends string> {
  label: string
  sortKey: K
  sort: SortState<K>
  onToggle: (key: K, defaultDir?: SortDir) => void
  align?: 'left' | 'right'
  defaultDir?: SortDir
  className?: string
}

export function SortHead<K extends string>({
  label,
  sortKey,
  sort,
  onToggle,
  align = 'right',
  defaultDir = 'desc',
  className,
}: SortHeadProps<K>) {
  const active = sort.key === sortKey
  const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <TableHead className={cn(align === 'right' ? 'text-right' : 'text-left', className)}>
      <button
        type="button"
        onClick={() => onToggle(sortKey, defaultDir)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-slate-900 transition-colors',
          align === 'right' && 'flex-row-reverse',
          active ? 'text-slate-900' : 'text-slate-500'
        )}
        title={`Sort by ${label}`}
      >
        {label}
        <Icon className={cn('w-3.5 h-3.5', active ? 'opacity-100' : 'opacity-40')} />
      </button>
    </TableHead>
  )
}
