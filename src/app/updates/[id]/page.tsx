export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Update } from '@/models/Update'
import { Navbar } from '@/components/layout/navbar'
import { ComparisonView } from '@/features/updates/components/comparison-view'
import { SeenTracker } from '@/features/updates/components/seen-tracker'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function UpdateDetailPage({ params }: PageProps) {
  const { id } = await params
  const session = await getSession(await headers())
  if (!session || (session.user.role !== 'viewer' && session.user.role !== 'admin')) redirect('/about')

  await connectDB()
  const update = await Update.findById(id).populate('productId').populate('productIds').lean()

  if (!update) notFound()

  function toMarkdownString(val: unknown): string {
    if (Array.isArray(val)) return (val as string[]).map((s) => `- ${s}`).join('\n')
    return (val as string | undefined) || ''
  }

  type PopProduct = { _id: { toString(): string }; name: string; color: string; slug: string }
  function serializeUpdate(u: typeof update) {
    const rawProductIds = Array.isArray((u as { productIds?: PopProduct[] }).productIds) && (u as { productIds?: PopProduct[] }).productIds!.length > 0
      ? (u as { productIds: PopProduct[] }).productIds
      : u.productId ? [u.productId as unknown as PopProduct] : []
    return {
      title: u.title,
      summary: u.summary,
      date: u.date.toISOString(),
      progressUpdates: toMarkdownString(u.progressUpdates),
      nextSteps: toMarkdownString(u.nextSteps),
      learningPoints: toMarkdownString(u.learningPoints),
      media: (u.media as string[] | undefined) || [],
      productIds: rawProductIds.map((p) => ({
        _id: p._id.toString(),
        name: p.name || '',
        color: p.color || '#6366f1',
        slug: p.slug || '',
      })),
    }
  }

  const serialized = { ...serializeUpdate(update), _id: update._id.toString() }

  // Fetch previous update for the same product (for comparison)
  let serializedPrev: ReturnType<typeof serializeUpdate> | null = null
  if (update.productId) {
    const prevUpdate = await Update.findOne({
      productId: update.productId,
      date: { $lt: update.date },
      isPublished: true,
    })
      .sort({ date: -1 })
      .populate('productId')
      .lean()

    if (prevUpdate) {
      serializedPrev = serializeUpdate(prevUpdate as typeof update)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="px-6 py-10">
        <div className="mb-8">
          <Link
            href="/updates"
            className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors mb-6"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to changelog
          </Link>
        </div>

        <ComparisonView current={serialized} prev={serializedPrev} />
      </main>

      {update.isPublished && <SeenTracker updateId={id} />}
    </div>
  )
}
