export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Domain } from '@/models/Domain'
import { Product } from '@/models/Product'
import { slugify } from '@/lib/utils'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const body = await req.json()
  const { name, description, members } = body

  const updateData: Record<string, unknown> = {}
  if (name) {
    updateData.name = name
    updateData.slug = slugify(name)
  }
  if (description !== undefined) updateData.description = description
  if (members !== undefined) updateData.members = Array.isArray(members) ? members : []

  const domain = await Domain.findByIdAndUpdate(id, updateData, { new: true })
  if (!domain) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(domain)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()

  const productCount = await Product.countDocuments({ domainId: id })
  if (productCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${productCount} product(s) belong to this domain` },
      { status: 409 }
    )
  }

  const domain = await Domain.findByIdAndDelete(id)
  if (!domain) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
