export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'
import { slugify } from '@/lib/utils'
import { computeDiff, writeLog, serializeProductSnapshot } from '@/lib/activityLog'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const products = await Product.find().sort({ name: 1 }).lean()
  return NextResponse.json(products)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const body = await req.json()
  const { name, description, color, domainId, websiteUrl, deckUrl, logoUrl, members } = body

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const slug = slugify(name)
  const existing = await Product.findOne({ slug })
  if (existing) return NextResponse.json({ error: 'A product with this name already exists' }, { status: 409 })

  const product = await Product.create({
    name, slug, description,
    color: color || '#6366f1',
    domainId: domainId || undefined,
    websiteUrl: websiteUrl || undefined,
    deckUrl: deckUrl || undefined,
    logoUrl: logoUrl || undefined,
    members: Array.isArray(members) ? members : [],
  })

  const changes = computeDiff('product', null, product.toObject())
  await writeLog({
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? 'Unknown',
    action: 'create',
    entityType: 'product',
    entityId: product._id.toString(),
    entityTitle: product.name,
    changes,
    afterSnapshot: serializeProductSnapshot(product.toObject()),
  })

  return NextResponse.json(product, { status: 201 })
}
