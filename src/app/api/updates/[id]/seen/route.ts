import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { UserSeenUpdate } from '@/models/UserSeenUpdate'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  await UserSeenUpdate.findOneAndUpdate(
    { userId: session.user.id, updateId: params.id },
    { $set: { seenAt: new Date() } },
    { upsert: true }
  )

  return NextResponse.json({ success: true })
}
