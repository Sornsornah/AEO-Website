export const dynamic = 'force-dynamic'

import { connectDB } from '@/lib/mongodb'
import { BlogPost } from '@/models/BlogPost'
import { BlogComment } from '@/models/BlogComment'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Navbar } from '@/components/layout/Navbar'
import { BlogPageClient } from '@/components/blog/BlogPageClient'
import type { BlogPostSummary } from '@/components/blog/blogUtils'
import { Types } from 'mongoose'

export default async function BlogPage() {
  const session = await getServerSession(authOptions)
  await connectDB()

  const now = new Date()
  const rawPosts = await BlogPost.find({
    $or: [{ status: 'published' }, { status: 'scheduled', publishedAt: { $lte: now } }],
  }).sort({ publishedAt: -1 }).lean()
  const userId = session?.user?.id

  const postIds = rawPosts.map((p) => p._id)
  const commentCounts = await BlogComment.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { postId: { $in: postIds } } },
    { $group: { _id: '$postId', count: { $sum: 1 } } },
  ])
  const commentCountMap = new Map(commentCounts.map((c) => [c._id.toString(), c.count]))

  const posts: BlogPostSummary[] = rawPosts.map((p) => ({
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
    status: (p.status || 'draft') as import('@/models/BlogPost').BlogStatus,
    isFeatured: p.isFeatured,
    likeCount: p.likes?.length ?? 0,
    liked: userId ? p.likes?.some((id: { toString(): string }) => id.toString() === userId) : false,
    saved: userId ? p.savedBy?.some((id: { toString(): string }) => id.toString() === userId) : false,
    commentCount: commentCountMap.get(p._id.toString()) ?? 0,
  }))

  const featured = posts.find((p) => p.isFeatured) ?? null

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <BlogPageClient posts={posts} featured={featured} isLoggedIn={!!session} />
    </div>
  )
}
