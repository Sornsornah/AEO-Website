'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { AnalyticsEventType } from '@/models/AnalyticsEvent'

interface UserOption {
  _id: string
  name: string
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

const EVENT_META: Record<AnalyticsEventType, { label: string; color: string; verb: string }> = {
  site_access:           { label: 'Site access',   color: '#64748b', verb: 'Accessed the site' },
  page_view:             { label: 'Page view',     color: '#2563eb', verb: 'Visited' },
  product_view:          { label: 'Product view',  color: '#16a34a', verb: 'Viewed product' },
  product_visit_website: { label: 'Visit website', color: '#0891b2', verb: 'Clicked “Visit website” on' },
  product_share:         { label: 'Product share', color: '#d97706', verb: 'Shared product' },
  blog_view:             { label: 'Blog view',     color: '#7c3aed', verb: 'Viewed blog post' },
  blog_share:            { label: 'Blog share',    color: '#e11d48', verb: 'Shared blog post' },
  blog_like:             { label: 'Blog like',     color: '#db2777', verb: 'Liked blog post' },
  blog_save:             { label: 'Blog save',     color: '#0d9488', verb: 'Saved blog post' },
  blog_comment:          { label: 'Blog comment',  color: '#9333ea', verb: 'Commented on blog post' },
  update_comment:        { label: 'Update comment', color: '#c026d3', verb: 'Commented on update' },
}

function describe(item: ActivityItem): { verb: string; target: string | null } {
  const meta = EVENT_META[item.type]
  if (item.type === 'page_view') return { verb: meta.verb, target: item.path }
  if (item.type === 'site_access') return { verb: meta.verb, target: null }
  return { verb: meta.verb, target: item.entityName ?? '(removed)' }
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

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

  const { data, isLoading, isError } = useQuery<ActivityResponse>({
    queryKey: ['user-activity', selected?._id, range.from, range.to],
    enabled: !!selected,
    queryFn: () =>
      fetch(`/api/dashboard/user-activity?userId=${selected!._id}&from=${range.from}&to=${range.to}`).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      }),
  })

  // Group activity by calendar day for the timeline.
  const grouped = useMemo(() => {
    if (!data) return []
    const map = new Map<string, ActivityItem[]>()
    for (const item of data.activity) {
      const day = dayFmt.format(new Date(item.createdAt))
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(item)
    }
    return [...map.entries()]
  }, [data])

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>User activity</CardTitle>
          <CardDescription>
            Select a user to see every page they accessed, content they viewed, and actions they
            took — newest first, within the selected date range.
          </CardDescription>
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
                  <span className="font-medium text-stone-900">{data.total}</span> events
                  {data.hasMore && <span className="text-stone-400"> (showing most recent)</span>}
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
            </div>
          )}
        </CardContent>
      </Card>
    </section>
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
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
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
            <span className="font-medium text-stone-900">{selected.name}</span>{' '}
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
                  <span className="text-sm font-medium text-stone-900">{u.name}</span>
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
