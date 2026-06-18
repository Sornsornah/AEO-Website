import { AnalyticsEvent } from '@/models/AnalyticsEvent'
import type { AnalyticsEventType } from '@/models/AnalyticsEvent'
import { Product } from '@/models/Product'
import { BlogPost } from '@/models/BlogPost'
import { Update } from '@/models/Update'

/** A single analytics event with its entity name + link resolved. */
export interface ActivityRow {
  _id: string
  userId: string | null
  type: AnalyticsEventType
  entityType: 'product' | 'blog' | 'update' | null
  entityId: string | null
  entityName: string | null
  /** Byline author of the blog post (blog entities only; null otherwise). */
  entityAuthor: string | null
  category: string | null
  path: string | null
  href: string | null
  createdAt: string
}

interface RawEvent {
  _id: unknown
  userId?: unknown
  type: AnalyticsEventType
  entityId?: unknown
  entityType?: 'product' | 'blog' | 'update'
  category?: string
  path?: string
  createdAt: Date
}

/**
 * Resolve product/blog/update names + hrefs for a batch of raw analytics
 * events (one DB round-trip per entity type). Shared by the per-user activity
 * JSON route and the multi-user CSV export route so name resolution can't drift.
 */
export async function resolveActivityRows(events: RawEvent[]): Promise<ActivityRow[]> {
  const productIds = new Set<string>()
  const blogIds = new Set<string>()
  const updateIds = new Set<string>()
  for (const e of events) {
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
      ? BlogPost.find({ _id: { $in: [...blogIds] } }).select('_id title slug authorName').lean()
      : [],
    updateIds.size
      ? Update.find({ _id: { $in: [...updateIds] } }).select('_id title').lean()
      : [],
  ])

  const productMap = new Map<string, { name: string; slug: string }>()
  for (const p of products) productMap.set(String(p._id), { name: p.name, slug: p.slug })
  const blogMap = new Map<string, { title: string; slug: string; authorName: string }>()
  for (const b of posts) blogMap.set(String(b._id), { title: b.title, slug: b.slug, authorName: b.authorName })
  const updateMap = new Map<string, { title: string }>()
  for (const u of updates) updateMap.set(String(u._id), { title: u.title })

  return events.map((e) => {
    let entityName: string | undefined
    let entityAuthor: string | undefined
    let href: string | undefined
    if (e.entityId && e.entityType === 'product') {
      const p = productMap.get(String(e.entityId))
      entityName = p?.name
      href = p ? `/products/${p.slug}` : undefined
    } else if (e.entityId && e.entityType === 'blog') {
      const b = blogMap.get(String(e.entityId))
      entityName = b?.title
      entityAuthor = b?.authorName
      href = b ? `/blog/${b.slug}` : undefined
    } else if (e.entityId && e.entityType === 'update') {
      const u = updateMap.get(String(e.entityId))
      entityName = u?.title
      href = u ? `/updates/${String(e.entityId)}` : undefined
    }
    return {
      _id: String(e._id),
      userId: e.userId ? String(e.userId) : null,
      type: e.type,
      entityType: e.entityType ?? null,
      entityId: e.entityId ? String(e.entityId) : null,
      entityName: entityName ?? null,
      entityAuthor: entityAuthor ?? null,
      category: e.category ?? null,
      path: e.path ?? null,
      href: href ?? (e.type === 'page_view' ? e.path ?? null : null),
      createdAt: e.createdAt.toISOString(),
    }
  })
}

/** Fetch + resolve a page of a single user's activity (newest first). */
export async function fetchUserActivity(
  userId: string,
  from: Date,
  to: Date,
  limit: number,
  skip = 0
): Promise<{ rows: ActivityRow[]; hasMore: boolean }> {
  const events = (await AnalyticsEvent.find({ userId, createdAt: { $gte: from, $lte: to } })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit + 1)
    .select('type userId entityId entityType category path createdAt')
    .lean()) as RawEvent[]

  const hasMore = events.length > limit
  const page = hasMore ? events.slice(0, limit) : events
  return { rows: await resolveActivityRows(page), hasMore }
}
