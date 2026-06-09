export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { handleApiError } from '@/lib/handle-api-error'
import { AnalyticsEvent, ANALYTICS_EVENT_TYPES } from '@/models/AnalyticsEvent'

const VISITOR_COOKIE = 'ac_vid'
const ONE_YEAR = 60 * 60 * 24 * 365

const trackSchema = z.object({
  type: z.enum(ANALYTICS_EVENT_TYPES),
  entityId: z.string().optional(),
  entityType: z.enum(['product', 'blog', 'update']).optional(),
  category: z.string().optional(),
  path: z.string().max(512).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { type, entityId, entityType, category, path } = trackSchema.parse(body)

    const session = await getSession(req.headers)
    const userId = session?.user.id

    // page_view powers the per-user activity timeline, which is keyed on a
    // selectable User. Anonymous navigation is unusable there and high-volume,
    // so skip it entirely rather than storing orphaned visitor rows.
    if (type === 'page_view' && !userId) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    // Anonymous visitor id (only needed when there's no logged-in user).
    const cookieStore = await cookies()
    let visitorId = cookieStore.get(VISITOR_COOKIE)?.value
    let setCookie = false
    if (!userId && !visitorId) {
      visitorId = crypto.randomUUID()
      setCookie = true
    }

    await connectDB()

    // site_access is high-volume — dedupe to once per user/visitor per day.
    if (type === 'site_access') {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const existing = await AnalyticsEvent.findOne({
        type: 'site_access',
        createdAt: { $gte: startOfDay },
        ...(userId ? { userId } : { visitorId }),
      })
        .select('_id')
        .lean()
      if (existing) {
        return jsonWithCookie({ ok: true, deduped: true }, setCookie && visitorId ? visitorId : null)
      }
    }

    await AnalyticsEvent.create({
      type,
      ...(userId ? { userId } : {}),
      ...(visitorId ? { visitorId } : {}),
      ...(entityId ? { entityId } : {}),
      ...(entityType ? { entityType } : {}),
      ...(category ? { category } : {}),
      ...(path ? { path } : {}),
    })

    return jsonWithCookie({ ok: true }, setCookie && visitorId ? visitorId : null)
  } catch (error) {
    return handleApiError(error)
  }
}

function jsonWithCookie(body: unknown, newVisitorId: string | null) {
  const res = NextResponse.json(body)
  if (newVisitorId) {
    res.cookies.set(VISITOR_COOKIE, newVisitorId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: ONE_YEAR,
      path: '/',
    })
  }
  return res
}
