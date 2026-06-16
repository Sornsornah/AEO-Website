export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { Product } from '@/models/Product'
import { Domain } from '@/models/Domain'
import { BlogCategory } from '@/models/BlogCategory'
import { BlogPost } from '@/models/BlogPost'
import { HomeConfig } from '@/models/HomeConfig'
import { Navbar } from '@/components/layout/navbar'
import { AdminTabs } from '@/features/admin/components/admin-tabs'

const SEED_CATEGORIES = [
  { name: 'Thought Pieces', slug: 'thought-pieces', color: '#f97316', purpose: 'Opinion and perspective pieces that challenge assumptions or share points of view.' },
  { name: 'Learning Journey', slug: 'learning-journey', color: '#6366f1', purpose: 'Personal accounts of learning something new — documenting the process and insights.' },
  { name: 'Case Studies', slug: 'case-studies', color: '#10b981', purpose: 'In-depth looks at real problems, solutions, and outcomes from projects or initiatives.' },
  { name: 'How-To Guides', slug: 'how-to-guides', color: '#f59e0b', purpose: 'Step-by-step practical guides for getting things done.' },
  { name: 'News & Announcements', slug: 'news-announcements', color: '#8b5cf6', purpose: 'Updates, releases, and noteworthy events from the team.' },
]

const SLUG_MIGRATION_MAP: Record<string, string> = {
  thought: 'thought-pieces',
  'field-notes': 'case-studies',
  'deep-dive': 'how-to-guides',
}

export default async function AdminPage() {
  const session = await getSession(await headers())
  if (!session || session.user.role !== 'admin') redirect('/updates')

  await connectDB()

  const [users, products, domains, existingCategories, homeConfig] = await Promise.all([
    User.find().sort({ createdAt: -1 }).lean(),
    Product.find().populate('members', 'name email').sort({ name: 1 }).lean(),
    Domain.find().populate('members', 'name email').sort({ name: 1 }).lean(),
    BlogCategory.find().sort({ name: 1 }).lean(),
    HomeConfig.findOne({ key: 'home' }).lean(),
  ])

  // Positional slot array (index = slot, `null` = empty); preserve gaps.
  const featuredProductIds: (string | null)[] = (
    ((homeConfig as { featuredProductIds?: ({ toString(): string } | null)[] } | null)
      ?.featuredProductIds) ?? []
  ).map((id) => (id == null ? null : id.toString()))

  // First-time seeding + migration of old blog post category slugs
  if (existingCategories.length === 0) {
    await BlogCategory.insertMany(SEED_CATEGORIES)
    for (const [oldSlug, newSlug] of Object.entries(SLUG_MIGRATION_MAP)) {
      await BlogPost.updateMany({ category: oldSlug }, { $set: { category: newSlug } })
    }
  }

  const blogCategories = existingCategories.length > 0
    ? existingCategories
    : await BlogCategory.find().sort({ name: 1 }).lean()

  const productCountByDomain: Record<string, number> = {}
  for (const p of products) {
    const did = p.domainId?.toString()
    if (did) productCountByDomain[did] = (productCountByDomain[did] ?? 0) + 1
  }

  const serializedUsers = users.map((u) => ({
    _id: u._id.toString(),
    email: u.email,
    name: u.name,
    role: u.role as 'public' | 'viewer' | 'admin',
    createdAt: u.createdAt.toISOString(),
  }))

  const serializedProducts = products.map((p) => ({
    _id: p._id.toString(),
    name: p.name,
    slug: p.slug,
    logoUrl: p.logoUrl,
    color: p.color,
    members: ((p.members as unknown) as { _id: { toString(): string }; name: string }[] || []).map((m) => ({
      _id: m._id.toString(),
      name: m.name,
    })),
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

  const serializedBlogCategories = blogCategories.map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    purpose: c.purpose,
    color: c.color,
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
          products={serializedProducts}
          domains={serializedDomains}
          blogCategories={serializedBlogCategories}
          featuredProductIds={featuredProductIds}
          currentUserId={session.user.id}
        />
      </main>
    </div>
  )
}
