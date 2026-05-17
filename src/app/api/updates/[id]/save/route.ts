export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { SavedUpdate } from '@/models/SavedUpdate'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })

  await connectDB()
  await SavedUpdate.findOneAndUpdate(
    { userId: session.user.id, updateId: id },
    { userId: session.user.id, updateId: id, savedAt: new Date() },
    { upsert: true, new: true }
  )
  return NextResponse.json({ saved: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })

  await connectDB()
  await SavedUpdate.deleteOne({ userId: session.user.id, updateId: id })
  return NextResponse.json({ saved: false })
}
