import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { BlogCategory } from '@/models/BlogCategory'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(req.headers)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  await connectDB()

  const { name, purpose, color } = await req.json()
  const update: Record<string, string | undefined> = {}
  if (name !== undefined) update.name = name.trim()
  if (purpose !== undefined) update.purpose = purpose.trim() || undefined
  if (color !== undefined) update.color = color.trim()

  const category = await BlogCategory.findByIdAndUpdate(id, update, { new: true })
  if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(category)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(req.headers)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  await connectDB()

  await BlogCategory.findByIdAndDelete(id)
  return NextResponse.json({ ok: true })
}
