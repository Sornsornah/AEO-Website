import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { Product } from '@/models/Product'
import { Update } from '@/models/Update'
import { Domain } from '@/models/Domain'
import { Navbar } from '@/components/layout/Navbar'
import { AdminTabs } from '@/components/admin/AdminTabs'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') redirect('/updates')

  await connectDB()

  const [users, products, updates, domains] = await Promise.all([
    User.find().sort({ createdAt: -1 }).lean(),
    Product.find().populate('domainId').populate('members', 'name email').sort({ name: 1 }).lean(),
    Update.find({}, { productId: 1 }).lean(),
    Domain.find().populate('members', 'name email').sort({ name: 1 }).lean(),
  ])

  const updateCountByProduct: Record<string, number> = {}
  for (const u of updates) {
    const pid = u.productId?.toString()
    if (pid) updateCountByProduct[pid] = (updateCountByProduct[pid] ?? 0) + 1
  }

  const productCountByDomain: Record<string, number> = {}
  for (const p of products) {
    const did = p.domainId?.toString()
    if (did) productCountByDomain[did] = (productCountByDomain[did] ?? 0) + 1
  }

  const serializedUsers = users.map((u) => ({
    _id: u._id.toString(),
    email: u.email,
    name: u.name,
    role: u.role as 'viewer' | 'admin',
    isWhitelisted: u.isWhitelisted,
    createdAt: u.createdAt.toISOString(),
  }))

  const serializedDomains = domains.map((d) => ({
    _id: d._id.toString(),
    name: d.name,
    slug: d.slug,
    description: d.description,
    productCount: productCountByDomain[d._id.toString()] ?? 0,
    members: ((d.members as unknown) as { _id: { toString(): string }; name: string; email: string }[] || []).map((m) => ({
      _id: m._id.toString(),
      name: m.name,
      email: m.email,
    })),
  }))

  const serializedProducts = products.map((p) => {
    const domainDoc = p.domainId as { _id: { toString(): string }; name: string } | null
    return {
      _id: p._id.toString(),
      name: p.name,
      slug: p.slug,
      description: p.description,
      color: p.color,
      domainId: domainDoc?._id?.toString(),
      domainName: domainDoc?.name,
      updateCount: updateCountByProduct[p._id.toString()] ?? 0,
      websiteUrl: p.websiteUrl,
      deckUrl: p.deckUrl,
      logoUrl: p.logoUrl,
      members: ((p.members as unknown) as { _id: { toString(): string }; name: string; email: string }[] || []).map((m) => ({
        _id: m._id.toString(),
        name: m.name,
        email: m.email,
      })),
    }
  })

  const whitelistedCount = serializedUsers.filter((u) => u.isWhitelisted).length

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Admin</h1>
          <p className="text-slate-500 text-sm">
            {serializedUsers.length} user{serializedUsers.length !== 1 ? 's' : ''}
            <span className="text-slate-300 mx-2">·</span>
            {whitelistedCount} with access
            <span className="text-slate-300 mx-2">·</span>
            {serializedDomains.length} domain{serializedDomains.length !== 1 ? 's' : ''}
            <span className="text-slate-300 mx-2">·</span>
            {serializedProducts.length} product{serializedProducts.length !== 1 ? 's' : ''}
          </p>
        </div>

        <AdminTabs
          users={serializedUsers}
          domains={serializedDomains}
          products={serializedProducts}
          currentUserId={session.user.id}
        />
      </main>
    </div>
  )
}
