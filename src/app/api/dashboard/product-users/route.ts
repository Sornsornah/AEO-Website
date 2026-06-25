export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { handleApiError } from '@/lib/handle-api-error'
import { AnalyticsEvent } from '@/models/AnalyticsEvent'
import { User } from '@/models/User'

// Drill-down: which registered users performed a given action on a product.
// Anonymous (cookie-only) visitors are intentionally excluded — they have no name/email.
const ACTIONS = ['product_view', 'product_visit_website', 'product_share'] as const
type Action = (typeof ACTIONS)[number]

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req.headers)
    if (!session) return new Response(null, { status: 401 })
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    const action = searchParams.get('action') as Action | null

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ error: 'A valid productId is required' }, { status: 400 })
    }
    if (!action || !ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'A valid action is required' }, { status: 400 })
    }

    const now = new Date()
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : defaultFrom
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : now

    await connectDB()

    const grouped = await AnalyticsEvent.aggregate<{ _id: mongoose.Types.ObjectId; count: number; lastAt: Date }>([
      {
        $match: {
          type: action,
          entityId: new mongoose.Types.ObjectId(productId),
          createdAt: { $gte: from, $lte: to },
          userId: { $ne: null },
        },
      },
      { $group: { _id: '$userId', count: { $sum: 1 }, lastAt: { $max: '$createdAt' } } },
    ])

    const userIds = grouped.map((g) => g._id)
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } }).select('_id name email').lean()
      : []
    const userMap = new Map(users.map((u) => [String(u._id), u]))

    const rows = grouped
      .map((g) => {
        const u = userMap.get(String(g._id))
        return {
          _id: String(g._id),
          name: u?.name || u?.email || '',
          email: u?.email ?? '',
          count: g.count,
          lastAt: g.lastAt instanceof Date ? g.lastAt.toISOString() : String(g.lastAt),
        }
      })
      // Drop rows whose user no longer resolves rather than show "unknown".
      .filter((r) => r.name !== '')
      .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1))

    return NextResponse.json({ users: rows, total: rows.length })
  } catch (error) {
    return handleApiError(error)
  }
}
