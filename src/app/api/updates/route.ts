export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Update } from '@/models/Update'
import { Product } from '@/models/Product'
import { computeDiff, writeLog, serializeUpdateSnapshot } from '@/lib/activityLog'

const createUpdateSchema = z.object({
  title: z.string().min(1),
  date: z.string().min(1),
  domainIds: z.array(z.string()).min(1),
  summary: z.string().optional(),
  content: z.string().optional(),
  productIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  highlights: z.array(z.unknown()).optional(),
  progressUpdates: z.string().optional(),
  nextSteps: z.string().optional(),
  learningPoints: z.string().optional(),
  media: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
  scheduledAt: z.string().optional(),
})

const PAGE_SIZE = 20

export async function GET(req: NextRequest) {
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })

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
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const parsed = createUpdateSchema.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const { title, summary, content, domainIds, productIds, tagIds, date, highlights, progressUpdates, nextSteps, learningPoints, media, isPublished, scheduledAt } = parsed.data

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
