export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'
import { writeLog } from '@/lib/activityLog'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const { ids } = await req.json() as { ids: string[] }

  if (!Array.isArray(ids)) return NextResponse.json({ error: 'ids must be an array' }, { status: 400 })

  const before = await Product.find({ _id: { $in: ids } }).lean()
  const beforeMap = new Map(before.map((p) => [p._id.toString(), p]))

  await Promise.all(ids.map((id, index) => Product.findByIdAndUpdate(id, { order: index })))

  // Collect products whose order actually changed
  const movedBefore: { name: string; order: number }[] = []
  const movedAfter: { name: string; order: number }[] = []

  for (let index = 0; index < ids.length; index++) {
    const id = ids[index]
    const prev = beforeMap.get(id)
    if (prev && (prev.order ?? 0) !== index) {
      movedBefore.push({ name: prev.name, order: prev.order ?? 0 })
      movedAfter.push({ name: prev.name, order: index })
    }
  }

  if (movedBefore.length > 0) {
    // Build full ordered snapshots for diff preview
    const beforeSnapshot = {
      products: ids.map((id) => {
        const p = beforeMap.get(id)
        return { _id: id, name: p?.name ?? id, color: p?.color ?? '#6366f1', order: p?.order ?? 0, isHidden: p?.isHidden ?? false }
      }).sort((a, b) => a.order - b.order),
    }
    const afterSnapshot = {
      products: ids.map((id, index) => {
        const p = beforeMap.get(id)
        return { _id: id, name: p?.name ?? id, color: p?.color ?? '#6366f1', order: index, isHidden: p?.isHidden ?? false }
      }),
    }

    await writeLog({
      userId: session.user.id,
      userName: session.user.name ?? session.user.email ?? 'Unknown',
      action: 'reorder',
      entityType: 'product_order',
      entityId: session.user.id,
      entityTitle: 'Product ordering',
      changes: [{ field: 'order', before: movedBefore, after: movedAfter }],
      beforeSnapshot,
      afterSnapshot,
    })
  }

  return NextResponse.json({ ok: true })
}
