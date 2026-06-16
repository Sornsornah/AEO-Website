export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { handleApiError } from '@/lib/handle-api-error'
import { User } from '@/models/User'
import { fetchUserActivity } from '@/features/dashboard/lib/activity-query'

const MAX_LIMIT = 500
const DEFAULT_LIMIT = 200

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req.headers)
    if (!session) return new Response(null, { status: 401 })
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'A valid userId is required' }, { status: 400 })
    }

    const now = new Date()
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : defaultFrom
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : now
    const limit = Math.min(Number(searchParams.get('limit')) || DEFAULT_LIMIT, MAX_LIMIT)
    const skip = Math.max(Number(searchParams.get('skip')) || 0, 0)

    await connectDB()

    const [user, { rows: activity, hasMore }] = await Promise.all([
      User.findById(userId).select('_id name email role').lean(),
      fetchUserActivity(userId, from, to, limit, skip),
    ])

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    return NextResponse.json({
      user: {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      range: { from: from.toISOString(), to: to.toISOString() },
      total: activity.length,
      hasMore,
      activity,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
