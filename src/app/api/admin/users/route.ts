import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['viewer', 'admin']).optional(),
})

export async function GET(req: NextRequest) {
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })
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
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const parsed = createUserSchema.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const { email, name, role } = parsed.data

  const validRole = role ?? 'viewer'

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
