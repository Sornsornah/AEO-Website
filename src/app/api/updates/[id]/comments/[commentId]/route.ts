export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Comment } from '@/models/Comment'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text } = await req.json()
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (!trimmed) return NextResponse.json({ error: 'Text is required' }, { status: 400 })
  if (trimmed.length > 1000) return NextResponse.json({ error: 'Comment too long' }, { status: 400 })

  await connectDB()
  const comment = await Comment.findById(params.commentId)
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (comment.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  comment.text = trimmed
  await comment.save()

  return NextResponse.json({
    _id: comment._id.toString(),
    userId: comment.userId.toString(),
    userName: comment.userName,
    text: comment.text,
    attachments: comment.attachments || [],
    mentions: comment.mentions || [],
    createdAt: comment.createdAt.toISOString(),
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const comment = await Comment.findById(params.commentId)
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (comment.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await comment.deleteOne()
  return NextResponse.json({ ok: true })
}
