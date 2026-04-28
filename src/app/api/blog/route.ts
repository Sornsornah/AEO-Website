export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { BlogPost } from '@/models/BlogPost'

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function computeReadTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

function publicFilter() {
  const now = new Date()
  return {
    $or: [
      { status: 'published' },
      { status: 'scheduled', publishedAt: { $lte: now } },
    ],
  }
}

export async function GET(req: NextRequest) {
  await connectDB()
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const adminAll = searchParams.get('admin') === '1'

  const session = await getServerSession(authOptions)
  const isAdmin = session?.user?.role === 'admin'

  const query: Record<string, unknown> = {}
  if (!adminAll || !isAdmin) {
    Object.assign(query, publicFilter())
  }
  if (category && category !== 'all') query.category = category
  if (search) {
    const esc = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.$or = [
      { title: { $regex: esc, $options: 'i' } },
      { excerpt: { $regex: esc, $options: 'i' } },
      { authorName: { $regex: esc, $options: 'i' } },
    ]
  }

  const posts = await BlogPost.find(query).sort({ publishedAt: -1 }).lean()

  const userId = session?.user?.id

  return NextResponse.json(
    posts.map((p) => ({
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
      status: p.status || 'draft',
      isFeatured: p.isFeatured,
      likeCount: p.likes?.length ?? 0,
      liked: userId ? p.likes?.some((id: { toString(): string }) => id.toString() === userId) : false,
      saved: userId ? p.savedBy?.some((id: { toString(): string }) => id.toString() === userId) : false,
    }))
  )
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { title, excerpt, content, coverImage, category, tags, authorName, publishedAt, status, isFeatured } = body

  if (!title || !excerpt || !category || !authorName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  await connectDB()

  let slug = slugify(title)
  const existing = await BlogPost.findOne({ slug }).lean()
  if (existing) slug = `${slug}-${Date.now()}`

  if (isFeatured) {
    await BlogPost.updateMany({ isFeatured: true }, { isFeatured: false })
  }

  const post = await BlogPost.create({
    title,
    slug,
    excerpt,
    content: content || '',
    coverImage: coverImage || undefined,
    category,
    tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
    authorName,
    publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
    readTime: computeReadTime(content || ''),
    status: status || 'draft',
    isFeatured: !!isFeatured,
  })

  return NextResponse.json({ _id: post._id.toString(), slug: post.slug })
}
