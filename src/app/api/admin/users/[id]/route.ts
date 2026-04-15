import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const body = await req.json()
  const update: Record<string, unknown> = {}

  if (typeof body.isWhitelisted === 'boolean') update.isWhitelisted = body.isWhitelisted
  if (body.role && ['viewer', 'editor', 'admin'].includes(body.role)) update.role = body.role

  const user = await User.findByIdAndUpdate(params.id, update, { new: true })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    _id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    isWhitelisted: user.isWhitelisted,
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (params.id === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  await connectDB()
  const user = await User.findByIdAndDelete(params.id)
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
