import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Update } from '@/models/Update'
import { Product } from '@/models/Product'
import { Domain } from '@/models/Domain'
import { Navbar } from '@/components/layout/Navbar'
import { UpdateForm } from '@/components/editor/UpdateForm'
import { format } from 'date-fns'

interface PageProps {
  params: { id: string }
}

export default async function EditUpdatePage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'editor' && session.user.role !== 'admin') redirect('/updates')

  await connectDB()

  const [update, products, domains] = await Promise.all([
    Update.findById(params.id).lean(),
    Product.find().populate('domainId').sort({ name: 1 }).lean(),
    Domain.find().sort({ name: 1 }).lean(),
  ])

  if (!update) notFound()

  const domainMap = new Map(domains.map((d) => [d._id.toString(), d.name]))
  const groupMap = new Map<string, { _id: string; name: string; products: { _id: string; name: string; color: string }[] }>()
  const ungrouped: { _id: string; name: string; color: string }[] = []

  for (const p of products) {
    const domainDoc = p.domainId as { _id: { toString(): string } } | null
    const domainId = domainDoc?._id?.toString()
    const sp = { _id: p._id.toString(), name: p.name, color: p.color }
    if (domainId && domainMap.has(domainId)) {
      if (!groupMap.has(domainId)) groupMap.set(domainId, { _id: domainId, name: domainMap.get(domainId)!, products: [] })
      groupMap.get(domainId)!.products.push(sp)
    } else {
      ungrouped.push(sp)
    }
  }

  const domainGroups = Array.from(groupMap.values())
  if (ungrouped.length > 0) domainGroups.push({ _id: 'other', name: 'Other', products: ungrouped })

  const defaultValues = {
    _id: update._id.toString(),
    title: update.title,
    summary: update.summary,
    content: update.content,
    productId: update.productId.toString(),
    date: format(update.date, 'yyyy-MM-dd'),
    highlights: update.highlights,
    isPublished: update.isPublished,
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 py-10">
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

        <UpdateForm mode="edit" domainGroups={domainGroups} defaultValues={defaultValues} />
      </main>
    </div>
  )
}
