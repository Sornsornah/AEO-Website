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

  // Positional slot array: each entry is a product id string or `null` for an
  // empty constellation slot. Index = slot (0–7); gaps are preserved.
  const { productIds } = (await req.json()) as { productIds?: unknown }
  if (
    !Array.isArray(productIds) ||
    !productIds.every((id) => id === null || typeof id === 'string')
  ) {
    return NextResponse.json(
      { error: 'productIds must be an array of product-id strings or null' },
      { status: 400 }
    )
  }

  const slots = productIds.slice(0, MAX_FEATURED) as (string | null)[]

  // No product may occupy two slots.
  const filled = slots.filter((id): id is string => typeof id === 'string')

  // At least one product must be featured — the homepage section is hidden
  // entirely when nothing is configured, so an empty arrangement is rejected.
  if (filled.length === 0) {
    return NextResponse.json(
      { error: 'At least one product must be featured on the homepage' },
      { status: 400 }
    )
  }

  if (new Set(filled).size !== filled.length) {
    return NextResponse.json(
      { error: 'A product cannot be featured in more than one slot' },
      { status: 400 }
    )
  }

  // Trim trailing empty slots so we never persist a longer-than-needed array,
  // but keep interior gaps (they carry slot positions).
  let end = slots.length
  while (end > 0 && slots[end - 1] === null) end--
  const featuredProductIds = slots.slice(0, end)

  await HomeConfig.updateOne(
    { key: 'home' },
    { $set: { featuredProductIds } },
    { upsert: true }
  )

  return NextResponse.json({ ok: true })
}
