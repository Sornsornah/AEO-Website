export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { BlogPost } from '@/models/BlogPost'

function computeReadTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

function isVisible(post: { status?: string; publishedAt: Date }): boolean {
  if (post.status === 'published') return true
  if (post.status === 'scheduled' && post.publishedAt <= new Date()) return true
  return false
}

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  await connectDB()
  const session = await getServerSession(authOptions)
  const post = await BlogPost.findOne({ slug: params.slug }).lean()
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!isVisible(post) && session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const userId = session?.user?.id
  return NextResponse.json({
    _id: post._id.toString(),
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    coverImage: post.coverImage || null,
    category: post.category,
    tags: post.tags || [],
    authorName: post.authorName,
    publishedAt: post.publishedAt.toISOString(),
    readTime: post.readTime,
    status: post.status || 'draft',
    isFeatured: post.isFeatured,
    likeCount: post.likes?.length ?? 0,
    liked: userId ? post.likes?.some((id: { toString(): string }) => id.toString() === userId) : false,
    saved: userId ? post.savedBy?.some((id: { toString(): string }) => id.toString() === userId) : false,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()
  const post = await BlogPost.findOne({ slug: params.slug })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { title, excerpt, content, coverImage, category, tags, authorName, publishedAt, status, isFeatured, featuredUntil } = body

  if (title !== undefined) post.title = title
  if (excerpt !== undefined) post.excerpt = excerpt
  if (content !== undefined) {
    post.content = content
    post.readTime = computeReadTime(content)
  }
  if (coverImage !== undefined) post.coverImage = coverImage || undefined
  if (category !== undefined) post.category = category
  if (tags !== undefined) post.tags = Array.isArray(tags) ? tags.filter(Boolean) : []
  if (authorName !== undefined) post.authorName = authorName
  if (publishedAt !== undefined) post.publishedAt = new Date(publishedAt)
  if (status !== undefined) post.status = status
  if (isFeatured !== undefined) {
    if (isFeatured) await BlogPost.updateMany({ _id: { $ne: post._id }, isFeatured: true }, { isFeatured: false })
    post.isFeatured = isFeatured
  }
  if ('featuredUntil' in body) {
    post.featuredUntil = featuredUntil ? new Date(featuredUntil) : undefined
  }

  await post.save()
  return NextResponse.json({ slug: post.slug })
}

export async function DELETE(_req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()
  const result = await BlogPost.deleteOne({ slug: params.slug })
  if (result.deletedCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
