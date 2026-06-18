export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { handleApiError } from '@/lib/handle-api-error'
import { AnalyticsEvent } from '@/models/AnalyticsEvent'
import { User } from '@/models/User'
import { Product } from '@/models/Product'
import { BlogPost } from '@/models/BlogPost'
import { BlogComment } from '@/models/BlogComment'
import { BlogCategory } from '@/models/BlogCategory'

// distinct visitor identity = logged-in user when present, else anonymous cookie id
const IDENTITY = { $ifNull: ['$userId', '$visitorId'] }

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req.headers)
    if (!session) return new Response(null, { status: 401 })
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const now = new Date()
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : defaultFrom
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : now
    const range = { $gte: from, $lte: to }

    const [
      usersByRole,
      totalUsersVisitedAgg,
      newUsersPerDay,
      siteAccessPerDay,
      siteAccessUniqueAgg,
      productViewAgg,
      productVisitAgg,
      productShareAgg,
      products,
      blogViewByPost,
      blogViewByCategory,
      blogCommentByPost,
      blogShareByPost,
      blogShareByCategory,
      blogPosts,
      categories,
      blogViewersAgg,
      authorsInRange,
      firstPostPerAuthor,
    ] = await Promise.all([
      // --- Acquisition (registered users only: userId present) ---
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      // Total users = all-time unique registered users who accessed the site at least once
      AnalyticsEvent.aggregate([
        { $match: { type: 'site_access', userId: { $ne: null } } },
        { $group: { _id: null, ids: { $addToSet: '$userId' } } },
        { $project: { count: { $size: '$ids' } } },
      ]),
      // New users = registered users whose first-ever site_access falls in range, bucketed by day
      AnalyticsEvent.aggregate([
        { $match: { type: 'site_access', userId: { $ne: null } } },
        { $group: { _id: '$userId', firstAt: { $min: '$createdAt' } } },
        { $match: { firstAt: range } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$firstAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { type: 'site_access', createdAt: range, userId: { $ne: null } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, ids: { $addToSet: '$userId' } } },
        { $project: { count: { $size: '$ids' } } },
        { $sort: { _id: 1 } },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { type: 'site_access', createdAt: range, userId: { $ne: null } } },
        { $group: { _id: null, ids: { $addToSet: '$userId' } } },
        { $project: { count: { $size: '$ids' } } },
      ]),

      // --- Activation: product ---
      AnalyticsEvent.aggregate([
        { $match: { type: 'product_view', createdAt: range } },
        { $group: { _id: '$entityId', views: { $sum: 1 }, viewers: { $addToSet: IDENTITY } } },
        { $project: { views: 1, uniqueViewers: { $size: '$viewers' } } },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { type: 'product_visit_website', createdAt: range } },
        { $group: { _id: '$entityId', clicks: { $sum: 1 }, clickers: { $addToSet: IDENTITY } } },
        { $project: { clicks: 1, uniqueClicks: { $size: '$clickers' } } },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { type: 'product_share', createdAt: range } },
        { $group: { _id: '$entityId', shares: { $sum: 1 }, sharers: { $addToSet: IDENTITY } } },
        { $project: { shares: 1, uniqueShares: { $size: '$sharers' } } },
      ]),
      Product.find().select('_id name slug').lean(),

      // --- Activation: blog ---
      AnalyticsEvent.aggregate([
        { $match: { type: 'blog_view', createdAt: range } },
        { $group: { _id: '$entityId', views: { $sum: 1 }, viewers: { $addToSet: IDENTITY } } },
        { $project: { views: 1, uniqueViewers: { $size: '$viewers' } } },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { type: 'blog_view', createdAt: range, category: { $ne: null } } },
        { $group: { _id: '$category', views: { $sum: 1 }, viewers: { $addToSet: IDENTITY } } },
        { $project: { views: 1, uniqueViewers: { $size: '$viewers' } } },
      ]),
      BlogComment.aggregate([
        { $match: { createdAt: range } },
        { $group: { _id: '$postId', count: { $sum: 1 } } },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { type: 'blog_share', createdAt: range } },
        { $group: { _id: '$entityId', shares: { $sum: 1 }, sharers: { $addToSet: IDENTITY }, category: { $first: '$category' } } },
        { $project: { shares: 1, uniqueShares: { $size: '$sharers' }, category: 1 } },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { type: 'blog_share', createdAt: range, category: { $ne: null } } },
        { $group: { _id: '$category', shares: { $sum: 1 }, sharers: { $addToSet: IDENTITY } } },
        { $project: { shares: 1, uniqueShares: { $size: '$sharers' } } },
      ]),
      BlogPost.find().select('_id title slug category likes createdBy').lean(),
      BlogCategory.find().select('name slug').lean(),

      // --- Retention: blog ---
      // Blog viewers = unique viewers (incl. anonymous) of any blog post within the selected range
      AnalyticsEvent.aggregate([
        { $match: { type: 'blog_view', createdAt: range } },
        { $group: { _id: null, ids: { $addToSet: IDENTITY } } },
        { $project: { count: { $size: '$ids' } } },
      ]),
      BlogPost.distinct('createdBy', { createdBy: { $ne: null }, createdAt: range }),
      BlogPost.aggregate([
        { $match: { createdBy: { $ne: null } } },
        { $group: { _id: '$createdBy', firstAt: { $min: '$createdAt' } } },
      ]),
    ])

    // ---- name lookups ----
    const productName = new Map<string, { name: string; slug: string }>()
    for (const p of products) productName.set(String(p._id), { name: p.name, slug: p.slug })
    const blogName = new Map<string, { title: string; slug: string; category: string }>()
    for (const b of blogPosts) blogName.set(String(b._id), { title: b.title, slug: b.slug, category: b.category })
    const categoryName = new Map<string, string>()
    for (const c of categories) categoryName.set(c.slug, c.name)

    // ---- author lookups (blog post createdBy → user name) ----
    const authorIds = [...new Set(blogPosts.map((b) => b.createdBy).filter(Boolean).map(String))]
    const authorUsers = authorIds.length
      ? await User.find({ _id: { $in: authorIds } }).select('_id name email').lean()
      : []
    const authorName = new Map<string, string>()
    for (const u of authorUsers) authorName.set(String(u._id), u.name || u.email || 'Unknown')
    const postAuthorId = new Map<string, string>()
    for (const b of blogPosts) {
      if (b.createdBy) postAuthorId.set(String(b._id), String(b.createdBy))
    }

    const id = (v: unknown) => (v == null ? '' : String(v))

    // ---- Acquisition ----
    const roleCounts: Record<string, number> = { public: 0, viewer: 0, admin: 0 }
    for (const r of usersByRole) roleCounts[r._id as string] = r.count

    // ---- Activation: product (merge views + clicks + shares per product) ----
    const productViewsMap = new Map(productViewAgg.map((d) => [id(d._id), d]))
    const productVisitMap = new Map(productVisitAgg.map((d) => [id(d._id), d]))
    const productShareMap = new Map(productShareAgg.map((d) => [id(d._id), d]))
    const productIds = new Set<string>([
      ...productViewsMap.keys(),
      ...productVisitMap.keys(),
      ...productShareMap.keys(),
    ])

    // Exclude products that no longer exist — deleted products are dropped
    // from the table and charts entirely.
    const productMetrics = [...productIds]
      .filter((pid) => productName.has(pid))
      .map((pid) => ({
        productId: pid,
        name: productName.get(pid)!.name,
        views: productViewsMap.get(pid)?.views ?? 0,
        uniqueViewers: productViewsMap.get(pid)?.uniqueViewers ?? 0,
        visitWebsiteClicks: productVisitMap.get(pid)?.clicks ?? 0,
        uniqueVisitWebsiteClicks: productVisitMap.get(pid)?.uniqueClicks ?? 0,
        shares: productShareMap.get(pid)?.shares ?? 0,
        uniqueShares: productShareMap.get(pid)?.uniqueShares ?? 0,
      }))
      .sort((a, b) => b.views - a.views)

    // ---- Activation: blog (per post: views, likes, comments, shares) ----
    const likesByPost = new Map<string, number>(
      blogPosts.map((b) => [String(b._id), Array.isArray(b.likes) ? b.likes.length : 0])
    )
    const commentsByPost = new Map<string, number>(blogCommentByPost.map((d) => [id(d._id), d.count]))
    const blogShareByPostMap = new Map(blogShareByPost.map((d) => [id(d._id), d]))
    const blogViewsByPostMap = new Map(blogViewByPost.map((d) => [id(d._id), d]))

    const postIds = new Set<string>([
      ...blogViewsByPostMap.keys(),
      ...likesByPost.keys(),
      ...commentsByPost.keys(),
      ...blogShareByPostMap.keys(),
    ])
    const blogPostMetrics = [...postIds]
      // Exclude posts that no longer exist — analytics rows can outlive a
      // deleted post, but a "(Unknown post)" row is noise in the table.
      .filter((bid) => blogName.has(bid))
      .map((bid) => {
      const meta = blogName.get(bid)!
      const v = blogViewsByPostMap.get(bid)
      const s = blogShareByPostMap.get(bid)
      const authorId = postAuthorId.get(bid)
      return {
        postId: bid,
        title: meta.title,
        author: authorId ? authorName.get(authorId) ?? 'Unknown' : 'Unknown',
        category: categoryName.get(meta.category) ?? meta.category,
        views: v?.views ?? 0,
        uniqueViewers: v?.uniqueViewers ?? 0,
        likes: likesByPost.get(bid) ?? 0,
        comments: commentsByPost.get(bid) ?? 0,
        shares: s?.shares ?? 0,
        uniqueShares: s?.uniqueShares ?? 0,
      }
    }).sort((a, b) => b.views - a.views)

    // ---- Activation: top contributors (per author across their posts) ----
    type Contributor = { authorId: string; author: string; posts: number; views: number; likes: number; comments: number; shares: number }
    const contribMap = new Map<string, Contributor>()
    for (const b of blogPosts) {
      if (!b.createdBy) continue
      const aid = String(b.createdBy)
      if (!contribMap.has(aid)) {
        contribMap.set(aid, { authorId: aid, author: authorName.get(aid) ?? 'Unknown', posts: 0, views: 0, likes: 0, comments: 0, shares: 0 })
      }
      const c = contribMap.get(aid)!
      const pid = String(b._id)
      c.posts += 1
      c.views += blogViewsByPostMap.get(pid)?.views ?? 0
      c.likes += Array.isArray(b.likes) ? b.likes.length : 0
      c.comments += commentsByPost.get(pid) ?? 0
      c.shares += blogShareByPostMap.get(pid)?.shares ?? 0
    }
    const topContributors = [...contribMap.values()].sort((a, b) => b.views - a.views)

    // ---- Activation: blog per category (views + likes + comments + shares aggregated) ----
    const catAgg = new Map<string, { views: number; uniqueViewers: number; likes: number; comments: number; shares: number; uniqueShares: number }>()
    const ensureCat = (slug: string) => {
      if (!catAgg.has(slug)) catAgg.set(slug, { views: 0, uniqueViewers: 0, likes: 0, comments: 0, shares: 0, uniqueShares: 0 })
      return catAgg.get(slug)!
    }
    for (const c of blogViewByCategory) {
      const e = ensureCat(id(c._id))
      e.views += c.views
      e.uniqueViewers += c.uniqueViewers
    }
    for (const b of blogPosts) {
      const e = ensureCat(b.category)
      e.likes += Array.isArray(b.likes) ? b.likes.length : 0
    }
    for (const c of blogCommentByPost) {
      const slug = blogName.get(id(c._id))?.category
      if (slug) ensureCat(slug).comments += c.count
    }
    for (const s of blogShareByCategory) {
      const e = ensureCat(id(s._id))
      e.shares += s.shares
      e.uniqueShares += s.uniqueShares
    }
    const blogCategoryMetrics = [...catAgg.entries()].map(([slug, m]) => ({
      category: categoryName.get(slug) ?? slug,
      ...m,
    })).sort((a, b) => b.views - a.views)

    // ---- Retention: authorship funnel ----
    const authorsInRangeSet = new Set(authorsInRange.map((a) => String(a)))
    const firstTimeAuthors = firstPostPerAuthor.filter(
      (a) => a.firstAt >= from && a.firstAt <= to
    ).length

    return NextResponse.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      acquisition: {
        usersByRole: roleCounts,
        totalUsers: totalUsersVisitedAgg[0]?.count ?? 0,
        newUsersPerDay: newUsersPerDay.map((d) => ({ date: d._id, count: d.count })),
        siteAccessPerDay: siteAccessPerDay.map((d) => ({ date: d._id, count: d.count })),
        uniqueActiveUsers: siteAccessUniqueAgg[0]?.count ?? 0,
      },
      activation: {
        products: productMetrics,
        blogPosts: blogPostMetrics,
        blogCategories: blogCategoryMetrics,
        topContributors,
      },
      retention: {
        blogViewers: blogViewersAgg[0]?.count ?? 0,
        authorsInRange: authorsInRangeSet.size,
        firstTimeAuthors,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
