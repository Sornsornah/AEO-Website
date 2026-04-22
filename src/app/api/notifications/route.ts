export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Notification } from '@/models/Notification'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const notifications = await Notification.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()

  return NextResponse.json(
    notifications.map((n) => ({
      _id: n._id.toString(),
      type: n.type,
      fromUserName: n.fromUserName,
      updateId: n.updateId.toString(),
      updateTitle: n.updateTitle,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    }))
  )
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const ids = Array.isArray(body.ids) ? body.ids : undefined

  await connectDB()
  await Notification.updateMany(
    {
      userId: session.user.id,
      ...(ids ? { _id: { $in: ids } } : { read: false }),
    },
    { read: true }
  )

  return NextResponse.json({ ok: true })
}
