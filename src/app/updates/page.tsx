import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'
import { Update } from '@/models/Update'
import { Domain } from '@/models/Domain'
import { SavedUpdate } from '@/models/SavedUpdate'
import { UserSeenUpdate } from '@/models/UserSeenUpdate'
import { Navbar } from '@/components/layout/Navbar'
import { FilterBar } from '@/components/updates/FilterBar'
import { UpdatesPageClient } from '@/components/updates/UpdatesPageClient'

const PAGE_SIZE = 20

interface PageProps {
  searchParams: {
    product?: string
    domain?: string
    year?: string
    month?: string
    sort?: string
    id?: string
    view?: string
    search?: string
    page?: string
  }
}

export default async function UpdatesPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  await connectDB()

  const currentView = searchParams.view || 'all'
  const isWhatsNewView = currentView === 'new'
  const isSavedView = currentView === 'saved'
  const currentPage = parseInt(searchParams.page || '1', 10)

  // Fetch seen IDs + saved IDs once for filtering and badge counts
  let seenIds: unknown[] = []
  let unseenCount = 0
  const savedIds = new Set<string>()
  if (session) {
    const [seenRecords, savedRecords] = await Promise.all([
      UserSeenUpdate.find({ userId: session.user.id }).select('updateId').lean(),
      SavedUpdate.find({ userId: session.user.id }).select('updateId').lean(),
    ])
    seenIds = seenRecords.map((r) => r.updateId)
    for (const r of savedRecords) savedIds.add(r.updateId.toString())
    unseenCount = await Update.countDocuments({ isPublished: true, _id: { $nin: seenIds } })
  }

  const savedCount = savedIds.size

  const query: Record<string, unknown> = { isPublished: true }

  if (isWhatsNewView) {
    query._id = { $nin: seenIds }
  }

  if (!isSavedView) {
    if (searchParams.product) {
      const product = await Product.findOne({ slug: searchParams.product })
      if (product) query.productId = product._id
    } else if (searchParams.domain) {
      const domain = await Domain.findOne({ slug: searchParams.domain })
      if (domain) {
        const domainProducts = await Product.find({ domainId: domain._id }).select('_id').lean()
        query.productId = { $in: domainProducts.map((p) => p._id) }
      }
    }

    if (searchParams.year) {
      const year = parseInt(searchParams.year)
      if (searchParams.month) {
        const month = parseInt(searchParams.month) - 1
        query.date = {
          $gte: new Date(year, month, 1),
          $lt: new Date(year, month + 1, 1),
        }
      } else {
        query.date = {
          $gte: new Date(year, 0, 1),
          $lt: new Date(year + 1, 0, 1),
        }
      }
    }

    if (searchParams.search) {
      const escaped = searchParams.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { summary: { $regex: escaped, $options: 'i' } },
      ]
    }
  }

  const sortDir = searchParams.sort === 'asc' ? 1 : -1

  // Get distinct years from update dates
  const allDates = await Update.find({ isPublished: true }, { date: 1 }).lean()
  const yearSet = new Set<number>()
  for (const u of allDates) yearSet.add(new Date(u.date).getFullYear())
  const availableYears = Array.from(yearSet).sort((a, b) => b - a)

  const skip = (currentPage - 1) * PAGE_SIZE

  const [allProducts, allDomains, updates, totalCount] = await Promise.all([
    Product.find().populate('domainId').sort({ name: 1 }).lean(),
    Domain.find().sort({ name: 1 }).lean(),
    isSavedView
      ? SavedUpdate.find(session ? { userId: session.user.id } : { userId: null })
          .populate({ path: 'updateId', populate: { path: 'productId' } })
          .sort({ savedAt: -1 })
          .lean()
          .then((records) =>
            records
              .map((r) => r.updateId)
              .filter(Boolean) as Array<{
                _id: { toString(): string }
                title: string
                summary: string
                content: string
                date: Date
                highlights: string[]
                isPublished: boolean
                productId: { _id: { toString(): string }; name: string; color: string; slug: string }
              }>
          )
      : Update.find(query).populate('productId').sort({ date: sortDir }).skip(skip).limit(PAGE_SIZE).lean(),
    isSavedView ? Promise.resolve(0) : Update.countDocuments(query),
  ])

  // Build domain-grouped product list for FilterBar
  const domainMap = new Map(allDomains.map((d) => [d._id.toString(), d]))
  const domainGroupsMap = new Map<string, { _id: string; name: string; slug: string; products: { _id: string; name: string; slug: string; color: string }[] }>()
  const ungrouped: { _id: string; name: string; slug: string; color: string }[] = []

  for (const p of allProducts) {
    const domainDoc = p.domainId as { _id: { toString(): string } } | null
    const domainId = domainDoc?._id?.toString()
    const serializedProduct = {
      _id: p._id.toString(),
      name: p.name,
      slug: p.slug,
      color: p.color,
    }
    if (domainId && domainMap.has(domainId)) {
      if (!domainGroupsMap.has(domainId)) {
        const d = domainMap.get(domainId)!
        domainGroupsMap.set(domainId, { _id: domainId, name: d.name, slug: d.slug, products: [] })
      }
      domainGroupsMap.get(domainId)!.products.push(serializedProduct)
    } else {
      ungrouped.push(serializedProduct)
    }
  }

  const domainGroups = Array.from(domainGroupsMap.values())
  if (ungrouped.length > 0) {
    domainGroups.push({ _id: 'other', name: 'Other', slug: 'other', products: ungrouped })
  }

  // All domains for the domain filter dropdown (include domains with no products too)
  const allDomainOptions = allDomains.map((d) => ({ _id: d._id.toString(), name: d.name, slug: d.slug }))

  // Fetch selected update for side panel
  let selectedUpdate: {
    _id: string
    title: string
    summary: string
    content: string
    date: string
    highlights: string[]
    isPublished: boolean
    productId: { _id: string; name: string; color: string; slug: string }
  } | null = null

  if (searchParams.id) {
    const u = await Update.findById(searchParams.id).populate('productId').lean()
    if (u) {
      const p = u.productId as { _id: { toString(): string }; name: string; color: string; slug: string }
      selectedUpdate = {
        _id: u._id.toString(),
        title: u.title,
        summary: u.summary,
        content: u.content,
        date: u.date.toISOString(),
        highlights: u.highlights,
        isPublished: u.isPublished,
        productId: {
          _id: p?._id?.toString() || '',
          name: p?.name || '',
          color: p?.color || '#6366f1',
          slug: p?.slug || '',
        },
      }
    }
  }

  const hasFilters = !isSavedView && (searchParams.product || searchParams.domain || searchParams.year || searchParams.month || searchParams.search)

  const serializedUpdates = (updates as Array<{
    _id: { toString(): string }
    title: string
    summary: string
    date: Date
    highlights: string[]
    isPublished: boolean
    productId: unknown
  }>).map((update) => ({
    _id: update._id.toString(),
    title: update.title,
    summary: update.summary,
    date: update.date.toISOString(),
    highlights: update.highlights,
    isPublished: update.isPublished,
    productId: {
      _id: (update.productId as { _id: { toString(): string } })?._id?.toString() || '',
      name: (update.productId as { name: string })?.name || '',
      color: (update.productId as { color: string })?.color || '#6366f1',
      slug: (update.productId as { slug: string })?.slug || '',
    },
  }))

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Pipeline Updates</h1>
          <p className="text-slate-500 text-sm">Latest product updates and improvements</p>
        </div>

        {!isSavedView && (
          <Suspense>
            <FilterBar
              domains={domainGroups}
              allDomains={allDomainOptions}
              availableYears={availableYears}
              currentSearch={searchParams.search || ''}
            />
          </Suspense>
        )}

        <UpdatesPageClient
          updates={serializedUpdates}
          selectedUpdate={selectedUpdate}
          savedIds={Array.from(savedIds)}
          hasFilters={!!hasFilters}
          currentView={currentView}
          unseenCount={unseenCount}
          savedCount={savedCount}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={PAGE_SIZE}
        />
      </main>
    </div>
  )
}
