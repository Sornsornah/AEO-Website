import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Update } from '@/models/Update'
import { Product } from '@/models/Product'
import { Domain } from '@/models/Domain'
import { Tag } from '@/models/Tag'
import { Navbar } from '@/components/layout/Navbar'
import { UpdateForm } from '@/components/editor/UpdateForm'
import { format } from 'date-fns'

interface PageProps {
  params: { id: string }
}

export default async function EditUpdatePage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') redirect('/updates')

  await connectDB()

  const [update, products, domains, tags] = await Promise.all([
    Update.findById(params.id).lean(),
    Product.find({}).populate('domainId').sort({ name: 1 }).lean(),
    Domain.find().sort({ name: 1 }).lean(),
    Tag.find().sort({ name: 1 }).lean(),
  ])

  if (!update) notFound()

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

  // Support both new domainIds array and legacy single domainId
  const existingDomainIds: string[] =
    (update.domainIds as unknown[] | undefined)?.length
      ? (update.domainIds as unknown[]).map(String)
      : update.domainId
      ? [update.domainId.toString()]
      : []

  const defaultValues = {
    _id: update._id.toString(),
    title: update.title,
    summary: update.summary,
    domainIds: existingDomainIds,
    productId: update.productId?.toString() || '',
    tagIds: (update.tagIds as unknown[] | undefined)?.map(String) || [],
    date: format(update.date, 'yyyy-MM'),
    isPublished: update.isPublished,
    progressUpdates: (update.progressUpdates as string[] | undefined) || [],
    nextSteps: (update.nextSteps as string[] | undefined) || [],
    learningPoints: (update.learningPoints as string[] | undefined) || [],
    media: (update.media as string[] | undefined) || [],
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="px-6 py-10">
        <div className="mb-8">
          <Link
            href="/editor"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-6"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Edit Update</h1>
          <p className="text-slate-500 text-sm mt-1 line-clamp-1">{update.title}</p>
        </div>

        <UpdateForm mode="edit" domainGroups={domainGroups} allDomains={allDomains} allTags={allTags} defaultValues={defaultValues} />
      </main>
    </div>
  )
}
