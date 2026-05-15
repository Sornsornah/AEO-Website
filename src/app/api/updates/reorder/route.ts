export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Update } from '@/models/Update'
import { writeLog } from '@/lib/activityLog'
import { formatMonthYear } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()

  const { monthKey, ids } = await req.json() as { monthKey: string; ids: string[] }

  if (!monthKey || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'monthKey and ids are required' }, { status: 400 })
  }

  const docs = await Update.find({ _id: { $in: ids } }, { _id: 1, title: 1, date: 1, order: 1 }).lean()

  // Validate every doc belongs to the declared month
  const wrongMonth = docs.find((d) => formatMonthYear(d.date) !== monthKey)
  if (wrongMonth) {
    return NextResponse.json({ error: 'One or more updates do not belong to the declared month' }, { status: 400 })
  }

  const beforeMap = new Map(docs.map((d) => [d._id.toString(), d]))

  await Promise.all(ids.map((id, index) => Update.findByIdAndUpdate(id, { order: index })))

  const movedBefore: { title: string; order: number }[] = []
  const movedAfter: { title: string; order: number }[] = []

  for (let index = 0; index < ids.length; index++) {
    const prev = beforeMap.get(ids[index])
    if (prev && (prev.order ?? 0) !== index) {
      movedBefore.push({ title: prev.title, order: prev.order ?? 0 })
      movedAfter.push({ title: prev.title, order: index })
    }
  }

  if (movedBefore.length > 0) {
    const beforeSnapshot = {
      updates: ids.map((id) => {
        const d = beforeMap.get(id)
        return { _id: id, title: d?.title ?? id, order: d?.order ?? 0 }
      }).sort((a, b) => a.order - b.order),
    }
    const afterSnapshot = {
      updates: ids.map((id, index) => {
        const d = beforeMap.get(id)
        return { _id: id, title: d?.title ?? id, order: index }
      }),
    }

    await writeLog({
      userId: session.user.id,
      userName: session.user.name ?? session.user.email ?? 'Unknown',
      action: 'reorder',
      entityType: 'update_order',
      entityId: session.user.id,
      entityTitle: `Update ordering — ${monthKey}`,
      changes: [{ field: 'order', before: movedBefore, after: movedAfter }],
      beforeSnapshot,
      afterSnapshot,
    })
  }

  return NextResponse.json({ ok: true })
}
