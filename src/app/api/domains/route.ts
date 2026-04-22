export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Domain } from '@/models/Domain'
import { slugify } from '@/lib/utils'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const domains = await Domain.find().sort({ name: 1 }).lean()
  return NextResponse.json(domains)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const body = await req.json()
  const { name, description, members } = body

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const slug = slugify(name)
  const existing = await Domain.findOne({ slug })
  if (existing) return NextResponse.json({ error: 'A domain with this name already exists' }, { status: 409 })

  const domain = await Domain.create({ name, slug, description, members: Array.isArray(members) ? members : [] })
  return NextResponse.json(domain, { status: 201 })
}
