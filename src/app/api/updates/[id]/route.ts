import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Update } from '@/models/Update'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const update = await Update.findById(params.id).populate('productId').lean()
  if (!update) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Viewers can only see published updates
  if (session.user.role === 'viewer' && !update.isPublished) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(update)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()

  const body = await req.json()
  const { title, summary, content, domainId, productId, date, highlights, isPublished } = body

  const updateData: Record<string, unknown> = {}
  if (title !== undefined) updateData.title = title
  if (summary !== undefined) updateData.summary = summary
  if (content !== undefined) updateData.content = content
  if (domainId !== undefined) updateData.domainId = domainId
  if (productId !== undefined) updateData.productId = productId || null
  if (date !== undefined) updateData.date = new Date(date)
  if (highlights !== undefined) updateData.highlights = highlights
  if (isPublished !== undefined) updateData.isPublished = isPublished

  const update = await Update.findByIdAndUpdate(params.id, updateData, { new: true })
    .populate('productId')
    .lean()

  if (!update) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(update)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()

  const update = await Update.findByIdAndDelete(params.id)
  if (!update) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
