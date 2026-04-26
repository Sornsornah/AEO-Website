export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { Product } from '@/models/Product'
import { Domain } from '@/models/Domain'
import { Tag } from '@/models/Tag'
import { Navbar } from '@/components/layout/Navbar'
import { AdminTabs } from '@/components/admin/AdminTabs'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') redirect('/updates')

  await connectDB()

  const [users, products, domains, tags] = await Promise.all([
    User.find().sort({ createdAt: -1 }).lean(),
    Product.find().sort({ name: 1 }).lean(),
    Domain.find().populate('members', 'name email').sort({ name: 1 }).lean(),
    Tag.find().sort({ name: 1 }).lean(),
  ])

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

  const serializedTags = tags.map((t) => ({
    _id: t._id.toString(),
    name: t.name,
    slug: t.slug,
  }))

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="px-6 py-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Admin</h1>
        </div>

        <AdminTabs
          users={serializedUsers}
          domains={serializedDomains}
          tags={serializedTags}
          currentUserId={session.user.id}
        />
      </main>
    </div>
  )
}
