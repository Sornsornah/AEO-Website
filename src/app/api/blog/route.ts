export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { BlogPost } from '@/models/BlogPost'
import { computeDiff, writeLog, serializeBlogSnapshot } from '@/lib/activityLog'

const createBlogSchema = z.object({
  title: z.string().min(1),
  excerpt: z.string().min(1),
  category: z.enum(['thought', 'learning-journey', 'field-notes', 'deep-dive']),
  authorName: z.string().min(1),
  content: z.string().optional(),
  coverImage: z.string().optional(),
  tags: z.array(z.string()).optional(),
  publishedAt: z.string().optional(),
  status: z.enum(['draft', 'scheduled', 'published']).optional(),
})

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

  const session = await getSession(req.headers)
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
  const session = await getSession(req.headers)
  if (!session || session.user.role !== 'admin') {
    return new Response(null, { status: 401 })
  }

  const parsed = createBlogSchema.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const { title, excerpt, content, coverImage, category, tags, authorName, publishedAt, status } = parsed.data

  await connectDB()

  let slug = slugify(title)
  const existing = await BlogPost.findOne({ slug }).lean()
  if (existing) slug = `${slug}-${Date.now()}`

  const featuredUntil = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)

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
    isFeatured: true,
    featuredUntil,
  })

  const changes = computeDiff('blog', null, post.toObject())
  await writeLog({
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? 'Unknown',
    action: 'create',
    entityType: 'blog',
    entityId: post._id.toString(),
    entityTitle: post.title,
    changes,
    afterSnapshot: serializeBlogSnapshot(post.toObject()),
  })

  return NextResponse.json({ _id: post._id.toString(), slug: post.slug })
}
