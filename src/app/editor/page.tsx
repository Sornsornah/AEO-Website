export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Update } from '@/models/Update'
import { Product } from '@/models/Product'
import { Domain } from '@/models/Domain'
import { Navbar } from '@/components/layout/Navbar'
import { UpdateTable } from '@/components/editor/UpdateTable'
import { FilterBar } from '@/components/updates/FilterBar'
import { EditorProductsList } from '@/components/editor/EditorProductsList'
import { Button } from '@/components/ui/button'

const PAGE_SIZE = 20

interface PageProps {
  searchParams: {
    tab?: string
    product?: string
    domain?: string
    year?: string
    month?: string
    sort?: string
    search?: string
    status?: string
    page?: string
  }
}

export default async function EditorPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') redirect('/updates')

  await connectDB()

  const activeTab = searchParams.tab === 'products' ? 'products' : 'updates'

  // Products tab — just fetch products and return early
  if (activeTab === 'products') {
    const allProducts = await Product.find().populate('domainId').sort({ order: 1, name: 1 }).lean()
    const serializedProducts = (allProducts as Array<{
      _id: { toString(): string }
      name: string
      slug: string
      description?: string
      color: string
      logoUrl?: string
      status?: string
    }>).map((p) => ({
      _id: p._id.toString(),
      name: p.name,
      slug: p.slug,
      description: p.description,
      color: p.color,
      logoUrl: p.logoUrl,
      status: p.status || 'live',
    }))

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Editor Dashboard</h1>
          </div>
          {/* Tab switcher */}
          <div className="flex items-center gap-1 border-b border-slate-200 mb-8">
            <Link
              href="/editor"
              className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 border-b-2 border-transparent -mb-px transition-colors"
            >
              Updates
            </Link>
            <Link
              href="/editor?tab=products"
              className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors border-slate-900 text-slate-900"
            >
              Products
            </Link>
          </div>
          {/* Products list */}
          <EditorProductsList initialProducts={serializedProducts} />
        </main>
      </div>
    )
  }

  const currentPage = parseInt(searchParams.page || '1', 10)
  const sortDir = searchParams.sort === 'asc' ? 1 : -1

  // Build query
  const query: Record<string, unknown> = {}

  // Status filter
  if (searchParams.status === 'draft') query.isPublished = false
  else if (searchParams.status === 'published') query.isPublished = true

  // Product / domain filter
  if (searchParams.product) {
    const product = await Product.findOne({ slug: searchParams.product })
    if (product) query.productId = product._id
  } else if (searchParams.domain) {
    const domain = await Domain.findOne({ slug: searchParams.domain })
    if (domain) {
      const domainProducts = await Product.find({ domainId: domain._id }, { _id: 1 }).lean()
      query.productId = { $in: domainProducts.map((p) => p._id) }
    }
  }

  // Year / month filter
  if (searchParams.year) {
    const year = parseInt(searchParams.year)
    if (searchParams.month) {
      const month = parseInt(searchParams.month) - 1
      query.date = { $gte: new Date(year, month, 1), $lt: new Date(year, month + 1, 1) }
    } else {
      query.date = { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) }
    }
  }

  // Search filter
  if (searchParams.search) {
    const escaped = searchParams.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { summary: { $regex: escaped, $options: 'i' } },
    ]
  }

  // Available years
  const allDates = await Update.find({}, { date: 1 }).lean()
  const yearSet = new Set<number>()
  for (const u of allDates) yearSet.add(new Date(u.date).getFullYear())
  const availableYears = Array.from(yearSet).sort((a, b) => b - a)

  const skip = (currentPage - 1) * PAGE_SIZE

  const [allProducts, allDomains, updates, totalCount] = await Promise.all([
    Product.find({}).populate('domainId').sort({ name: 1 }).lean(),
    Domain.find().sort({ name: 1 }).lean(),
    Update.find(query)
      .populate({ path: 'productId', populate: { path: 'domainId' } })
      .populate({ path: 'productIds', populate: { path: 'domainId' } })
      .populate('domainIds')
      .sort({ date: sortDir }).skip(skip).limit(PAGE_SIZE).lean(),
    Update.countDocuments(query),
  ])

  // Build domain-grouped product list for FilterBar
  const domainMap = new Map(allDomains.map((d) => [d._id.toString(), d]))
  const domainGroupsMap = new Map<string, { _id: string; name: string; slug: string; products: { _id: string; name: string; slug: string; color: string }[] }>()
  const ungrouped: { _id: string; name: string; slug: string; color: string }[] = []

  for (const p of allProducts) {
    const domainDoc = p.domainId as { _id: { toString(): string } } | null
    const domainId = domainDoc?._id?.toString()
    const serializedProduct = { _id: p._id.toString(), name: p.name, slug: p.slug, color: p.color }
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

  const allDomainOptions = allDomains.map((d) => ({ _id: d._id.toString(), name: d.name, slug: d.slug }))

  const hasFilters = !!(
    searchParams.product ||
    searchParams.domain ||
    searchParams.year ||
    searchParams.month ||
    searchParams.search ||
    searchParams.status
  )

  type PopulatedProduct = { _id: { toString(): string }; name: string; color: string; domainId?: { name: string } }
  type PopulatedDomain = { _id: { toString(): string }; name: string }

  const serialized = (updates as Array<{
    _id: { toString(): string }
    title: string
    summary: string
    date: Date
    isPublished: boolean
    scheduledAt?: Date
    productId: unknown
    productIds: unknown[]
    domainIds: unknown[]
  }>).map((u) => {
    // Merge legacy single fields with array fields, deduplicate by id
    const legacyProduct = u.productId as PopulatedProduct | null
    const allProducts: PopulatedProduct[] = [
      ...(Array.isArray(u.productIds) ? u.productIds as PopulatedProduct[] : []),
      ...(legacyProduct && !(u.productIds as unknown[])?.some((p) => (p as PopulatedProduct)?._id?.toString() === legacyProduct._id?.toString()) ? [legacyProduct] : []),
    ].filter(Boolean)

    const allDomains: PopulatedDomain[] = Array.isArray(u.domainIds) ? u.domainIds as PopulatedDomain[] : []

    // Also collect domains from products if domainIds is empty
    const domainNamesFromProducts = allProducts.map((p) => p.domainId?.name).filter(Boolean) as string[]
    const domainNames = allDomains.length > 0
      ? allDomains.map((d) => d.name)
      : domainNamesFromProducts

    return {
      _id: u._id.toString(),
      title: u.title,
      summary: u.summary,
      date: u.date.toISOString(),
      isPublished: u.isPublished,
      scheduledAt: u.scheduledAt ? u.scheduledAt.toISOString() : null,
      products: allProducts.map((p) => ({
        _id: p._id.toString(),
        name: p.name,
        color: p.color,
      })),
      domainNames: Array.from(new Set(domainNames)),
    }
  })

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Editor Dashboard</h1>
          <Link href="/editor/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 text-sm">
              + New Update
            </Button>
          </Link>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
          <Link
            href="/editor"
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors border-slate-900 text-slate-900"
          >
            Updates
          </Link>
          <Link
            href="/editor?tab=products"
            className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 border-b-2 border-transparent -mb-px transition-colors"
          >
            Products
          </Link>
        </div>

        <Suspense>
          <FilterBar
            domains={domainGroups}
            allDomains={allDomainOptions}
            availableYears={availableYears}
            currentSearch={searchParams.search || ''}
            showStatus
          />
        </Suspense>

        <UpdateTable
          updates={serialized}
          hasFilters={hasFilters}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={PAGE_SIZE}
        />
      </main>
    </div>
  )
}
