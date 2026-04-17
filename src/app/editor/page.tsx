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
import { Button } from '@/components/ui/button'

const PAGE_SIZE = 20

interface PageProps {
  searchParams: {
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
    Update.find(query).populate({ path: 'productId', populate: { path: 'domainId' } }).sort({ date: sortDir }).skip(skip).limit(PAGE_SIZE).lean(),
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

  const serialized = (updates as Array<{
    _id: { toString(): string }
    title: string
    summary: string
    date: Date
    isPublished: boolean
    productId: unknown
  }>).map((u) => {
    const product = u.productId as { _id: { toString(): string }; name: string; color: string; domainId?: { name: string } } | null
    return {
      _id: u._id.toString(),
      title: u.title,
      summary: u.summary,
      date: u.date.toISOString(),
      isPublished: u.isPublished,
      productId: {
        _id: product?._id?.toString() || '',
        name: product?.name || '',
        color: product?.color || '#6366f1',
        domainName: product?.domainId?.name || '',
      },
    }
  })

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Editor Dashboard</h1>
            <p className="text-slate-500 text-sm">
              {totalCount} update{totalCount !== 1 ? 's' : ''}
              {hasFilters && <span className="text-slate-400 ml-1">(filtered)</span>}
            </p>
          </div>
          <Link href="/editor/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 text-sm">
              + New Update
            </Button>
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
