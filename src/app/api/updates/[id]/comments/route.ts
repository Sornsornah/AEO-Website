export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Comment } from '@/models/Comment'
import { Notification } from '@/models/Notification'
import { Update } from '@/models/Update'
import { Domain } from '@/models/Domain'
import { Product } from '@/models/Product'
import { User } from '@/models/User'
import { Types } from 'mongoose'
import { sendCommentNotificationEmail } from '@/lib/email'

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
  type: 'comment'
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

  const fromObjId = new Types.ObjectId(session.user.id)

  const comment = await Comment.create({
    updateId: params.id,
    userId: session.user.id,
    userName: session.user.name,
    text: trimmedText,
    attachments: safeAttachments,
    mentions: [],
  })

  const commentObjId = comment._id as Types.ObjectId
  const updateObjId = new Types.ObjectId(params.id)

  // Notify all domain members + product members associated with this update
  const update = await Update.findById(params.id).select('title domainIds domainId productId productIds').lean()
  if (update) {
    const updateTitle = (update as { title?: string }).title || 'an update'

    const domainIds: Types.ObjectId[] = []
    const rawDomainIds = (update as { domainIds?: unknown[] }).domainIds
    const rawDomainId = (update as { domainId?: unknown }).domainId
    if (Array.isArray(rawDomainIds) && rawDomainIds.length > 0) {
      rawDomainIds.forEach((id) => domainIds.push(new Types.ObjectId(String(id))))
    } else if (rawDomainId) {
      domainIds.push(new Types.ObjectId(String(rawDomainId)))
    }

    const productIdSet = new Set<string>()
    const rawProductId = (update as { productId?: unknown }).productId
    const rawProductIds = (update as { productIds?: unknown[] }).productIds || []
    if (rawProductId) productIdSet.add(String(rawProductId))
    for (const id of rawProductIds) if (id) productIdSet.add(String(id))

    const notifiedIds = new Set<string>([session.user.id])
    const notifications: NotificationPayload[] = []

    if (domainIds.length > 0) {
      const domains = await Domain.find({ _id: { $in: domainIds } }).select('members').lean()
      for (const domain of domains) {
        for (const memberId of (domain.members || []) as Types.ObjectId[]) {
          const memberStr = memberId.toString()
          if (!notifiedIds.has(memberStr)) {
            notifiedIds.add(memberStr)
            notifications.push({ userId: memberId, type: 'comment', fromUserId: fromObjId, fromUserName: session.user.name, commentId: commentObjId, updateId: updateObjId, updateTitle })
          }
        }
      }
    }

    if (productIdSet.size > 0) {
      const products = await Product.find({ _id: { $in: Array.from(productIdSet) } }).select('members').lean()
      for (const product of products) {
        for (const memberId of ((product as { members?: unknown[] }).members || []) as Types.ObjectId[]) {
          const memberStr = memberId.toString()
          if (!notifiedIds.has(memberStr)) {
            notifiedIds.add(memberStr)
            notifications.push({ userId: memberId, type: 'comment', fromUserId: fromObjId, fromUserName: session.user.name, commentId: commentObjId, updateId: updateObjId, updateTitle })
          }
        }
      }
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications)
      const recipientIds = notifications.map((n) => n.userId)
      const users = await User.find({ _id: { $in: recipientIds } }).select('email').lean()
      Promise.allSettled(
        users.map((u) =>
          sendCommentNotificationEmail(
            (u as { email: string }).email,
            session.user.name,
            updateTitle,
            params.id,
            trimmedText
          )
        )
      )
    }
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
