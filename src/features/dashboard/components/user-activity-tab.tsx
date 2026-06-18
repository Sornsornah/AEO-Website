'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { AnalyticsEventType } from '@/models/AnalyticsEvent'
import { EVENT_META, EVENT_TYPE_ORDER, activityTarget } from '../lib/event-meta'

interface UserOption {
  _id: string
  name?: string
  email: string
  role: string
}

interface ActivityItem {
  _id: string
  type: AnalyticsEventType
  entityType: 'product' | 'blog' | 'update' | null
  entityId: string | null
  entityName: string | null
  category: string | null
  path: string | null
  href: string | null
  createdAt: string
}

interface ActivityResponse {
  user: { _id: string; name: string; email: string; role: string }
  range: { from: string; to: string }
  total: number
  hasMore: boolean
  activity: ActivityItem[]
}

function describe(item: ActivityItem): { verb: string; target: string | null } {
  const target = activityTarget(item)
  return { verb: EVENT_META[item.type].verb, target: target || null }
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

const PAGE_SIZE = 200

export function UserActivityTab({ range }: { range: { from: string; to: string } }) {
  const [selected, setSelected] = useState<UserOption | null>(null)

  const { data: users, isLoading: usersLoading } = useQuery<UserOption[]>({
    queryKey: ['dashboard-users'],
    queryFn: () =>
      fetch('/api/admin/users').then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      }),
  })

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<ActivityResponse>({
      queryKey: ['user-activity', selected?._id, range.from, range.to],
      enabled: !!selected,
      initialPageParam: 0,
      queryFn: ({ pageParam }) =>
        fetch(
          `/api/dashboard/user-activity?userId=${selected!._id}&from=${range.from}&to=${range.to}&limit=${PAGE_SIZE}&skip=${pageParam}`
        ).then((r) => {
          if (!r.ok) throw new Error(`${r.status}`)
          return r.json()
        }),
      getNextPageParam: (lastPage, allPages) =>
        lastPage.hasMore ? allPages.length * PAGE_SIZE : undefined,
    })

  // Flatten loaded pages, newest first.
  const activity = useMemo(() => data?.pages.flatMap((p) => p.activity) ?? [], [data])

  // Group activity by calendar day for the timeline.
  const grouped = useMemo(() => {
    const map = new Map<string, ActivityItem[]>()
    for (const item of activity) {
      const day = dayFmt.format(new Date(item.createdAt))
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(item)
    }
    return [...map.entries()]
  }, [activity])

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <CardTitle>User activity</CardTitle>
              <EventLegend />
            </div>
            <CardDescription>
              Select a user to see every page they accessed, content they viewed, and actions they
              took — newest first, within the selected date range.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <UserPicker
            users={users ?? []}
            loading={usersLoading}
            selected={selected}
            onSelect={setSelected}
          />

          {!selected && (
            <p className="py-8 text-center text-sm text-stone-400">
              Choose a user above to view their activity.
            </p>
          )}

          {selected && isLoading && <p className="text-sm text-stone-400">Loading activity…</p>}
          {selected && isError && (
            <p className="text-sm text-red-500">Failed to load activity. Try again.</p>
          )}

          {selected && data && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-500">
                <span>
                  <span className="font-medium text-stone-900">{activity.length}</span> events
                  {hasNextPage && <span className="text-stone-400"> loaded (more available)</span>}
                </span>
              </div>

              {grouped.length === 0 && (
                <p className="py-8 text-center text-sm text-stone-400">
                  No activity for this user in the selected range.
                </p>
              )}

              {grouped.map(([day, items]) => (
                <div key={day} className="space-y-2">
                  <h4 className="sticky top-0 z-10 bg-card py-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
                    {day}
                  </h4>
                  <ul className="space-y-1">
                    {items.map((item) => {
                      const meta = EVENT_META[item.type]
                      const { verb, target } = describe(item)
                      return (
                        <li
                          key={item._id}
                          className="flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-stone-50"
                        >
                          <span
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: meta.color }}
                            aria-hidden
                          />
                          <span className="w-20 shrink-0 pt-0.5 font-mono text-xs text-stone-400">
                            {timeFmt.format(new Date(item.createdAt))}
                          </span>
                          <span className="flex-1 text-sm text-stone-700">
                            {verb}{' '}
                            {target != null &&
                              (item.href ? (
                                <a
                                  href={item.href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-medium text-stone-900 underline-offset-2 hover:underline"
                                >
                                  {target}
                                </a>
                              ) : (
                                <span className="font-medium text-stone-900">{target}</span>
                              ))}
                          </span>
                          <span
                            className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                            style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
                          >
                            {meta.label}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}

              {hasNextPage && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

/**
 * Click-to-open info popover that defines every activity event type, sourced
 * from EVENT_META so it never drifts from the timeline badges.
 */
function EventLegend() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="What do the event types mean?"
        aria-expanded={open}
        className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors ${
          open
            ? 'border-stone-400 bg-stone-100 text-stone-700'
            : 'border-stone-300 text-stone-400 hover:border-stone-400 hover:text-stone-600'
        }`}
      >
        ?
      </button>

      {open && (
        <div className="absolute left-0 top-7 z-30 w-80 overflow-hidden rounded-xl border border-stone-200 bg-card shadow-xl">
          <div className="border-b border-stone-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-stone-900">Event types</p>
            <p className="text-xs text-stone-400">What each tracked action means.</p>
          </div>
          <ul className="max-h-80 overflow-y-auto px-2 py-2">
            {EVENT_TYPE_ORDER.map((type) => {
              const meta = EVENT_META[type]
              return (
                <li key={type} className="flex items-start gap-2.5 rounded-lg px-2 py-1.5">
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: meta.color }}
                    aria-hidden
                  />
                  <span className="flex flex-col">
                    <span className="text-xs font-semibold text-stone-800">{meta.label}</span>
                    <span className="text-xs text-stone-500">{meta.description}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function UserPicker({
  users,
  loading,
  selected,
  onSelect,
}: {
  users: UserOption[]
  loading: boolean
  selected: UserOption | null
  onSelect: (u: UserOption) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) => (u.name ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }, [users, query])

  return (
    <div ref={ref} className="relative max-w-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-left text-sm hover:border-stone-300"
      >
        {selected ? (
          <span className="truncate">
            <span className="font-medium text-stone-900">{selected.name || selected.email}</span>{' '}
            <span className="text-stone-400">{selected.email}</span>
          </span>
        ) : (
          <span className="text-stone-400">{loading ? 'Loading users…' : 'Select a user…'}</span>
        )}
        <svg className="ml-2 h-4 w-4 shrink-0 text-stone-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-stone-200 bg-card shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full border-b border-stone-100 px-3 py-2 text-sm outline-none placeholder:text-stone-400"
          />
          <ul className="max-h-72 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-center text-sm text-stone-400">No users found.</li>
            )}
            {filtered.map((u) => (
              <li key={u._id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(u)
                    setOpen(false)
                    setQuery('')
                  }}
                  className={`flex w-full flex-col items-start px-3 py-2 text-left hover:bg-stone-50 ${
                    selected?._id === u._id ? 'bg-stone-50' : ''
                  }`}
                >
                  <span className="text-sm font-medium text-stone-900">{u.name || u.email}</span>
                  <span className="text-xs text-stone-400">
                    {u.email} · {u.role}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
