export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { BlogPost } from '@/models/BlogPost'
import { User } from '@/models/User'
import { Navbar } from '@/components/layout/Navbar'
import { BlogPostForm } from '@/components/editor/BlogPostForm'

interface PageProps {
  params: { id: string }
}

export default async function EditBlogPostPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') redirect('/updates')

  await connectDB()
  const [raw, rawUsers] = await Promise.all([
    BlogPost.findById(params.id).lean(),
    User.find({ isWhitelisted: true }).select('name').sort({ name: 1 }).lean(),
  ])
  if (!raw) notFound()

  const users = rawUsers.map((u) => ({ _id: u._id.toString(), name: u.name }))

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
        <BlogPostForm initialData={post} users={users} />
      </main>
    </div>
  )
}
