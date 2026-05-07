export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Domain } from '@/models/Domain'
import { Product } from '@/models/Product'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const { domainIds, productIds } = await req.json()

  const userId = params.id
  const dIds = Array.isArray(domainIds) ? domainIds : []
  const pIds = Array.isArray(productIds) ? productIds : []

  await Promise.all([
    Domain.updateMany({ _id: { $in: dIds } }, { $addToSet: { members: userId } }),
    Domain.updateMany({ _id: { $nin: dIds } }, { $pull: { members: userId } }),
    Product.updateMany({ _id: { $in: pIds } }, { $addToSet: { members: userId } }),
    Product.updateMany({ _id: { $nin: pIds } }, { $pull: { members: userId } }),
  ])

  return NextResponse.json({ success: true })
}
