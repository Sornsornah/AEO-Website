export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'
import { Update } from '@/models/Update'
import { slugify } from '@/lib/utils'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
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

  const product = await Product.findByIdAndUpdate(params.id, updateData, { new: true })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(product)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()

  const updateCount = await Update.countDocuments({ productId: params.id })
  if (updateCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${updateCount} update(s) reference this product` },
      { status: 409 }
    )
  }

  const product = await Product.findByIdAndDelete(params.id)
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
