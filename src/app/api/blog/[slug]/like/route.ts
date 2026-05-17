export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { BlogPost } from '@/models/BlogPost'
import { Types } from 'mongoose'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })

  await connectDB()
  const post = await BlogPost.findOne({ slug })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const userId = new Types.ObjectId(session.user.id)
  const idx = post.likes.findIndex((id: { toString(): string }) => id.toString() === session.user.id)
  if (idx === -1) {
    post.likes.push(userId)
  } else {
    post.likes.splice(idx, 1)
  }
  await post.save()

  return NextResponse.json({ liked: idx === -1, likeCount: post.likes.length })
}
