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
