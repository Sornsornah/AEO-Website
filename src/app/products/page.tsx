import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'
import { Domain } from '@/models/Domain'
import { Update } from '@/models/Update'
import { Navbar } from '@/components/layout/Navbar'
import { ProductCard } from '@/components/products/ProductCard'

export default async function ProductsPage() {
  await getServerSession(authOptions)
  await connectDB()

  const [products, domains, updates] = await Promise.all([
    Product.find().populate('domainId').sort({ name: 1 }).lean(),
    Domain.find().sort({ name: 1 }).lean(),
    Update.find({ isPublished: true }, { productId: 1, title: 1, date: 1 }).sort({ date: -1 }).lean(),
  ])

  // Build update count and latest title per product
  const updateCountByProduct: Record<string, number> = {}
  const latestTitleByProduct: Record<string, string> = {}
  for (const u of updates) {
    const pid = u.productId?.toString()
    if (!pid) continue
    updateCountByProduct[pid] = (updateCountByProduct[pid] ?? 0) + 1
    if (!latestTitleByProduct[pid]) latestTitleByProduct[pid] = u.title
  }

  // Group products by domain
  const domainMap = new Map(domains.map((d) => [d._id.toString(), d]))

  interface ProductWithDomain {
    _id: string
    name: string
    slug: string
    description?: string
    color: string
    updateCount: number
    latestUpdateTitle?: string
  }

  const byDomain = new Map<string, { domainName: string; products: ProductWithDomain[] }>()
  const unassigned: ProductWithDomain[] = []

  for (const p of products) {
    const pid = p._id.toString()
    const serialized: ProductWithDomain = {
      _id: pid,
      name: p.name,
      slug: p.slug,
      description: p.description,
      color: p.color,
      updateCount: updateCountByProduct[pid] ?? 0,
      latestUpdateTitle: latestTitleByProduct[pid],
    }

    const domainDoc = p.domainId as { _id: { toString(): string } } | null
    const domainId = domainDoc?._id?.toString()

    if (domainId && domainMap.has(domainId)) {
      const d = domainMap.get(domainId)!
      if (!byDomain.has(domainId)) {
        byDomain.set(domainId, { domainName: d.name, products: [] })
      }
      byDomain.get(domainId)!.products.push(serialized)
    } else {
      unassigned.push(serialized)
    }
  }

  const domainGroups = Array.from(byDomain.values())
  if (unassigned.length > 0) {
    domainGroups.push({ domainName: 'Other', products: unassigned })
  }

  const totalProducts = products.length

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Products</h1>
          <p className="text-slate-500 text-sm">
            {totalProducts} product{totalProducts !== 1 ? 's' : ''} across {domainGroups.length} domain{domainGroups.length !== 1 ? 's' : ''}
          </p>
        </div>

        {domainGroups.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-sm">No products yet.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {domainGroups.map((group) => (
              <section key={group.domainName}>
                <h2 className="text-base font-semibold text-slate-900 mb-4">{group.domainName}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.products.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
