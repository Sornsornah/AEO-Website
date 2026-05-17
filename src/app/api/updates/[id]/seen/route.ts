export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { UserSeenUpdate } from '@/models/UserSeenUpdate'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })

  await connectDB()

  await UserSeenUpdate.findOneAndUpdate(
    { userId: session.user.id, updateId: id },
    { $set: { seenAt: new Date() } },
    { upsert: true }
  )

  return NextResponse.json({ success: true })
}
