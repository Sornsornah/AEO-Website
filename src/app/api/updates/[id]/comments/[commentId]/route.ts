export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Comment } from '@/models/Comment'
import { User } from '@/models/User'
import { Types } from 'mongoose'
import { visibleCommentLength, MAX_VISIBLE_COMMENT_LENGTH, MAX_COMMENT_LENGTH } from '@/lib/comment-length'
import { extractMentionIds } from '@/lib/comment-mentions'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { commentId } = await params
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })

  const { text } = await req.json()
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (!trimmed) return NextResponse.json({ error: 'Text is required' }, { status: 400 })
  if (visibleCommentLength(trimmed) > MAX_VISIBLE_COMMENT_LENGTH) return NextResponse.json({ error: 'Comment too long' }, { status: 400 })
  if (trimmed.length > MAX_COMMENT_LENGTH) return NextResponse.json({ error: 'Attached image or video is too large' }, { status: 400 })

  await connectDB()
  const comment = await Comment.findById(commentId)
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (comment.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  comment.text = trimmed

  // Re-sync mentions to match the edited HTML. We deliberately do NOT send
  // notification emails on edit — only the original POST notifies, so nobody is
  // emailed twice for the same comment.
  const rawMentionIds = extractMentionIds(trimmed).filter((m) => Types.ObjectId.isValid(m))
  if (rawMentionIds.length > 0) {
    const mentioned = await User.find({
      _id: { $in: rawMentionIds },
      role: { $in: ['viewer', 'admin'] },
    })
      .select('_id')
      .lean()
    comment.mentions = mentioned.map((u) => (u as { _id: Types.ObjectId })._id.toString())
  } else {
    comment.mentions = []
  }

  await comment.save()

  return NextResponse.json({
    _id: comment._id.toString(),
    userId: comment.userId.toString(),
    userName: comment.userName,
    text: comment.text,
    attachments: comment.attachments || [],
    mentions: comment.mentions || [],
    parentId: comment.parentId?.toString() ?? null,
    createdAt: comment.createdAt.toISOString(),
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { commentId } = await params
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })

  await connectDB()
  const comment = await Comment.findById(commentId)
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (comment.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await comment.deleteOne()
  return NextResponse.json({ ok: true })
}
