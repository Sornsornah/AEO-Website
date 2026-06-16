export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Tag } from '@/models/Tag'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name } = await req.json()
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  await connectDB()
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const tag = await Tag.findByIdAndUpdate(id, { name: name.trim(), slug }, { new: true })
  if (!tag) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ _id: tag._id.toString(), name: tag.name, slug: tag.slug })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const tag = await Tag.findByIdAndDelete(id)
  if (!tag) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
