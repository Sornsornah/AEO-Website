import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { Product } from '@/models/Product'
import { Update } from '@/models/Update'
import { Domain } from '@/models/Domain'
import { Navbar } from '@/components/layout/Navbar'
import { UserTable } from '@/components/admin/UserTable'
import { AddUserForm } from '@/components/admin/AddUserForm'
import { ProductTable } from '@/components/admin/ProductTable'
import { AddProductForm } from '@/components/admin/AddProductForm'
import { DomainTable } from '@/components/admin/DomainTable'
import { AddDomainForm } from '@/components/admin/AddDomainForm'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') redirect('/updates')

  await connectDB()

  const [users, products, updates, domains] = await Promise.all([
    User.find().sort({ createdAt: -1 }).lean(),
    Product.find().populate('domainId').sort({ name: 1 }).lean(),
    Update.find({}, { productId: 1 }).lean(),
    Domain.find().sort({ name: 1 }).lean(),
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
    role: u.role as 'viewer' | 'editor' | 'admin',
    isWhitelisted: u.isWhitelisted,
    createdAt: u.createdAt.toISOString(),
  }))

  const serializedDomains = domains.map((d) => ({
    _id: d._id.toString(),
    name: d.name,
    slug: d.slug,
    description: d.description,
    productCount: productCountByDomain[d._id.toString()] ?? 0,
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
    }
  })

  const whitelistedCount = serializedUsers.filter((u) => u.isWhitelisted).length

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
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

        {/* Users section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Users</h2>
              <p className="text-xs text-slate-400 mt-0.5">Manage access and roles</p>
            </div>
            <AddUserForm />
          </div>
          <UserTable users={serializedUsers} currentUserId={session.user.id} />
        </section>

        {/* Domains section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Domains</h2>
              <p className="text-xs text-slate-400 mt-0.5">Top-level groupings (e.g. Team 1)</p>
            </div>
            <AddDomainForm />
          </div>
          <DomainTable domains={serializedDomains} />
        </section>

        {/* Products section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Products</h2>
              <p className="text-xs text-slate-400 mt-0.5">Products that updates are grouped under (e.g. API)</p>
            </div>
            <AddProductForm domains={serializedDomains} />
          </div>
          <ProductTable products={serializedProducts} domains={serializedDomains} />
        </section>
      </main>
    </div>
  )
}
