import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Update } from '@/models/Update'
import { Navbar } from '@/components/layout/Navbar'
import { UpdateTable } from '@/components/editor/UpdateTable'
import { Button } from '@/components/ui/button'

export default async function EditorPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'editor' && session.user.role !== 'admin')) redirect('/updates')

  await connectDB()

  const updates = await Update.find({})
    .populate('productId')
    .sort({ date: -1 })
    .lean()

  const serialized = updates.map((u) => ({
    _id: u._id.toString(),
    title: u.title,
    summary: u.summary,
    date: u.date.toISOString(),
    isPublished: u.isPublished,
    productId: {
      _id: (u.productId as { _id: { toString(): string } })?._id?.toString() || '',
      name: (u.productId as { name: string })?.name || '',
      color: (u.productId as { color: string })?.color || '#6366f1',
    },
  }))

  const publishedCount = serialized.filter((u) => u.isPublished).length
  const draftCount = serialized.filter((u) => !u.isPublished).length

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Editor Dashboard</h1>
            <p className="text-slate-500 text-sm">
              {serialized.length} update{serialized.length !== 1 ? 's' : ''} total
              {draftCount > 0 && (
                <span className="text-amber-600 ml-2">· {draftCount} draft{draftCount !== 1 ? 's' : ''}</span>
              )}
              {publishedCount > 0 && (
                <span className="text-green-600 ml-2">· {publishedCount} published</span>
              )}
            </p>
          </div>
          <Link href="/editor/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 text-sm">
              + New Update
            </Button>
          </Link>
        </div>

        <UpdateTable updates={serialized} />
      </main>
    </div>
  )
}
