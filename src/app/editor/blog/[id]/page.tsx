export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { BlogPost } from '@/models/BlogPost'
import { User } from '@/models/User'
import { Navbar } from '@/components/layout/navbar'
import { BlogPostForm } from '@/features/editor/components/blog-post-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditBlogPostPage({ params }: PageProps) {
  const { id } = await params
  const session = await getSession(await headers())
  if (!session) redirect('/blog')

  await connectDB()
  const raw = await BlogPost.findById(id).lean()
  if (!raw) notFound()

  const isAdmin = session.user.role === 'admin'
  const isOwner = raw.createdBy?.toString() === session.user.id

  if (!isAdmin && !isOwner) redirect('/blog')

  let users: { _id: string; name: string }[] = []
  if (isAdmin) {
    const rawUsers = await User.find({ role: { $in: ['viewer', 'admin'] } }).select('name').sort({ name: 1 }).lean()
    users = rawUsers.map((u) => ({ _id: u._id.toString(), name: u.name }))
  }

  const post = {
    _id: raw._id.toString(),
    slug: raw.slug,
    title: raw.title,
    excerpt: raw.excerpt,
    content: raw.content || '',
    coverImage: raw.coverImage || null,
    category: raw.category,
    tags: raw.tags || [],
    authorName: raw.authorName,
    publishedAt: raw.publishedAt.toISOString(),
    status: (raw.status || 'draft') as 'draft' | 'scheduled' | 'published',
    isFeatured: raw.isFeatured,
    featuredUntil: raw.featuredUntil ? raw.featuredUntil.toISOString() : null,
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Edit Blog Post</h1>
        <BlogPostForm initialData={post} users={users} isAdmin={isAdmin} currentUserName={session.user.name} />
      </main>
    </div>
  )
}
