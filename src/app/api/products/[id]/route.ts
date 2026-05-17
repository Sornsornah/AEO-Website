export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'
import { Update } from '@/models/Update'
import { slugify } from '@/lib/utils'
import { computeDiff, writeLog, serializeProductSnapshot } from '@/lib/activityLog'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()

  const before = await Product.findById(id).lean()
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { name, description, color } = body

  const updateData: Record<string, unknown> = {}
  if (name) {
    updateData.name = name
    updateData.slug = slugify(name)
  }
  if (description !== undefined) updateData.description = description
  if (color) updateData.color = color
  if (body.domainId !== undefined) updateData.domainId = body.domainId || null
  if (body.websiteUrl !== undefined) updateData.websiteUrl = body.websiteUrl || null
  if (body.deckUrl !== undefined) updateData.deckUrl = body.deckUrl || null
  if (body.contactUsUrl !== undefined) updateData.contactUsUrl = body.contactUsUrl || null
  if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl || null
  if (body.members !== undefined) updateData.members = Array.isArray(body.members) ? body.members : []
  // New fields
  if (body.status !== undefined) updateData.status = body.status
  if (body.shortDescription !== undefined) updateData.shortDescription = body.shortDescription
  if (body.uiScreenshot !== undefined) updateData.uiScreenshot = body.uiScreenshot
  if (body.productManagers !== undefined) updateData.productManagers = Array.isArray(body.productManagers) ? body.productManagers : []
  if (body.developers !== undefined) updateData.developers = Array.isArray(body.developers) ? body.developers : []
  if (body.overviewContent !== undefined) updateData.overviewContent = body.overviewContent
  if (body.whyWeBuiltThis !== undefined) updateData.whyWeBuiltThis = body.whyWeBuiltThis
  if (body.whatWeBuilt !== undefined) updateData.whatWeBuilt = body.whatWeBuilt
  if (body.highlightStats !== undefined) updateData.highlightStats = Array.isArray(body.highlightStats) ? body.highlightStats : []
  if (body.features !== undefined) updateData.features = Array.isArray(body.features) ? body.features : []
  if (body.userQuotes !== undefined) updateData.userQuotes = Array.isArray(body.userQuotes) ? body.userQuotes : []
  if (body.roadmap !== undefined) updateData.roadmap = Array.isArray(body.roadmap) ? body.roadmap : []
  if (body.useCases !== undefined) updateData.useCases = Array.isArray(body.useCases) ? body.useCases : []
  if (body.productUpdates !== undefined) updateData.productUpdates = Array.isArray(body.productUpdates) ? body.productUpdates : []

  const product = await Product.findByIdAndUpdate(id, updateData, { new: true })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const changes = computeDiff('product', before as Record<string, unknown>, product.toObject())
  if (changes.length > 0) {
    await writeLog({
      userId: session.user.id,
      userName: session.user.name ?? session.user.email ?? 'Unknown',
      action: 'update',
      entityType: 'product',
      entityId: id,
      entityTitle: product.name,
      changes,
      beforeSnapshot: serializeProductSnapshot(before as Record<string, unknown>),
      afterSnapshot: serializeProductSnapshot(product.toObject()),
    })
  }

  return NextResponse.json(product)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const before = await Product.findById(id).lean()
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const updateData: Record<string, unknown> = {}
  if (body.isHidden !== undefined) updateData.isHidden = body.isHidden

  const product = await Product.findByIdAndUpdate(id, updateData, { new: true })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const changes = computeDiff('product', before as Record<string, unknown>, product.toObject())
  if (changes.length > 0) {
    await writeLog({
      userId: session.user.id,
      userName: session.user.name ?? session.user.email ?? 'Unknown',
      action: 'update',
      entityType: 'product',
      entityId: id,
      entityTitle: product.name,
      changes,
      beforeSnapshot: serializeProductSnapshot(before as Record<string, unknown>),
      afterSnapshot: serializeProductSnapshot(product.toObject()),
    })
  }

  return NextResponse.json(product)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()

  const product = await Product.findById(id).lean()
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updateCount = await Update.countDocuments({ productId: id })
  if (updateCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${updateCount} update(s) reference this product` },
      { status: 409 }
    )
  }

  await Product.findByIdAndDelete(id)

  await writeLog({
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? 'Unknown',
    action: 'delete',
    entityType: 'product',
    entityId: id,
    entityTitle: (product as Record<string, unknown>).name as string,
    changes: [],
    beforeSnapshot: serializeProductSnapshot(product as Record<string, unknown>),
  })

  return NextResponse.json({ success: true })
}
