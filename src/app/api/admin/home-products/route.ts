export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { HomeConfig } from '@/models/HomeConfig'

const MAX_FEATURED = 8

export async function PUT(req: NextRequest) {
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  const { productIds } = (await req.json()) as { productIds?: unknown }
  if (!Array.isArray(productIds) || !productIds.every((id) => typeof id === 'string')) {
    return NextResponse.json({ error: 'productIds must be an array of strings' }, { status: 400 })
  }

  const featuredProductIds = productIds.slice(0, MAX_FEATURED)

  await HomeConfig.updateOne(
    { key: 'home' },
    { $set: { featuredProductIds } },
    { upsert: true }
  )

  return NextResponse.json({ ok: true })
}
