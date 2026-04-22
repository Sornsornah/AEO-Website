export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Domain } from '@/models/Domain'
import { Product } from '@/models/Product'
import { slugify } from '@/lib/utils'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  const domain = await Domain.findByIdAndUpdate(params.id, updateData, { new: true })
  if (!domain) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(domain)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()

  const productCount = await Product.countDocuments({ domainId: params.id })
  if (productCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${productCount} product(s) belong to this domain` },
      { status: 409 }
    )
  }

  const domain = await Domain.findByIdAndDelete(params.id)
  if (!domain) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
