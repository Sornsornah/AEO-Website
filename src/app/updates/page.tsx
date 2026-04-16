import { Suspense } from 'react'
import { Types } from 'mongoose'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'
import { Update } from '@/models/Update'
import { Domain } from '@/models/Domain'
import { SavedUpdate } from '@/models/SavedUpdate'
import { UserSeenUpdate } from '@/models/UserSeenUpdate'
import { Comment } from '@/models/Comment'
import { Tag } from '@/models/Tag'
import { Navbar } from '@/components/layout/Navbar'
import { DomainPills } from '@/components/updates/DomainPills'
import { UpdatesPageClient } from '@/components/updates/UpdatesPageClient'

interface PageProps {
  searchParams: {
    domain?: string
    view?: string
  }
}

export default async function UpdatesPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  await connectDB()
  void Tag // ensure Tag schema is registered for populate('tagIds')

  const currentView = searchParams.view || 'all'
  const isWhatsNewView = currentView === 'new'
  const isSavedView = currentView === 'saved'

  // Fetch seen IDs + saved IDs
  let seenIds: Types.ObjectId[] = []
  let unseenCount = 0
  const savedIds = new Set<string>()
  if (session) {
    const [seenRecords, savedRecords] = await Promise.all([
      UserSeenUpdate.find({ userId: session.user.id }).select('updateId').lean(),
      SavedUpdate.find({ userId: session.user.id }).select('updateId').lean(),
    ])
    seenIds = seenRecords.map((r) => r.updateId as Types.ObjectId)
    for (const r of savedRecords) savedIds.add(r.updateId.toString())
    unseenCount = await Update.countDocuments({ isPublished: true, _id: { $nin: seenIds } })
  }

  const savedCount = savedIds.size

  // Build query
  const query: Record<string, unknown> = { isPublished: true }

  if (isWhatsNewView) {
    query._id = { $nin: seenIds }
  } else if (isSavedView) {
    query._id = { $in: Array.from(savedIds) }
  }

  if (searchParams.domain && !isSavedView) {
    const domain = await Domain.findOne({ slug: searchParams.domain })
    if (domain) {
      const domainProducts = await Product.find({ domainId: domain._id }).select('_id').lean()
      query.productId = { $in: domainProducts.map((p) => p._id) }
    }
  }

  // Fetch all domains for pills + all updates (grouped by month client-side)
  const [allDomains, updates] = await Promise.all([
    Domain.find().sort({ name: 1 }).lean(),
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
    progressUpdates: string[]
    nextSteps: string[]
    learningPoints: string[]
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
    progressUpdates: update.progressUpdates || [],
    nextSteps: update.nextSteps || [],
    learningPoints: update.learningPoints || [],
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
  const seenIdStrings = seenIds.map((id) => id.toString())

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Pipeline Updates</h1>
          <p className="text-slate-500 text-sm">Latest product updates and improvements</p>
        </div>

        <Suspense>
          <DomainPills domains={allDomainOptions} activeDomain={searchParams.domain} />
        </Suspense>

        <UpdatesPageClient
          updates={serializedUpdates}
          savedIds={Array.from(savedIds)}
          seenIds={seenIdStrings}
          currentView={currentView}
          unseenCount={unseenCount}
          savedCount={savedCount}
          commentCounts={commentCounts}
        />
      </main>
    </div>
  )
}
