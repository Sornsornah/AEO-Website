import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Comment } from '@/models/Comment'
import { Notification } from '@/models/Notification'
import { User } from '@/models/User'
import { Update } from '@/models/Update'
import { Domain } from '@/models/Domain'
import { Types } from 'mongoose'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB()
  const comments = await Comment.find({ updateId: params.id })
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
      createdAt: c.createdAt.toISOString(),
    }))
  )
}

type NotificationPayload = {
  userId: Types.ObjectId
  type: 'mention' | 'team_mention'
  fromUserId: Types.ObjectId
  fromUserName: string
  commentId: Types.ObjectId
  updateId: Types.ObjectId
  updateTitle: string
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text, attachments } = await req.json()
  const trimmedText = typeof text === 'string' ? text.trim() : ''
  const safeAttachments = Array.isArray(attachments) ? attachments.filter((a: unknown) => typeof a === 'string') : []

  if (!trimmedText && safeAttachments.length === 0) {
    return NextResponse.json({ error: 'Comment must have text or at least one attachment' }, { status: 400 })
  }
  if (trimmedText.length > 1000) {
    return NextResponse.json({ error: 'Comment too long' }, { status: 400 })
  }

  await connectDB()

  // Check for @team mention
  const hasTeamMention = /@team\b/i.test(trimmedText)

  const fromObjId = new Types.ObjectId(session.user.id)

  // Find mentioned users by matching @FullName (handles multi-word names)
  const allUsers = await User.find({
    isWhitelisted: true,
    _id: { $ne: fromObjId },
  })
    .select('_id name')
    .lean()

  const mentionedUsers = allUsers.filter((u) => {
    const escaped = (u.name as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp('@' + escaped + '(?=\\s|$|[^a-zA-Z0-9])', 'i').test(trimmedText)
  })

  const mentionedUserIds = mentionedUsers.map((u) => u._id.toString())

  const comment = await Comment.create({
    updateId: params.id,
    userId: session.user.id,
    userName: session.user.name,
    text: trimmedText,
    attachments: safeAttachments,
    mentions: mentionedUserIds,
  })

  const notifications: NotificationPayload[] = []
  const commentObjId = comment._id as Types.ObjectId
  const updateObjId = new Types.ObjectId(params.id)

  // @Name → notify that specific user
  if (mentionedUsers.length > 0) {
    const update = await Update.findById(params.id).select('title').lean()
    const updateTitle = (update?.title as string) || 'an update'

    for (const u of mentionedUsers) {
      notifications.push({
        userId: u._id as Types.ObjectId,
        type: 'mention',
        fromUserId: fromObjId,
        fromUserName: session.user.name,
        commentId: commentObjId,
        updateId: updateObjId,
        updateTitle,
      })
    }
  }

  // @team → notify everyone in the update's domain(s)
  if (hasTeamMention) {
    const update = await Update.findById(params.id).select('title domainIds domainId').lean()
    const updateTitle = (update?.title as string) || 'an update'

    const domainIds: Types.ObjectId[] = []
    if (update) {
      const rawDomainIds = (update as { domainIds?: unknown[] }).domainIds
      const rawDomainId = (update as { domainId?: unknown }).domainId
      if (Array.isArray(rawDomainIds) && rawDomainIds.length > 0) {
        rawDomainIds.forEach((id) => domainIds.push(new Types.ObjectId(String(id))))
      } else if (rawDomainId) {
        domainIds.push(new Types.ObjectId(String(rawDomainId)))
      }
    }

    if (domainIds.length > 0) {
      const domains = await Domain.find({ _id: { $in: domainIds } }).select('members').lean()
      // Exclude the commenter; do NOT exclude already-mentioned users (they get both notifications)
      const excludeIds = new Set([session.user.id])
      const seenIds = new Set<string>()

      for (const domain of domains) {
        const members = (domain.members || []) as Types.ObjectId[]
        for (const memberId of members) {
          const memberStr = memberId.toString()
          if (!excludeIds.has(memberStr) && !seenIds.has(memberStr)) {
            seenIds.add(memberStr)
            notifications.push({
              userId: memberId,
              type: 'team_mention',
              fromUserId: fromObjId,
              fromUserName: session.user.name,
              commentId: commentObjId,
              updateId: updateObjId,
              updateTitle,
            })
          }
        }
      }
    }
  }

  if (notifications.length > 0) {
    await Notification.insertMany(notifications)
  }

  return NextResponse.json({
    _id: comment._id.toString(),
    userId: session.user.id,
    userName: comment.userName,
    text: comment.text,
    attachments: comment.attachments || [],
    mentions: comment.mentions || [],
    createdAt: comment.createdAt.toISOString(),
  })
}
