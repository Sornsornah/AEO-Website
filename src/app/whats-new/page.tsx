import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Update } from '@/models/Update'
import { UserSeenUpdate } from '@/models/UserSeenUpdate'
import { Navbar } from '@/components/layout/Navbar'
import { UpdateCard } from '@/components/updates/UpdateCard'

export default async function WhatsNewPage() {
  const session = await getServerSession(authOptions)

  await connectDB()

  const seenRecords = await UserSeenUpdate.find({ userId: session!.user.id })
    .select('updateId')
    .lean()

  const seenIds = seenRecords.map((r) => r.updateId)

  const unseenUpdates = await Update.find({
    _id: { $nin: seenIds },
    isPublished: true,
  })
    .populate('productId')
    .sort({ date: -1 })
    .lean()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            {"What's New"}
          </h1>
          <p className="text-slate-500 text-sm">
            Updates you haven&apos;t seen yet
            {unseenUpdates.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold bg-blue-600 text-white rounded-full">
                {unseenUpdates.length > 99 ? '99+' : unseenUpdates.length}
              </span>
            )}
          </p>
        </div>

        {unseenUpdates.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-slate-400">
                <path d="M10 2a8 8 0 100 16A8 8 0 0010 2z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-slate-900 font-medium mb-1">You&apos;re all caught up</h3>
            <p className="text-slate-400 text-sm">
              You&apos;ve seen all the latest updates.
            </p>
            <a href="/updates" className="text-blue-600 text-sm mt-3 inline-block hover:underline">
              Browse all updates
            </a>
          </div>
        ) : (
          <div className="mt-2">
            {unseenUpdates.map((update) => (
              <UpdateCard
                key={update._id.toString()}
                isNew
                update={{
                  ...update,
                  _id: update._id.toString(),
                  date: update.date.toISOString(),
                  productId: {
                    ...(update.productId as Record<string, unknown>),
                    _id: (update.productId as { _id: { toString(): string } })?._id?.toString() || '',
                  } as { _id: string; name: string; color: string; slug: string },
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
