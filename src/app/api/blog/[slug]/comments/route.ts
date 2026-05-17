export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { BlogPost } from '@/models/BlogPost'
import { BlogComment } from '@/models/BlogComment'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  await connectDB()
  const post = await BlogPost.findOne({ slug }).select('_id').lean()
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const comments = await BlogComment.find({ postId: post._id })
    .sort({ createdAt: 1 })
    .lean()

  return NextResponse.json(
    comments.map((c) => ({
      _id: c._id.toString(),
      authorId: c.authorId.toString(),
      authorName: c.authorName,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      editedAt: c.editedAt ? c.editedAt.toISOString() : undefined,
    }))
  )
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Comment is required' }, { status: 400 })
  if (content.trim().length > 2000) return NextResponse.json({ error: 'Too long' }, { status: 400 })

  await connectDB()
  const post = await BlogPost.findOne({ slug }).select('_id').lean()
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const comment = await BlogComment.create({
    postId: post._id,
    authorId: session.user.id,
    authorName: session.user.name,
    content: content.trim(),
  })

  return NextResponse.json({
    _id: comment._id.toString(),
    authorId: comment.authorId.toString(),
    authorName: comment.authorName,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
  })
}
