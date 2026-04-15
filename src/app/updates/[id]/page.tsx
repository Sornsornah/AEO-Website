import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Update } from '@/models/Update'
import { Navbar } from '@/components/layout/Navbar'
import { UpdateDetail } from '@/components/updates/UpdateDetail'
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

  const serialized = {
    ...update,
    _id: update._id.toString(),
    date: update.date.toISOString(),
    productId: {
      ...(update.productId as Record<string, unknown>),
      _id: (update.productId as { _id: { toString(): string } })?._id?.toString() || '',
    } as { _id: string; name: string; color: string; slug: string },
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-10">
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

        <UpdateDetail update={serialized} />
      </main>

      {update.isPublished && <SeenTracker updateId={params.id} />}
    </div>
  )
}
