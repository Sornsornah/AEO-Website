export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { handleApiError } from '@/lib/handle-api-error'
import { AnalyticsEvent } from '@/models/AnalyticsEvent'
import { User } from '@/models/User'
import { resolveActivityRows, type ActivityRow } from '@/features/dashboard/lib/activity-query'
import { activityLabel } from '@/features/dashboard/lib/event-meta'
import { EXPORT_COLUMN_KEYS } from '@/features/dashboard/lib/export-columns'
import { SGT_OFFSET_MS } from '@/lib/date'

// Hard ceiling so a huge range can't exhaust memory building the CSV string.
const MAX_ROWS = 50_000

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** Pre-bucketed SGT (UTC+8) date parts so charts can group without parsing. */
function sgtParts(iso: string): { date: string; hour: string; dow: string } {
  const sgt = new Date(new Date(iso).getTime() + SGT_OFFSET_MS)
  return {
    date: sgt.toISOString().slice(0, 10),
    hour: String(sgt.getUTCHours()).padStart(2, '0'),
    dow: DOW[sgt.getUTCDay()],
  }
}

/** Per-column cell resolvers, keyed by the column's CSV header. */
const CELL: Record<string, (r: ActivityRow, user: { name: string; email: string } | undefined) => string> = {
  timestamp_utc: (r) => r.createdAt,
  date: (r) => sgtParts(r.createdAt).date,
  hour: (r) => sgtParts(r.createdAt).hour,
  day_of_week: (r) => sgtParts(r.createdAt).dow,
  user_name: (_r, u) => u?.name ?? '(unknown)',
  user_email: (_r, u) => u?.email ?? '',
  event_label: (r) => activityLabel(r.type),
  entity_type: (r) => r.entityType ?? '',
  entity_name: (r) => r.entityName ?? '',
  blog_post_author: (r) => (r.entityType === 'blog' ? r.entityAuthor ?? '' : ''),
  category: (r) => r.category ?? '',
  path: (r) => r.path ?? '',
}

/** RFC-4180 cell escaping: quote when the value contains a comma, quote or newline. */
function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function csvRow(cells: string[]): string {
  return cells.map(csvCell).join(',')
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req.headers)
    if (!session) return new Response(null, { status: 401 })
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)

    const userIds = (searchParams.get('userIds') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (userIds.length === 0 || !userIds.every((id) => mongoose.Types.ObjectId.isValid(id))) {
      return NextResponse.json({ error: 'A valid userIds list is required' }, { status: 400 })
    }

    const now = new Date()
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : now
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from.getTime() > to.getTime()) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
    }

    // Optional column selection — keep canonical order, ignore unknown keys,
    // fall back to all columns when none are specified.
    const requested = new Set(
      (searchParams.get('columns') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    )
    const selectedKeys = requested.size
      ? EXPORT_COLUMN_KEYS.filter((k) => requested.has(k))
      : EXPORT_COLUMN_KEYS
    const columns = selectedKeys.length ? selectedKeys : EXPORT_COLUMN_KEYS

    await connectDB()

    const [users, events] = await Promise.all([
      User.find({ _id: { $in: userIds } }).select('_id name email').lean(),
      AnalyticsEvent.find({ userId: { $in: userIds }, createdAt: { $gte: from, $lte: to } })
        .sort({ userId: 1, createdAt: 1 })
        .limit(MAX_ROWS)
        .select('type userId entityId entityType category path createdAt')
        .lean(),
    ])

    const userMap = new Map<string, { name: string; email: string }>()
    for (const u of users) userMap.set(String(u._id), { name: u.name, email: u.email })

    const rows: ActivityRow[] = await resolveActivityRows(events)

    const lines = [csvRow(columns)]
    for (const r of rows) {
      const u = r.userId ? userMap.get(r.userId) : undefined
      lines.push(csvRow(columns.map((k) => CELL[k](r, u))))
    }

    // Prepend a BOM so Excel reads the UTF-8 verbatim (em-dashes, smart quotes).
    const csv = '﻿' + lines.join('\r\n') + '\r\n'
    const filename = `user-activity_${from.toISOString().slice(0, 10)}_to_${to.toISOString().slice(0, 10)}.csv`

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
