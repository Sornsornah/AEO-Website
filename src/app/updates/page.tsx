export const dynamic = 'force-dynamic'

import { Types } from 'mongoose'
import { headers } from 'next/headers'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'
import { Update } from '@/models/Update'
import { Domain } from '@/models/Domain'
import { UserSeenUpdate } from '@/models/UserSeenUpdate'
import { Comment } from '@/models/Comment'
import { Tag } from '@/models/Tag'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { PageBanner } from '@/components/layout/page-banner'
import { UpdatesPageClient } from '@/features/updates/components/updates-page-client'

interface PageProps {
  searchParams: Promise<{
    domain?: string
    product?: string
    view?: string
    comments?: string
  }>
}

function toMarkdownString(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val.map((s) => `- ${s}`).join('\n')
  return val || ''
}

export default async function UpdatesPage({ searchParams: searchParamsPromise }: PageProps) {
  const searchParams = await searchParamsPromise
  const session = await getSession(await headers())
  if (!session || (session.user.role !== 'viewer' && session.user.role !== 'admin')) redirect('/about')
  await connectDB()
  void Tag // ensure Tag schema is registered for populate('tagIds')

  // Auto-publish any updates whose scheduled time has passed
  await Update.updateMany(
    { isPublished: false, scheduledAt: { $lte: new Date() } },
    { $set: { isPublished: true } }
  )

  const currentView = searchParams.view || 'all'
  const isWhatsNewView = currentView === 'new'

  // Fetch seen IDs
  let seenIds: Types.ObjectId[] = []
  if (session) {
    const seenRecords = await UserSeenUpdate.find({ userId: session.user.id }).select('updateId').lean()
    seenIds = seenRecords.map((r) => r.updateId as Types.ObjectId)
  }

  // Build query
  const now = new Date()
  const andConditions: Record<string, unknown>[] = [
    { $or: [{ isPublished: true }, { scheduledAt: { $lte: now } }] },
  ]

  if (isWhatsNewView) {
    andConditions.push({ _id: { $nin: seenIds } })
  }

  if (searchParams.domain) {
    const domain = await Domain.findOne({ slug: searchParams.domain })
    if (domain) {
      const domainProducts = await Product.find({ domainId: domain._id }).select('_id').lean()
      const ids = domainProducts.map((p) => p._id)
      andConditions.push({ $or: [{ productId: { $in: ids } }, { productIds: { $in: ids } }] })
    }
  } else if (searchParams.product) {
    const product = await Product.findOne({ slug: searchParams.product }).select('_id').lean()
    if (product) {
      andConditions.push({ $or: [{ productId: product._id }, { productIds: product._id }] })
    }
  }

  const query: Record<string, unknown> = andConditions.length === 1 ? andConditions[0] : { $and: andConditions }

  // Fetch all domains, products, and updates
  const [allDomains, allProducts, updates] = await Promise.all([
    Domain.find().lean(),
    Product.find().select('name slug').sort({ name: 1 }).lean(),
    Update.find(query)
      .populate({ path: 'productId', populate: { path: 'domainId' } })
      .populate({ path: 'productIds', populate: { path: 'domainId' } })
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
    order?: number
    progressUpdates: string | string[] | undefined
    nextSteps: string | string[] | undefined
    learningPoints: string | string[] | undefined
    media: string[]
    isPublished: boolean
    productId: unknown
    productIds: unknown[]
    domainIds: unknown[]
    tagIds: unknown[]
  }>).map((update) => {
    type PopProduct = { _id: { toString(): string }; name: string; color: string; slug: string; domainId?: { name?: string } }
    const rawProductIds = Array.isArray(update.productIds) && update.productIds.length > 0
      ? (update.productIds as PopProduct[])
      : update.productId ? [update.productId as PopProduct] : []
    return {
    _id: update._id.toString(),
    title: update.title,
    summary: update.summary,
    date: update.date.toISOString(),
    order: update.order ?? 0,
    progressUpdates: toMarkdownString(update.progressUpdates),
    nextSteps: toMarkdownString(update.nextSteps),
    learningPoints: toMarkdownString(update.learningPoints),
    media: update.media || [],
    isPublished: update.isPublished,
    productIds: rawProductIds.map((p) => ({
      _id: p._id.toString(),
      name: p.name || '',
      color: p.color || '#6366f1',
      slug: p.slug || '',
      domainName: p.domainId?.name || '',
    })),
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
  }
  })

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

      <PageBanner pageKey="updates" />

      <main className="px-6 py-10">
        <UpdatesPageClient
          updates={serializedUpdates}
          commentCounts={commentCounts}
          domains={allDomainOptions}
          activeDomain={searchParams.domain}
          products={allProductOptions}
          activeProduct={searchParams.product}
          openComments={searchParams.comments}
        />
      </main>
    </div>
  )
}
