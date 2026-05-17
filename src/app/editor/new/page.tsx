export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'
import { Domain } from '@/models/Domain'
import { Tag } from '@/models/Tag'
import { Navbar } from '@/components/layout/navbar'
import { UpdateForm } from '@/features/editor/components/update-form'

export default async function NewUpdatePage() {
  const session = await getSession(await headers())
  if (!session || session.user.role !== 'admin') redirect('/updates')

  await connectDB()
  const [products, domains, tags] = await Promise.all([
    Product.find({}).populate('domainId').sort({ name: 1 }).lean(),
    Domain.find().sort({ name: 1 }).lean(),
    Tag.find().sort({ name: 1 }).lean(),
  ])

  // Pre-populate all domains (even those with no products) so every domain is selectable
  const groupMap = new Map<string, { _id: string; name: string; products: { _id: string; name: string; color: string }[] }>(
    domains.map((d) => [d._id.toString(), { _id: d._id.toString(), name: d.name, products: [] }])
  )

  for (const p of products) {
    const domainDoc = p.domainId as { _id: { toString(): string } } | null
    const domainId = domainDoc?._id?.toString()
    if (domainId && groupMap.has(domainId)) {
      groupMap.get(domainId)!.products.push({ _id: p._id.toString(), name: p.name, color: p.color })
    }
  }

  const domainGroups = Array.from(groupMap.values())
  const allDomains = domains.map((d) => ({ _id: d._id.toString(), name: d.name }))
  const allTags = tags.map((t) => ({ _id: t._id.toString(), name: t.name }))

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="px-8 py-8">
        <div className="mb-6">
          <Link
            href="/editor"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-4"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">New Update</h1>
          <p className="text-slate-500 text-sm mt-1">Create a new product update post</p>
        </div>

        <UpdateForm mode="create" domainGroups={domainGroups} allDomains={allDomains} allTags={allTags} />
      </main>
    </div>
  )
}
