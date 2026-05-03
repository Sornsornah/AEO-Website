import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { ExternalArticle } from '@/models/ExternalArticle'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, description, url, category, order } = await req.json()
  await connectDB()
  const article = await ExternalArticle.findByIdAndUpdate(
    params.id,
    { ...(title && { title }), ...(description && { description }), ...(url && { url }), ...(category && { category }), ...(order !== undefined && { order }) },
    { new: true }
  )
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  await ExternalArticle.findByIdAndDelete(params.id)
  return NextResponse.json({ ok: true })
}
