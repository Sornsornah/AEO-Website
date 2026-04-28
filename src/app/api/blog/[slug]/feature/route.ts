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

  if (post.isFeatured) {
    post.isFeatured = false
    await post.save()
    return NextResponse.json({ isFeatured: false })
  }

  await BlogPost.updateMany({ isFeatured: true }, { isFeatured: false })
  post.isFeatured = true
  await post.save()
  return NextResponse.json({ isFeatured: true })
}
