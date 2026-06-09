export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { BlogPost } from '@/models/BlogPost'
import { computeDiff, writeLog, TRACKED_FIELDS, serializeBlogSnapshot } from '@/lib/activityLog'

function computeReadTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

function isVisible(post: { status?: string; publishedAt: Date }): boolean {
  if (post.status === 'published') return true
  if (post.status === 'scheduled' && post.publishedAt <= new Date()) return true
  return false
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  await connectDB()
  const session = await getSession(req.headers)
  const post = await BlogPost.findOne({ slug }).lean()
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getSession(req.headers)
  if (!session) {
    return new Response(null, { status: 401 })
  }
  await connectDB()
  const post = await BlogPost.findOne({ slug })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAdmin = session.user.role === 'admin'
  const isOwner = post.createdBy?.toString() === session.user.id
  if (!isAdmin && !isOwner) {
    return new Response(null, { status: 401 })
  }

  const body = await req.json()
  const { title, excerpt, content, coverImage, category, tags, authorName, publishedAt, status, isFeatured, featuredUntil } = body

  const beforeSnapshot: Record<string, unknown> = {}
  for (const field of TRACKED_FIELDS['blog']) {
    beforeSnapshot[field] = (post as unknown as Record<string, unknown>)[field]
  }

  if (title !== undefined) post.title = title
  if (excerpt !== undefined) post.excerpt = excerpt
  if (content !== undefined) {
    post.content = content
    post.readTime = computeReadTime(content)
  }
  if (coverImage !== undefined) post.coverImage = coverImage || undefined
  if (category !== undefined) post.category = category
  if (tags !== undefined) post.tags = Array.isArray(tags) ? tags.filter(Boolean) : []
  if (isAdmin && authorName !== undefined) post.authorName = authorName
  if (publishedAt !== undefined) post.publishedAt = new Date(publishedAt)
  if (status !== undefined) post.status = status
  if (isAdmin && isFeatured !== undefined) {
    if (isFeatured) await BlogPost.updateMany({ _id: { $ne: post._id }, isFeatured: true }, { isFeatured: false })
    post.isFeatured = isFeatured
  }
  if (isAdmin && 'featuredUntil' in body) {
    post.featuredUntil = featuredUntil ? new Date(featuredUntil) : undefined
  }

  await post.save()

  const changes = computeDiff('blog', beforeSnapshot, post.toObject())
  if (changes.length > 0) {
    await writeLog({
      userId: session.user.id,
      userName: session.user.name ?? session.user.email ?? 'Unknown',
      action: 'update',
      entityType: 'blog',
      entityId: post._id.toString(),
      entityTitle: post.title,
      changes,
      beforeSnapshot: serializeBlogSnapshot(beforeSnapshot as Record<string, unknown>),
      afterSnapshot: serializeBlogSnapshot(post.toObject()),
    })
  }

  return NextResponse.json({ slug: post.slug })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getSession(req.headers)
  if (!session || session.user.role !== 'admin') {
    return new Response(null, { status: 401 })
  }
  await connectDB()
  const post = await BlogPost.findOne({ slug }).lean()
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await BlogPost.deleteOne({ slug })
  await writeLog({
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? 'Unknown',
    action: 'delete',
    entityType: 'blog',
    entityId: (post as Record<string, unknown>)._id as string,
    entityTitle: (post as Record<string, unknown>).title as string,
    changes: [],
    beforeSnapshot: serializeBlogSnapshot(post as Record<string, unknown>),
  })
  return NextResponse.json({ ok: true })
}
