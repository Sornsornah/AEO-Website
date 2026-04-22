export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { SavedUpdate } from '@/models/SavedUpdate'
import { Navbar } from '@/components/layout/Navbar'
import { UpdateCard } from '@/components/updates/UpdateCard'

export default async function SavedPage() {
  const session = await getServerSession(authOptions)

  await connectDB()

  const savedRecords = await SavedUpdate.find({ userId: session!.user.id })
    .populate({
      path: 'updateId',
      populate: { path: 'productId' },
    })
    .sort({ savedAt: -1 })
    .lean()

  const updates = savedRecords
    .map((r) => r.updateId)
    .filter(Boolean) as Array<{
      _id: { toString(): string }
      title: string
      summary: string
      date: Date
      highlights: string[]
      isPublished: boolean
      productId: { _id: { toString(): string }; name: string; color: string; slug: string }
    }>

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Saved</h1>
          <p className="text-slate-500 text-sm">Updates you&apos;ve bookmarked</p>
        </div>

        {updates.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-slate-400">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-slate-900 font-medium mb-1">No saved updates</h3>
            <p className="text-slate-400 text-sm">
              Bookmark updates to find them here later.
            </p>
            <a href="/updates" className="text-blue-600 text-sm mt-3 inline-block hover:underline">
              Browse all updates
            </a>
          </div>
        ) : (
          <div className="mt-2">
            {updates.map((update) => (
              <UpdateCard
                key={update._id.toString()}
                isSaved
                update={{
                  _id: update._id.toString(),
                  title: update.title,
                  summary: update.summary,
                  date: update.date.toISOString(),
                  highlights: update.highlights,
                  isPublished: update.isPublished,
                  productId: {
                    _id: update.productId?._id?.toString() || '',
                    name: update.productId?.name || '',
                    color: update.productId?.color || '#6366f1',
                    slug: update.productId?.slug || '',
                  },
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
