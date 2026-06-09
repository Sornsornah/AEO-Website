export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { handleApiError } from '@/lib/handle-api-error'
import { AnalyticsEvent } from '@/models/AnalyticsEvent'
import { Product } from '@/models/Product'
import { BlogPost } from '@/models/BlogPost'
import { Update } from '@/models/Update'
import { User } from '@/models/User'

const MAX_LIMIT = 500
const DEFAULT_LIMIT = 200

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req.headers)
    if (!session) return new Response(null, { status: 401 })
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'A valid userId is required' }, { status: 400 })
    }

    const now = new Date()
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : defaultFrom
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : now
    const limit = Math.min(Number(searchParams.get('limit')) || DEFAULT_LIMIT, MAX_LIMIT)

    await connectDB()

    const [user, events] = await Promise.all([
      User.findById(userId).select('_id name email role').lean(),
      AnalyticsEvent.find({ userId, createdAt: { $gte: from, $lte: to } })
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .select('type entityId entityType category path createdAt')
        .lean(),
    ])

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const hasMore = events.length > limit
    const page = hasMore ? events.slice(0, limit) : events

    // Resolve entity names for product/blog/update events.
    const productIds = new Set<string>()
    const blogIds = new Set<string>()
    const updateIds = new Set<string>()
    for (const e of page) {
      if (!e.entityId) continue
      if (e.entityType === 'product') productIds.add(String(e.entityId))
      else if (e.entityType === 'blog') blogIds.add(String(e.entityId))
      else if (e.entityType === 'update') updateIds.add(String(e.entityId))
    }

    const [products, posts, updates] = await Promise.all([
      productIds.size
        ? Product.find({ _id: { $in: [...productIds] } }).select('_id name slug').lean()
        : [],
      blogIds.size
        ? BlogPost.find({ _id: { $in: [...blogIds] } }).select('_id title slug').lean()
        : [],
      updateIds.size
        ? Update.find({ _id: { $in: [...updateIds] } }).select('_id title').lean()
        : [],
    ])

    const productMap = new Map<string, { name: string; slug: string }>()
    for (const p of products) productMap.set(String(p._id), { name: p.name, slug: p.slug })
    const blogMap = new Map<string, { title: string; slug: string }>()
    for (const b of posts) blogMap.set(String(b._id), { title: b.title, slug: b.slug })
    const updateMap = new Map<string, { title: string }>()
    for (const u of updates) updateMap.set(String(u._id), { title: u.title })

    const activity = page.map((e) => {
      let entityName: string | undefined
      let href: string | undefined
      if (e.entityId && e.entityType === 'product') {
        const p = productMap.get(String(e.entityId))
        entityName = p?.name
        href = p ? `/products/${p.slug}` : undefined
      } else if (e.entityId && e.entityType === 'blog') {
        const b = blogMap.get(String(e.entityId))
        entityName = b?.title
        href = b ? `/blog/${b.slug}` : undefined
      } else if (e.entityId && e.entityType === 'update') {
        const u = updateMap.get(String(e.entityId))
        entityName = u?.title
        href = u ? `/updates/${e.entityId}` : undefined
      }
      return {
        _id: String(e._id),
        type: e.type,
        entityType: e.entityType ?? null,
        entityId: e.entityId ? String(e.entityId) : null,
        entityName: entityName ?? null,
        category: e.category ?? null,
        path: e.path ?? null,
        href: href ?? (e.type === 'page_view' ? e.path : undefined) ?? null,
        createdAt: e.createdAt.toISOString(),
      }
    })

    return NextResponse.json({
      user: {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      range: { from: from.toISOString(), to: to.toISOString() },
      total: activity.length,
      hasMore,
      activity,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
