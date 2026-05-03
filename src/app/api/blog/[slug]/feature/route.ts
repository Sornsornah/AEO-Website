export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { BlogPost } from '@/models/BlogPost'

export async function POST(_req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const post = await BlogPost.findOne({ slug: params.slug })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  post.isFeatured = !post.isFeatured
  if (post.isFeatured) {
    post.featuredUntil = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
  } else {
    post.featuredUntil = undefined
  }
  await post.save()
  return NextResponse.json({ isFeatured: post.isFeatured })
}
