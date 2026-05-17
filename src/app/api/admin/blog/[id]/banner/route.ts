import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { BlogPost } from '@/models/BlogPost'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(req.headers)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  const body = await req.json()
  const update: Record<string, unknown> = {}
  if ('bannerEnabled' in body) update.bannerEnabled = body.bannerEnabled
  if ('bannerText' in body) update.bannerText = body.bannerText
  if ('bannerStyle' in body) update.bannerStyle = body.bannerStyle
  if ('followParentBanner' in body) update.followParentBanner = body.followParentBanner

  console.log('[blog banner PATCH]', id, update)

  const post = await BlogPost.findByIdAndUpdate(id, { $set: update }, { returnDocument: 'after' })
  console.log('[blog banner result]', post ? 'found' : 'NOT FOUND', post?._id)
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
