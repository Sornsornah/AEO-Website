import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { ExternalArticle } from '@/models/ExternalArticle'
import { writeLog } from '@/lib/activityLog'

export async function POST(req: NextRequest) {
  const session = await getSession(req.headers)
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { ids } = await req.json() as { ids: string[] }
  if (!Array.isArray(ids)) return NextResponse.json({ error: 'ids must be an array' }, { status: 400 })

  await connectDB()

  const before = await ExternalArticle.find({ _id: { $in: ids } }).lean()
  const beforeMap = new Map(before.map((a) => [a._id.toString(), a]))

  await Promise.all(ids.map((id, i) => ExternalArticle.findByIdAndUpdate(id, { order: i })))

  const movedBefore: { title: string; order: number }[] = []
  const movedAfter: { title: string; order: number }[] = []

  for (let index = 0; index < ids.length; index++) {
    const id = ids[index]
    const prev = beforeMap.get(id)
    if (prev && (prev.order ?? 0) !== index) {
      movedBefore.push({ title: prev.title, order: prev.order ?? 0 })
      movedAfter.push({ title: prev.title, order: index })
    }
  }

  if (movedBefore.length > 0) {
    const beforeSnapshot = {
      articles: ids.map((id) => {
        const a = beforeMap.get(id)
        return { _id: id, title: a?.title ?? id, order: a?.order ?? 0, isHidden: (a as { isHidden?: boolean })?.isHidden ?? false }
      }).sort((a, b) => a.order - b.order),
    }
    const afterSnapshot = {
      articles: ids.map((id, index) => {
        const a = beforeMap.get(id)
        return { _id: id, title: a?.title ?? id, order: index, isHidden: (a as { isHidden?: boolean })?.isHidden ?? false }
      }),
    }

    await writeLog({
      userId: session.user.id,
      userName: session.user.name ?? session.user.email ?? 'Unknown',
      action: 'reorder',
      entityType: 'external_article_order',
      entityId: session.user.id,
      entityTitle: 'Article ordering',
      changes: [{ field: 'order', before: movedBefore, after: movedAfter }],
      beforeSnapshot,
      afterSnapshot,
    })
  }

  return NextResponse.json({ ok: true })
}
