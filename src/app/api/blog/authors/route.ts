export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

export async function GET(req: NextRequest) {
  const session = await getSession(req.headers)
  if (!session || session.user.role !== 'admin') {
    return new Response(null, { status: 401 })
  }
  await connectDB()
  const users = await User.find({ role: { $in: ['viewer', 'admin'] } }).select('name').sort({ name: 1 }).lean()
  return NextResponse.json(users.map((u) => ({ _id: u._id.toString(), name: u.name })))
}
