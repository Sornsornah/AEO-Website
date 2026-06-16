'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

export type ProductUserAction = 'product_view' | 'product_visit_website' | 'product_share'

interface ProductUserRow {
  _id: string
  name: string
  email: string
  count: number
  lastAt: string
}

interface ProductUsersResponse {
  users: ProductUserRow[]
  total: number
}

interface ProductUsersModalProps {
  productId: string
  productName: string
  action: ProductUserAction
  actionLabel: string
  range: { from: string; to: string }
  onClose: () => void
}

const dateFmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function ProductUsersModal({
  productId,
  productName,
  action,
  actionLabel,
  range,
  onClose,
}: ProductUsersModalProps) {
  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const { data, isLoading, isError } = useQuery<ProductUsersResponse>({
    queryKey: ['product-users', productId, action, range.from, range.to],
    queryFn: () => {
      const params = new URLSearchParams({ productId, action, from: range.from, to: range.to })
      return fetch(`/api/dashboard/product-users?${params.toString()}`).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      })
    },
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-card shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-stone-100 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-stone-900">{actionLabel}</h3>
            <p className="mt-0.5 text-sm text-stone-500">{productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading && <p className="text-sm text-stone-400">Loading users…</p>}
          {isError && <p className="text-sm text-red-500">Failed to load users. Try again.</p>}
          {data && data.users.length === 0 && (
            <p className="text-sm text-stone-400">
              No registered users in this range. Anonymous visitors aren&rsquo;t listed.
            </p>
          )}
          {data && data.users.length > 0 && (
            <ul className="divide-y divide-stone-100">
              {data.users.map((u) => (
                <li key={u._id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900">{u.name}</p>
                    {u.email && <p className="truncate text-xs text-stone-500">{u.email}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm tabular-nums text-stone-700">{u.count}×</p>
                    <p className="text-xs text-stone-400">{dateFmt.format(new Date(u.lastAt))}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {data && (
          <div className="border-t border-stone-100 px-5 py-3 text-xs text-stone-400">
            {data.total} registered {data.total === 1 ? 'user' : 'users'} — anonymous visitors excluded.
          </div>
        )}
      </div>
    </div>
  )
}
