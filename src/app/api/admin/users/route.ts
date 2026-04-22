import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const users = await User.find().sort({ createdAt: -1 }).lean()

  const serialized = users.map((u) => ({
    _id: u._id.toString(),
    email: u.email,
    name: u.name,
    role: u.role,
    isWhitelisted: u.isWhitelisted,
    createdAt: u.createdAt.toISOString(),
  }))

  return NextResponse.json(serialized)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const { email, name, role } = await req.json()

  if (!email || !name) {
    return NextResponse.json({ error: 'Email and name are required' }, { status: 400 })
  }

  const validRole = ['viewer', 'admin'].includes(role) ? role : 'viewer'

  const existing = await User.findOne({ email: email.toLowerCase() })
  if (existing) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
  }

  const user = await User.create({ email, name, role: validRole, isWhitelisted: true })

  return NextResponse.json({
    _id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    isWhitelisted: user.isWhitelisted,
    createdAt: user.createdAt.toISOString(),
  }, { status: 201 })
}
