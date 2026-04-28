export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { BlogPost } from '@/models/BlogPost'
import type { BlogStatus } from '@/models/BlogPost'
import { BlogComment } from '@/models/BlogComment'
import { Navbar } from '@/components/layout/Navbar'
import { BlogDetail } from '@/components/blog/BlogDetail'
import type { BlogPostSummary } from '@/components/blog/blogUtils'

interface PageProps {
  params: { slug: string }
}

function isVisible(status: string | undefined, publishedAt: Date): boolean {
  if (status === 'published') return true
  if (status === 'scheduled' && publishedAt <= new Date()) return true
  return false
}

export default async function BlogPostPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  await connectDB()

  const raw = await BlogPost.findOne({ slug: params.slug }).lean()
  if (!raw) notFound()
  if (!isVisible(raw.status, raw.publishedAt) && session?.user?.role !== 'admin') notFound()

  const userId = session?.user?.id

  const [commentCount, rawComments] = await Promise.all([
    BlogComment.countDocuments({ postId: raw._id }),
    BlogComment.find({ postId: raw._id }).sort({ createdAt: 1 }).lean(),
  ])

  const comments = rawComments.map((c) => ({
    _id: c._id.toString(),
    authorId: c.authorId.toString(),
    authorName: c.authorName,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    editedAt: c.editedAt ? c.editedAt.toISOString() : undefined,
  }))

  const post = {
    _id: raw._id.toString(),
    title: raw.title,
    slug: raw.slug,
    excerpt: raw.excerpt,
    content: raw.content || '',
    coverImage: raw.coverImage || null,
    category: raw.category,
    tags: raw.tags || [],
    authorName: raw.authorName,
    publishedAt: raw.publishedAt.toISOString(),
    readTime: raw.readTime,
    status: (raw.status || 'draft') as BlogStatus,
    isFeatured: raw.isFeatured,
    likeCount: raw.likes?.length ?? 0,
    liked: userId ? raw.likes?.some((id: { toString(): string }) => id.toString() === userId) : false,
    saved: userId ? raw.savedBy?.some((id: { toString(): string }) => id.toString() === userId) : false,
    commentCount,
  }

  const now = new Date()
  const rawRelated = await BlogPost.find({
    $or: [{ status: 'published' }, { status: 'scheduled', publishedAt: { $lte: now } }],
    category: raw.category,
    _id: { $ne: raw._id },
  })
    .sort({ publishedAt: -1 })
    .limit(2)
    .lean()

  const related: BlogPostSummary[] = rawRelated.map((p) => ({
    _id: p._id.toString(),
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    coverImage: p.coverImage || null,
    category: p.category,
    tags: p.tags || [],
    authorName: p.authorName,
    publishedAt: p.publishedAt.toISOString(),
    readTime: p.readTime,
    status: (p.status || 'draft') as BlogStatus,
    isFeatured: p.isFeatured,
    likeCount: p.likes?.length ?? 0,
    liked: userId ? p.likes?.some((id: { toString(): string }) => id.toString() === userId) : false,
    saved: userId ? p.savedBy?.some((id: { toString(): string }) => id.toString() === userId) : false,
    commentCount: 0,
  }))

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <BlogDetail
        post={post}
        related={related}
        isLoggedIn={!!session}
        initialComments={comments}
        currentUserId={session?.user?.id}
        isAdmin={session?.user?.role === 'admin'}
      />
    </div>
  )
}
