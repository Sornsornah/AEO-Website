import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { PageSetting } from '@/models/PageSetting'

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  const { order } = await req.json()
  if (!Array.isArray(order)) {
    return NextResponse.json({ error: 'order must be an array of pageKeys' }, { status: 400 })
  }

  await Promise.all(
    order.map((pageKey: string, index: number) =>
      PageSetting.updateOne({ pageKey }, { $set: { order: index } })
    )
  )

  return NextResponse.json({ ok: true })
}
