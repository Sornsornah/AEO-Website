import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  const body = await req.json()
  const update: Record<string, unknown> = {}
  if ('bannerEnabled' in body) update.bannerEnabled = body.bannerEnabled
  if ('bannerText' in body) update.bannerText = body.bannerText
  if ('bannerStyle' in body) update.bannerStyle = body.bannerStyle
  if ('followParentBanner' in body) update.followParentBanner = body.followParentBanner

  console.log('[product banner PATCH]', params.id, update)

  const product = await Product.findByIdAndUpdate(params.id, { $set: update }, { returnDocument: 'after' })
  console.log('[product banner result]', product ? 'found' : 'NOT FOUND', product?._id)
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
