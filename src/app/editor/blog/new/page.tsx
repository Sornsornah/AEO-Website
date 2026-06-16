export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { Navbar } from '@/components/layout/navbar'
import { BlogPostForm } from '@/features/editor/components/blog-post-form'

export default async function NewBlogPostPage() {
  const session = await getSession(await headers())
  if (!session) redirect('/blog')

  const isAdmin = session.user.role === 'admin'

  let users: { _id: string; name: string }[] = []
  if (isAdmin) {
    await connectDB()
    const rawUsers = await User.find({ role: { $in: ['viewer', 'admin'] } }).select('name').sort({ name: 1 }).lean()
    users = rawUsers.map((u) => ({ _id: u._id.toString(), name: u.name }))
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">New Blog Post</h1>
        <BlogPostForm users={users} isAdmin={isAdmin} currentUserName={session.user.name} />
      </main>
    </div>
  )
}
