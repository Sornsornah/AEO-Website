export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Update } from '@/models/Update'
import { UserSeenUpdate } from '@/models/UserSeenUpdate'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const seenRecords = await UserSeenUpdate.find({ userId: session.user.id })
    .select('updateId')
    .lean()

  const seenIds = seenRecords.map((r) => r.updateId)

  const unseenUpdates = await Update.find({
    _id: { $nin: seenIds },
    isPublished: true,
  })
    .populate('productId')
    .sort({ date: -1 })
    .lean()

  return NextResponse.json(unseenUpdates)
}
