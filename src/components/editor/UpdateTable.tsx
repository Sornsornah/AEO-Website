'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { formatDateShort } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ProductBadge } from '@/components/updates/ProductBadge'

interface Product {
  _id: string
  name: string
  color: string
  domainName?: string
}

interface UpdateRow {
  _id: string
  title: string
  summary: string
  date: string
  isPublished: boolean
  productId: Product
}

interface UpdateTableProps {
  updates: UpdateRow[]
  hasFilters?: boolean
  totalCount?: number
  currentPage?: number
  pageSize?: number
}

export function UpdateTable({ updates, hasFilters = false, totalCount = 0, currentPage = 1, pageSize = 20 }: UpdateTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const changePage = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) {
      params.delete('page')
    } else {
      params.set('page', String(page))
    }
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/updates/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      } else {
        alert('Failed to delete update.')
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (updates.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl mt-6">
        {hasFilters ? (
          <p className="text-slate-400 text-sm">No updates match your filters.</p>
        ) : (
          <>
            <p className="text-slate-400 text-sm mb-3">No updates yet.</p>
            <Link href="/editor/new">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Create your first update
              </Button>
            </Link>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="mt-6">
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Date</TableHead>
            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</TableHead>
            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Domain</TableHead>
            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-36">Product</TableHead>
            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Status</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {updates.map((update) => (
            <TableRow key={update._id} className="hover:bg-slate-50/50">
              <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                {formatDateShort(update.date)}
              </TableCell>
              <TableCell>
                <div>
                  <p className="text-sm font-medium text-slate-900 line-clamp-1">{update.title}</p>
                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{update.summary}</p>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-slate-500">
                  {update.productId?.domainName || <span className="text-slate-300">—</span>}
                </span>
              </TableCell>
              <TableCell>
                {update.productId && (
                  <ProductBadge
                    name={update.productId.name}
                    color={update.productId.color}
                    size="sm"
                  />
                )}
              </TableCell>
              <TableCell>
                {update.isPublished ? (
                  <Badge className="bg-green-50 text-green-700 border-green-100 text-xs hover:bg-green-50">
                    Published
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Draft</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Link href={`/editor/${update._id}`}>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-500">
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(update._id, update.title)}
                    disabled={deletingId === update._id}
                    className="h-7 px-2 text-xs text-slate-400 hover:text-red-600"
                  >
                    {deletingId === update._id ? '...' : 'Delete'}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

      {totalCount > pageSize && (
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
  )
}
