export const dynamic = 'force-dynamic'

import { Types } from 'mongoose'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'
import { Update } from '@/models/Update'
import { Domain } from '@/models/Domain'
import { UserSeenUpdate } from '@/models/UserSeenUpdate'
import { Comment } from '@/models/Comment'
import { Tag } from '@/models/Tag'
import { Navbar } from '@/components/layout/Navbar'
import { UpdatesPageClient } from '@/components/updates/UpdatesPageClient'

interface PageProps {
  searchParams: {
    domain?: string
    product?: string
    view?: string
  }
}

export default async function UpdatesPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  await connectDB()
  void Tag // ensure Tag schema is registered for populate('tagIds')

  const currentView = searchParams.view || 'all'
  const isWhatsNewView = currentView === 'new'

  // Fetch seen IDs
  let seenIds: Types.ObjectId[] = []
  if (session) {
    const seenRecords = await UserSeenUpdate.find({ userId: session.user.id }).select('updateId').lean()
    seenIds = seenRecords.map((r) => r.updateId as Types.ObjectId)
  }

  // Build query
  const query: Record<string, unknown> = { isPublished: true }

  if (isWhatsNewView) {
    query._id = { $nin: seenIds }
  }

  if (searchParams.domain) {
    const domain = await Domain.findOne({ slug: searchParams.domain })
    if (domain) {
      const domainProducts = await Product.find({ domainId: domain._id }).select('_id').lean()
      query.productId = { $in: domainProducts.map((p) => p._id) }
    }
  } else if (searchParams.product) {
    const product = await Product.findOne({ slug: searchParams.product }).select('_id').lean()
    if (product) {
      query.productId = product._id
    }
  }

  // Fetch all domains, products, and updates
  const [allDomains, allProducts, updates] = await Promise.all([
    Domain.find().lean(),
    Product.find().select('name slug').sort({ name: 1 }).lean(),
    Update.find(query)
      .populate({ path: 'productId', populate: { path: 'domainId' } })
      .populate('domainIds')
      .populate('tagIds')
      .sort({ date: -1 })
      .lean(),
  ])

  // Serialize updates
  const serializedUpdates = (updates as Array<{
    _id: { toString(): string }
    title: string
    summary: string
    date: Date
    progressUpdates: string | string[]
    nextSteps: string | string[]
    learningPoints: string | string[]
    media: string[]
    isPublished: boolean
    productId: unknown
    domainIds: unknown[]
    tagIds: unknown[]
  }>).map((update) => ({
    _id: update._id.toString(),
    title: update.title,
    summary: update.summary,
    date: update.date.toISOString(),
    progressUpdates: update.progressUpdates || '',
    nextSteps: update.nextSteps || '',
    learningPoints: update.learningPoints || '',
    media: update.media || [],
    isPublished: update.isPublished,
    productId: {
      _id: (update.productId as { _id: { toString(): string } })?._id?.toString() || '',
      name: (update.productId as { name: string })?.name || '',
      color: (update.productId as { color: string })?.color || '#6366f1',
      slug: (update.productId as { slug: string })?.slug || '',
      domainName: (update.productId as { domainId?: { name?: string } })?.domainId?.name || '',
    },
    domains: Array.isArray(update.domainIds)
      ? (update.domainIds as Array<{ _id: { toString(): string }; name: string }>).map((d) => ({
          _id: d._id.toString(),
          name: d.name,
        }))
      : [],
    tags: Array.isArray(update.tagIds)
      ? (update.tagIds as Array<{ _id: { toString(): string }; name: string }>).map((t) => ({
          _id: t._id.toString(),
          name: t.name,
        }))
      : [],
  }))

  // Fetch comment counts for returned updates
  const updateObjectIds = serializedUpdates.map((u) => new Types.ObjectId(u._id))
  const commentAgg = await Comment.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { updateId: { $in: updateObjectIds } } },
    { $group: { _id: '$updateId', count: { $sum: 1 } } },
  ])
  const commentCounts: Record<string, number> = {}
  for (const row of commentAgg) {
    commentCounts[row._id.toString()] = row.count
  }

  const allDomainOptions = allDomains.map((d) => ({ name: d.name, slug: d.slug }))
  const allProductOptions = allProducts.map((p) => ({ name: p.name, slug: p.slug }))

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="w-full bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">Restricted Access</span>
        <p className="text-xs text-amber-800">This page is intended for authorised internal users only.</p>
      </div>

      <main className="px-6 py-10">
        <UpdatesPageClient
          updates={serializedUpdates}
          commentCounts={commentCounts}
          domains={allDomainOptions}
          activeDomain={searchParams.domain}
          products={allProductOptions}
          activeProduct={searchParams.product}
        />
      </main>
    </div>
  )
}
