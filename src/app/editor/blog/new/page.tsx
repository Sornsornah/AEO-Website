export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { Navbar } from '@/components/layout/Navbar'
import { BlogPostForm } from '@/components/editor/BlogPostForm'

export default async function NewBlogPostPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') redirect('/updates')

  await connectDB()
  const rawUsers = await User.find({ isWhitelisted: true }).select('name').sort({ name: 1 }).lean()
  const users = rawUsers.map((u) => ({ _id: u._id.toString(), name: u.name }))

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="px-6 py-10 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">New Blog Post</h1>
        <BlogPostForm users={users} />
      </main>
    </div>
  )
}
