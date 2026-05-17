export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { BlogComment } from '@/models/BlogComment'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { id } = await params
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Comment is required' }, { status: 400 })
  if (content.trim().length > 2000) return NextResponse.json({ error: 'Too long' }, { status: 400 })

  await connectDB()
  const comment = await BlogComment.findById(id)
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (comment.authorId.toString() !== session.user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  comment.content = content.trim()
  comment.editedAt = new Date()
  await comment.save()

  return NextResponse.json({
    _id: comment._id.toString(),
    content: comment.content,
    editedAt: comment.editedAt.toISOString(),
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { id } = await params
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })

  await connectDB()
  const comment = await BlogComment.findById(id)
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwner = comment.authorId.toString() === session.user.id
  const isAdmin = session.user.role === 'admin'
  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await comment.deleteOne()
  return NextResponse.json({ ok: true })
}
