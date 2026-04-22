export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { SavedUpdate } from '@/models/SavedUpdate'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  await SavedUpdate.findOneAndUpdate(
    { userId: session.user.id, updateId: params.id },
    { userId: session.user.id, updateId: params.id, savedAt: new Date() },
    { upsert: true, new: true }
  )
  return NextResponse.json({ saved: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  await SavedUpdate.deleteOne({ userId: session.user.id, updateId: params.id })
  return NextResponse.json({ saved: false })
}
