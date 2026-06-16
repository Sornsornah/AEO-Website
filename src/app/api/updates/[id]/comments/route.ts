export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Comment } from '@/models/Comment'
import { Update } from '@/models/Update'
import { User } from '@/models/User'
import { Types } from 'mongoose'
import { sendCommentNotificationEmail } from '@/lib/email'
import { visibleCommentLength, MAX_VISIBLE_COMMENT_LENGTH, MAX_COMMENT_LENGTH } from '@/lib/comment-length'
import { extractMentionIds } from '@/lib/comment-mentions'
import { resolveSubscriberIds } from '@/lib/thread-subscribers'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await connectDB()
  const comments = await Comment.find({ updateId: id })
    .sort({ createdAt: 1 })
    .lean()

  return NextResponse.json(
    comments.map((c) => ({
      _id: c._id.toString(),
      userId: c.userId?.toString() || '',
      userName: c.userName,
      text: c.text,
      attachments: c.attachments || [],
      mentions: c.mentions || [],
      parentId: c.parentId?.toString() ?? null,
      createdAt: c.createdAt.toISOString(),
    }))
  )
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })

  const { text, attachments, parentId } = await req.json()
  const trimmedText = typeof text === 'string' ? text.trim() : ''
  const safeAttachments = Array.isArray(attachments) ? attachments.filter((a: unknown) => typeof a === 'string') : []
  const parentIdStr =
    typeof parentId === 'string' && Types.ObjectId.isValid(parentId) ? parentId : null

  if (!trimmedText && safeAttachments.length === 0) {
    return NextResponse.json({ error: 'Comment must have text or at least one attachment' }, { status: 400 })
  }
  if (visibleCommentLength(trimmedText) > MAX_VISIBLE_COMMENT_LENGTH) {
    return NextResponse.json({ error: 'Comment too long' }, { status: 400 })
  }
  if (trimmedText.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json({ error: 'Attached image or video is too large' }, { status: 400 })
  }

  await connectDB()

  // Resolve a reply target: the parent must be a real comment on this update.
  let parentObjId: Types.ObjectId | undefined
  let replyTargetId: string | undefined
  if (parentIdStr) {
    const parent = await Comment.findOne({ _id: parentIdStr, updateId: id }).select('userId').lean()
    if (parent) {
      parentObjId = (parent as { _id: Types.ObjectId })._id
      replyTargetId = (parent as { userId?: Types.ObjectId }).userId?.toString()
    }
  }

  // Resolve @mentions from the comment HTML (single source of truth), keeping
  // only real users with a mentionable role (Management/AEO).
  const rawMentionIds = extractMentionIds(trimmedText).filter((m) => Types.ObjectId.isValid(m))
  let mentionUserIds: string[] = []
  if (rawMentionIds.length > 0) {
    const mentioned = await User.find({
      _id: { $in: rawMentionIds },
      role: { $in: ['viewer', 'admin'] },
    })
      .select('_id')
      .lean()
    mentionUserIds = mentioned.map((u) => (u as { _id: Types.ObjectId })._id.toString())
  }

  const comment = await Comment.create({
    updateId: id,
    userId: session.user.id,
    userName: session.user.name,
    text: trimmedText,
    attachments: safeAttachments,
    mentions: mentionUserIds,
    parentId: parentObjId,
  })

  // Build the notification recipient list through ONE Set so each person is
  // emailed at most once, no matter how many triggers they match. The author is
  // seeded first so they're never notified about their own comment.
  const update = await Update.findById(id)
    .select('title domainId domainIds productId productIds subscribers unsubscribers')
    .lean()
  const updateTitle = (update as { title?: string } | null)?.title || 'an update'

  const notifiedIds = new Set<string>([session.user.id])
  const recipientIds: Types.ObjectId[] = []
  const addRecipient = (rawId?: string) => {
    if (!rawId || notifiedIds.has(rawId) || !Types.ObjectId.isValid(rawId)) return
    notifiedIds.add(rawId)
    recipientIds.push(new Types.ObjectId(rawId))
  }

  // Direct targets always notify, even if they've unsubscribed from the thread.
  for (const mid of mentionUserIds) addRecipient(mid) // @mentioned users
  addRecipient(replyTargetId) // author of the parent comment

  if (update) {
    // Thread subscribers: (members ∪ subscribers) − unsubscribers.
    const subscriberIds = await resolveSubscriberIds(update)
    for (const sid of subscriberIds) addRecipient(sid)

    // Auto-subscribe direct targets who haven't explicitly opted out, so a
    // mention/reply pulls them into the thread for future activity.
    const unsub = new Set(((update as { unsubscribers?: unknown[] }).unsubscribers || []).map((u) => String(u)))
    const toSubscribe = [replyTargetId, ...mentionUserIds].filter(
      (uid): uid is string => !!uid && uid !== session.user.id && Types.ObjectId.isValid(uid) && !unsub.has(uid)
    )
    if (toSubscribe.length > 0) {
      await Update.updateOne({ _id: id }, { $addToSet: { subscribers: { $each: toSubscribe } } })
    }
  }

  if (recipientIds.length > 0) {
    const users = await User.find({ _id: { $in: recipientIds } }).select('email').lean()
    Promise.allSettled(
      users.map((u) =>
        sendCommentNotificationEmail(
          (u as { email: string }).email,
          session.user.name,
          updateTitle,
          id,
          trimmedText
        )
      )
    )
  }

  return NextResponse.json({
    _id: comment._id.toString(),
    userId: session.user.id,
    userName: comment.userName,
    text: comment.text,
    attachments: comment.attachments || [],
    mentions: comment.mentions || [],
    parentId: comment.parentId?.toString() ?? null,
    createdAt: comment.createdAt.toISOString(),
  })
}
