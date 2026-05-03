import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { BlogCategory } from '@/models/BlogCategory'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  await connectDB()

  const { name, purpose, color } = await req.json()
  const update: Record<string, string | undefined> = {}
  if (name !== undefined) update.name = name.trim()
  if (purpose !== undefined) update.purpose = purpose.trim() || undefined
  if (color !== undefined) update.color = color.trim()

  const category = await BlogCategory.findByIdAndUpdate(params.id, update, { new: true })
  if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(category)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  await connectDB()

  await BlogCategory.findByIdAndDelete(params.id)
  return NextResponse.json({ ok: true })
}
