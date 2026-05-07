export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Update } from '@/models/Update'
import { Product } from '@/models/Product'
import { computeDiff, writeLog, serializeUpdateSnapshot } from '@/lib/activityLog'

const PAGE_SIZE = 20

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const { searchParams } = new URL(req.url)
  const productSlug = searchParams.get('product')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const includeUnpublished = searchParams.get('includeUnpublished') === 'true' && session.user.role === 'admin'

  const must: Record<string, unknown>[] = []
  const now = new Date()

  if (!includeUnpublished) {
    must.push({ $or: [{ isPublished: true }, { scheduledAt: { $lte: now } }] })
  }

  if (productSlug) {
    const product = await Product.findOne({ slug: productSlug })
    if (product) must.push({ $or: [{ productId: product._id }, { productIds: product._id }] })
  }

  if (from || to) {
    const dateQuery: Record<string, Date> = {}
    if (from) dateQuery.$gte = new Date(from)
    if (to) {
      const toDate = new Date(to)
      toDate.setHours(23, 59, 59, 999)
      dateQuery.$lte = toDate
    }
    must.push({ date: dateQuery })
  }

  const query = must.length === 0 ? {} : must.length === 1 ? must[0] : { $and: must }

  const skip = (page - 1) * PAGE_SIZE
  const totalCount = await Update.countDocuments(query)
  const updates = await Update.find(query)
    .populate('productId')
    .populate('productIds')
    .sort({ date: -1 })
    .skip(skip)
    .limit(PAGE_SIZE)
    .lean()

  return NextResponse.json({
    updates,
    totalCount,
    hasMore: skip + updates.length < totalCount,
    page,
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const body = await req.json()
  const { title, summary, content, domainIds, productIds, tagIds, date, highlights, progressUpdates, nextSteps, learningPoints, media, isPublished, scheduledAt } = body

  if (!title || !date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!Array.isArray(domainIds) || domainIds.length === 0) {
    return NextResponse.json({ error: 'At least one domain is required' }, { status: 400 })
  }

  const normalizedProductIds = Array.isArray(productIds) ? productIds : []
  const update = await Update.create({
    title,
    summary,
    content: content || '',
    domainIds,
    productIds: normalizedProductIds,
    productId: normalizedProductIds[0] || undefined,
    tagIds: tagIds || [],
    date: new Date(date),
    highlights: highlights || [],
    progressUpdates: progressUpdates || '',
    nextSteps: nextSteps || '',
    learningPoints: learningPoints || '',
    media: media || [],
    isPublished: isPublished || false,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    createdBy: session.user.id,
  })

  const populated = await Update.findById(update._id).populate('productId').populate('productIds').lean()

  const changes = computeDiff('update', null, update.toObject())
  await writeLog({
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? 'Unknown',
    action: 'create',
    entityType: 'update',
    entityId: update._id.toString(),
    entityTitle: title,
    changes,
    afterSnapshot: serializeUpdateSnapshot(update.toObject()),
  })

  return NextResponse.json(populated, { status: 201 })
}
