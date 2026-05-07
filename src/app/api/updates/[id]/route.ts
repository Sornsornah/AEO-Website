export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Update } from '@/models/Update'
import { computeDiff, writeLog, serializeUpdateSnapshot } from '@/lib/activityLog'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const update = await Update.findById(params.id).populate('productId').populate('productIds').lean()
  if (!update) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isVisible = update.isPublished || (update.scheduledAt && new Date(update.scheduledAt as Date) <= new Date())
  if (session.user.role === 'viewer' && !isVisible) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(update)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()

  const before = await Update.findById(params.id).lean()
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { title, summary, content, domainIds, productIds, tagIds, date, highlights, progressUpdates, nextSteps, learningPoints, media, isPublished, scheduledAt } = body

  const updateData: Record<string, unknown> = {}
  if (title !== undefined) updateData.title = title
  if (summary !== undefined) updateData.summary = summary
  if (content !== undefined) updateData.content = content
  if (domainIds !== undefined) updateData.domainIds = domainIds
  if (productIds !== undefined) {
    const normalizedProductIds = Array.isArray(productIds) ? productIds : []
    updateData.productIds = normalizedProductIds
    updateData.productId = normalizedProductIds[0] || null
  }
  if (tagIds !== undefined) updateData.tagIds = tagIds
  if (date !== undefined) updateData.date = new Date(date)
  if (highlights !== undefined) updateData.highlights = highlights
  if (progressUpdates !== undefined) updateData.progressUpdates = progressUpdates
  if (nextSteps !== undefined) updateData.nextSteps = nextSteps
  if (learningPoints !== undefined) updateData.learningPoints = learningPoints
  if (media !== undefined) updateData.media = media
  if (isPublished !== undefined) updateData.isPublished = isPublished
  if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null
  updateData.updatedBy = session.user.id

  const update = await Update.findByIdAndUpdate(params.id, updateData, { new: true })
    .populate('productId')
    .populate('productIds')
    .lean()

  if (!update) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const changes = computeDiff('update', before as Record<string, unknown>, update as Record<string, unknown>)
  if (changes.length > 0) {
    await writeLog({
      userId: session.user.id,
      userName: session.user.name ?? session.user.email ?? 'Unknown',
      action: 'update',
      entityType: 'update',
      entityId: params.id,
      entityTitle: (update.title as string) || 'Untitled',
      changes,
      beforeSnapshot: serializeUpdateSnapshot(before as Record<string, unknown>),
      afterSnapshot: serializeUpdateSnapshot(update as Record<string, unknown>),
    })
  }

  return NextResponse.json(update)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()

  const update = await Update.findById(params.id).lean()
  if (!update) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await Update.findByIdAndDelete(params.id)

  await writeLog({
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? 'Unknown',
    action: 'delete',
    entityType: 'update',
    entityId: params.id,
    entityTitle: (update as Record<string, unknown>).title as string,
    changes: [],
    beforeSnapshot: serializeUpdateSnapshot(update as Record<string, unknown>),
  })

  return NextResponse.json({ success: true })
}
