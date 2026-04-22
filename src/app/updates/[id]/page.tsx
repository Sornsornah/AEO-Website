export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Update } from '@/models/Update'
import { Navbar } from '@/components/layout/Navbar'
import { ComparisonView } from '@/components/updates/ComparisonView'
import { SeenTracker } from '@/components/updates/SeenTracker'

interface PageProps {
  params: { id: string }
}

export default async function UpdateDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)

  await connectDB()
  const update = await Update.findById(params.id).populate('productId').lean()

  if (!update) notFound()

  // Viewers can only see published updates
  if (session?.user?.role === 'viewer' && !update.isPublished) {
    notFound()
  }

  function serializeUpdate(u: typeof update) {
    return {
      title: u.title,
      summary: u.summary,
      date: u.date.toISOString(),
      progressUpdates: (u.progressUpdates as string[] | undefined) || [],
      nextSteps: (u.nextSteps as string[] | undefined) || [],
      learningPoints: (u.learningPoints as string[] | undefined) || [],
      media: (u.media as string[] | undefined) || [],
      productId: {
        ...(u.productId as Record<string, unknown>),
        _id: (u.productId as { _id: { toString(): string } })?._id?.toString() || '',
      } as { _id: string; name: string; color: string; slug: string },
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
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-6"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to changelog
          </Link>
        </div>

        <ComparisonView current={serialized} prev={serializedPrev} />
      </main>

      {update.isPublished && <SeenTracker updateId={params.id} />}
    </div>
  )
}
