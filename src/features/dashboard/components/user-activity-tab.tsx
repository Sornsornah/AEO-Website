'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { AnalyticsEventType } from '@/models/AnalyticsEvent'
import { EVENT_META, activityTarget } from '../lib/event-meta'
import {
  isValidDateRange,
  dateInputToStartIso,
  dateInputToEndIso,
  todayDateInput,
} from '@/lib/date'

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
  const [exportOpen, setExportOpen] = useState(false)

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
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle>User activity</CardTitle>
              <CardDescription>
                Select a user to see every page they accessed, content they viewed, and actions they
                took — newest first, within the selected date range.
              </CardDescription>
            </div>
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1C1512] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#2c211b]"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M10 2.5a.75.75 0 01.75.75v7.19l2.22-2.22a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 111.06-1.06l2.22 2.22V3.25A.75.75 0 0110 2.5z" />
                <path d="M3.5 12.75a.75.75 0 01.75.75v1.25c0 .414.336.75.75.75h10a.75.75 0 00.75-.75V13.5a.75.75 0 011.5 0v1.25A2.25 2.25 0 0115 17H5a2.25 2.25 0 01-2.25-2.25V13.5a.75.75 0 01.75-.75z" />
              </svg>
              Download CSV
            </button>
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

      {exportOpen && (
        <ExportModal users={users ?? []} onClose={() => setExportOpen(false)} />
      )}
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

const EXPORT_PRESETS = [
  { label: 'Past 24 hours', value: '1' },
  { label: 'Past 7 days', value: '7' },
  { label: 'Past 90 days', value: '90' },
] as const

function ExportModal({ users, onClose }: { users: UserOption[]; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [rangeMode, setRangeMode] = useState<string>('7') // preset value or 'custom'
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) => (u.name ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }, [users, query])

  const allFilteredSelected = filtered.length > 0 && filtered.every((u) => selectedIds.has(u._id))

  const customValid = isValidDateRange(customFrom, customTo)
  const customInvalid = rangeMode === 'custom' && Boolean(customFrom) && Boolean(customTo) && !customValid

  // Resolve the chosen timeframe to a {from, to} ISO pair, or null if not ready.
  const range = useMemo(() => {
    if (rangeMode === 'custom') {
      if (!customValid) return null
      const from = dateInputToStartIso(customFrom)
      const to = dateInputToEndIso(customTo)
      return from && to ? { from, to } : null
    }
    const now = new Date()
    const days = Number(rangeMode) || 7
    return { from: new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString(), to: now.toISOString() }
  }, [rangeMode, customFrom, customTo, customValid])

  const canDownload = selectedIds.size > 0 && range != null

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) filtered.forEach((u) => next.delete(u._id))
      else filtered.forEach((u) => next.add(u._id))
      return next
    })
  }

  function download() {
    if (!canDownload || !range) return
    const params = new URLSearchParams({
      userIds: [...selectedIds].join(','),
      from: range.from,
      to: range.to,
    })
    const a = document.createElement('a')
    a.href = `/api/dashboard/user-activity/export?${params.toString()}`
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    onClose()
  }

  const todayStr = todayDateInput()

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
            <h3 className="text-base font-semibold text-stone-900">Export user activity</h3>
            <p className="mt-0.5 text-sm text-stone-500">
              Choose users and a timeframe to download as CSV.
            </p>
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

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Timeframe */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Timeframe
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {EXPORT_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setRangeMode(p.value)}
                  className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                    rangeMode === p.value ? 'bg-[#1C1512] text-white font-medium' : 'text-stone-500 hover:bg-stone-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <span className="mx-1 h-5 w-px bg-stone-200" />
              <input
                type="date"
                value={customFrom}
                max={customTo || todayStr}
                onChange={(e) => {
                  setCustomFrom(e.target.value)
                  setRangeMode('custom')
                }}
                className={`rounded-lg border px-2 py-1 text-sm text-stone-600 ${
                  customInvalid ? 'border-red-400' : rangeMode === 'custom' ? 'border-[#1C1512]' : 'border-stone-200'
                }`}
              />
              <span className="text-stone-400">–</span>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                max={todayStr}
                onChange={(e) => {
                  setCustomTo(e.target.value)
                  setRangeMode('custom')
                }}
                className={`rounded-lg border px-2 py-1 text-sm text-stone-600 ${
                  customInvalid ? 'border-red-400' : rangeMode === 'custom' ? 'border-[#1C1512]' : 'border-stone-200'
                }`}
              />
            </div>
            {customInvalid && (
              <p className="text-sm text-red-500">
                Select a valid date range — the start date must be on or before the end date.
              </p>
            )}
          </div>

          {/* Users */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                Users
              </label>
              <span className="text-xs text-stone-400">
                {selectedIds.size} of {users.length} selected
              </span>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none placeholder:text-stone-400 focus:border-stone-300"
            />
            <div className="max-h-64 overflow-y-auto rounded-lg border border-stone-100">
              <label className="flex cursor-pointer items-center gap-2 border-b border-stone-100 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAllFiltered}
                  className="h-4 w-4 rounded border-stone-300"
                />
                Select all{query.trim() ? ' (matching)' : ''}
              </label>
              {filtered.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-stone-400">No users found.</p>
              )}
              {filtered.map((u) => (
                <label
                  key={u._id}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-stone-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(u._id)}
                    onChange={() => toggle(u._id)}
                    className="h-4 w-4 rounded border-stone-300"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-stone-900">{u.name || u.email}</span>
                    <span className="text-xs text-stone-400">
                      {u.email} · {u.role}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-stone-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={download}
            disabled={!canDownload}
            className="rounded-lg bg-[#1C1512] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#2c211b] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Download CSV
          </button>
        </div>
      </div>
    </div>
  )
}
