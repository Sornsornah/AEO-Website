export const dynamic = 'force-dynamic'

import { connectDB } from '@/lib/mongodb'
import { BlogPost } from '@/models/BlogPost'
import { BlogComment } from '@/models/BlogComment'
import { ExternalArticle } from '@/models/ExternalArticle'
import { BlogCategory } from '@/models/BlogCategory'
import { headers } from 'next/headers'
import { getSession } from '@/lib/auth'
import { Navbar } from '@/components/layout/navbar'
import { PageBanner } from '@/components/layout/page-banner'
import { BlogPageClient } from '@/features/blog/components/blog-page-client'
import type { BlogPostSummary, CategoriesMap } from '@/features/blog/components/blog-utils'
import type { ExternalArticleEntry } from '@/features/blog/components/external-articles-sidebar'
import { Types } from 'mongoose'

export default async function BlogPage() {
  const session = await getSession(await headers())
  await connectDB()

  const now = new Date()
  // Auto-unfeature expired posts
  await BlogPost.updateMany(
    { isFeatured: true, featuredUntil: { $exists: true, $lte: now } },
    { $set: { isFeatured: false }, $unset: { featuredUntil: '' } }
  )

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

  const featured = posts.filter((p) => p.isFeatured)

  const [rawExternal, rawCategories] = await Promise.all([
    ExternalArticle.find().sort({ order: 1, createdAt: -1 }).lean(),
    BlogCategory.find().lean(),
  ])

  const externalArticles: ExternalArticleEntry[] = rawExternal.map((a) => ({
    _id: a._id.toString(),
    title: a.title,
    description: a.description,
    url: a.url,
    category: a.category,
    order: a.order,
  }))

  const categoriesMap: CategoriesMap = Object.fromEntries(
    rawCategories.map((c) => [c.slug, { name: c.name, color: c.color }])
  )

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageBanner pageKey="blog" />
      <BlogPageClient posts={posts} featured={featured} isLoggedIn={!!session} externalArticles={externalArticles} categoriesMap={categoriesMap} />
    </div>
  )
}
