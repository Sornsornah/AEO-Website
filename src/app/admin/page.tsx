export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { Product } from '@/models/Product'
import { Domain } from '@/models/Domain'
import { Tag } from '@/models/Tag'
import { BlogCategory } from '@/models/BlogCategory'
import { BlogPost } from '@/models/BlogPost'
import { ActivityLog } from '@/models/ActivityLog'
import { PageSetting } from '@/models/PageSetting'
import { Navbar } from '@/components/layout/Navbar'
import { AdminTabs } from '@/components/admin/AdminTabs'

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
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') redirect('/updates')

  await connectDB()

  const [users, products, domains, tags, existingCategories, existingPageSettings, initialLogs, initialLogsTotal, allBlogPosts] = await Promise.all([
    User.find().sort({ createdAt: -1 }).lean(),
    Product.find().populate('members', 'name email').sort({ name: 1 }).lean(),
    Domain.find().populate('members', 'name email').sort({ name: 1 }).lean(),
    Tag.find().sort({ name: 1 }).lean(),
    BlogCategory.find().sort({ name: 1 }).lean(),
    PageSetting.find().sort({ order: 1 }).lean(),
    ActivityLog.find().sort({ createdAt: -1 }).limit(50).lean(),
    ActivityLog.countDocuments(),
    BlogPost.find().sort({ publishedAt: -1 }).select('_id title slug bannerEnabled bannerText bannerStyle followParentBanner').lean(),
  ])

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

  // Seed page settings on first load
  let pageSettingsData = existingPageSettings
  if (pageSettingsData.length === 0) {
    await PageSetting.insertMany([
      { pageKey: 'about', label: 'About Us', href: '/about', navEnabled: true, order: 0, bannerEnabled: false, bannerText: '', bannerStyle: 'warning', adminOnly: false },
      { pageKey: 'products', label: 'Products', href: '/products', navEnabled: true, order: 1, bannerEnabled: false, bannerText: '', bannerStyle: 'warning', adminOnly: false },
      { pageKey: 'blog', label: 'Blog', href: '/blog', navEnabled: true, order: 2, bannerEnabled: false, bannerText: '', bannerStyle: 'warning', adminOnly: false },
      { pageKey: 'updates', label: 'Internal Updates', href: '/updates', navEnabled: true, order: 3, bannerEnabled: true, bannerText: 'Restricted Access — this page is intended for authorised internal users only.', bannerStyle: 'warning', adminOnly: true },
    ])
    pageSettingsData = await PageSetting.find().sort({ order: 1 }).lean()
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

  const serializedProducts = products.map((p) => ({
    _id: p._id.toString(),
    name: p.name,
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

  const serializedTags = tags.map((t) => ({
    _id: t._id.toString(),
    name: t.name,
    slug: t.slug,
  }))

  const serializedBlogCategories = blogCategories.map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    purpose: c.purpose,
    color: c.color,
  }))

  const serializedPageSettings = pageSettingsData.map((p) => ({
    pageKey: p.pageKey,
    label: p.label,
    href: p.href,
    navEnabled: p.navEnabled,
    order: p.order,
    bannerEnabled: p.bannerEnabled,
    bannerText: p.bannerText,
    bannerStyle: p.bannerStyle as 'info' | 'warning' | 'success' | 'neutral',
    adminOnly: p.adminOnly,
  }))

  const serializedProductBanners = products.map((p) => ({
    _id: p._id.toString(),
    name: p.name,
    slug: p.slug,
    bannerEnabled: !!(p as typeof p & { bannerEnabled?: boolean }).bannerEnabled,
    bannerText: (p as typeof p & { bannerText?: string }).bannerText || '',
    bannerStyle: ((p as typeof p & { bannerStyle?: string }).bannerStyle || 'warning') as 'info' | 'warning' | 'success' | 'neutral',
    followParentBanner: !!(p as typeof p & { followParentBanner?: boolean }).followParentBanner,
  }))

  const serializedBlogBanners = allBlogPosts.map((p) => ({
    _id: p._id.toString(),
    name: p.title,
    slug: p.slug,
    bannerEnabled: !!(p as typeof p & { bannerEnabled?: boolean }).bannerEnabled,
    bannerText: (p as typeof p & { bannerText?: string }).bannerText || '',
    bannerStyle: ((p as typeof p & { bannerStyle?: string }).bannerStyle || 'warning') as 'info' | 'warning' | 'success' | 'neutral',
    followParentBanner: !!(p as typeof p & { followParentBanner?: boolean }).followParentBanner,
  }))

  type IdNameMap = Record<string, string>

  function toIdNameMap(docs: { _id: unknown; name: string }[]): IdNameMap {
    const map: IdNameMap = {}
    for (const d of docs) map[String(d._id)] = d.name
    return map
  }

  function resolveArray(arr: unknown, nameMap: IdNameMap): string[] {
    if (!Array.isArray(arr)) return []
    return arr.map((item) => {
      if (item === null || item === undefined) return ''
      if (typeof item === 'object') {
        const obj = item as Record<string, unknown>
        if (typeof obj.name === 'string' && obj.name) return obj.name
        if (obj._id) { const n = nameMap[String(obj._id)]; if (n) return n }
      }
      const id = String(item)
      return nameMap[id] ?? id
    }).filter(Boolean)
  }

  const productNames = toIdNameMap(products as { _id: unknown; name: string }[])
  const domainNames = toIdNameMap(domains as { _id: unknown; name: string }[])
  const tagNames = toIdNameMap(tags as { _id: unknown; name: string }[])
  const FIELD_NAME_MAP: Record<string, IdNameMap> = {
    productIds: productNames,
    domainIds: domainNames,
    tagIds: tagNames,
  }

  const serializedLogs = initialLogs.map((log) => ({
    _id: log._id.toString(),
    userId: log.userId.toString(),
    userName: log.userName,
    action: log.action as 'create' | 'update' | 'reorder',
    entityType: log.entityType as 'update' | 'product' | 'blog' | 'product_order' | 'external_article' | 'external_article_order',
    entityId: log.entityId.toString(),
    entityTitle: log.entityTitle,
    changes: (log.changes as { field: string; before: unknown; after: unknown }[]).map((change) => {
      const nameMap = FIELD_NAME_MAP[change.field]
      if (!nameMap) return change
      return {
        field: change.field,
        before: resolveArray(change.before, nameMap),
        after: resolveArray(change.after, nameMap),
      }
    }),
    beforeSnapshot: (log.beforeSnapshot as Record<string, unknown> | null | undefined) ?? null,
    afterSnapshot: (log.afterSnapshot as Record<string, unknown> | null | undefined) ?? null,
    createdAt: (log.createdAt as Date).toISOString(),
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
          tags={serializedTags}
          blogCategories={serializedBlogCategories}
          pageSettings={serializedPageSettings}
          productBanners={serializedProductBanners}
          blogBanners={serializedBlogBanners}
          currentUserId={session.user.id}
          initialLogs={serializedLogs}
          initialLogsTotal={initialLogsTotal}
        />
      </main>
    </div>
  )
}
