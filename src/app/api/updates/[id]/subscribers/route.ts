export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Update } from '@/models/Update'
import { User } from '@/models/User'
import { resolveSubscriberIds } from '@/lib/thread-subscribers'

const SELECT = 'domainId domainIds productId productIds subscribers unsubscribers'

async function buildPayload(updateId: string, currentUserId: string) {
  const update = await Update.findById(updateId).select(SELECT).lean()
  if (!update) return null

  const ids = await resolveSubscriberIds(update)
  const users = await User.find({ _id: { $in: ids } }).select('name email').sort({ name: 1 }).lean()

  const subscribers = users.map((u) => ({
    id: u._id.toString(),
    name: (u as { name?: string; email: string }).name || (u as { email: string }).email,
  }))

  return {
    count: subscribers.length,
    subscribers,
    isSubscribed: ids.includes(currentUserId),
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })

  await connectDB()
  const payload = await buildPayload(id, session.user.id)
  if (!payload) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(payload)
}

// Toggle the current user's subscription for this thread.
// Body: { subscribe: boolean }
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })

  const { subscribe } = await req.json()
  const userId = session.user.id

  await connectDB()

  if (subscribe) {
    // Opt in: ensure listed as subscriber, clear any explicit opt-out.
    await Update.updateOne({ _id: id }, { $addToSet: { subscribers: userId }, $pull: { unsubscribers: userId } })
  } else {
    // Opt out: record explicit unsubscribe, drop from subscribers.
    await Update.updateOne({ _id: id }, { $addToSet: { unsubscribers: userId }, $pull: { subscribers: userId } })
  }

  const payload = await buildPayload(id, userId)
  if (!payload) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(payload)
}
