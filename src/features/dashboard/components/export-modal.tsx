'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  isValidDateRange,
  dateInputToStartIso,
  dateInputToEndIso,
  todayDateInput,
} from '@/lib/date'
import { EXPORT_COLUMNS, EXPORT_COLUMN_KEYS } from '../lib/export-columns'

interface UserOption {
  _id: string
  name?: string
  email: string
  role: string
}

const EXPORT_PRESETS = [
  { label: 'Past 24 hours', value: '1' },
  { label: 'Past 7 days', value: '7' },
  { label: 'Past 90 days', value: '90' },
] as const

/**
 * Self-contained "Export user activity" dialog. Fetches its own user list
 * (shared query key, so it dedupes with the User Activity tab) and lets the
 * admin pick users, a timeframe, and which columns to download as CSV.
 */
export function ExportModal({ onClose }: { onClose: () => void }) {
  const { data: users = [], isLoading: usersLoading } = useQuery<UserOption[]>({
    queryKey: ['dashboard-users'],
    queryFn: () =>
      fetch('/api/admin/users').then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      }),
  })

  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set(EXPORT_COLUMN_KEYS))
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

  const canDownload = selectedIds.size > 0 && range != null && selectedCols.size > 0

  const allColsSelected = selectedCols.size === EXPORT_COLUMN_KEYS.length

  function toggleCol(key: string) {
    setSelectedCols((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleAllCols() {
    setSelectedCols((prev) =>
      prev.size === EXPORT_COLUMN_KEYS.length ? new Set() : new Set(EXPORT_COLUMN_KEYS)
    )
  }

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
      // Preserve canonical column order regardless of click order.
      columns: EXPORT_COLUMN_KEYS.filter((k) => selectedCols.has(k)).join(','),
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
              Choose users, a timeframe, and columns to download as CSV.
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

          {/* Columns */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                Columns
              </label>
              <button
                type="button"
                onClick={toggleAllCols}
                className="text-xs font-medium text-stone-500 hover:text-stone-800"
              >
                {allColsSelected ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-stone-100">
              {EXPORT_COLUMNS.map((col) => (
                <label
                  key={col.key}
                  className="flex cursor-pointer items-start gap-2 px-3 py-2 hover:bg-stone-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedCols.has(col.key)}
                    onChange={() => toggleCol(col.key)}
                    className="mt-0.5 h-4 w-4 rounded border-stone-300"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-stone-900">{col.label}</span>
                    <span className="text-xs text-stone-400">{col.description}</span>
                  </span>
                </label>
              ))}
            </div>
            {selectedCols.size === 0 && (
              <p className="text-xs text-red-500">Select at least one column.</p>
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
              {usersLoading && (
                <p className="px-3 py-4 text-center text-sm text-stone-400">Loading users…</p>
              )}
              {!usersLoading && filtered.length === 0 && (
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
