import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { ExternalArticle } from '@/models/ExternalArticle'

export async function GET() {
  await connectDB()
  const articles = await ExternalArticle.find().sort({ order: 1, createdAt: -1 }).lean()
  return NextResponse.json(
    articles.map((a) => ({
      _id: a._id.toString(),
      title: a.title,
      description: a.description,
      url: a.url,
      category: a.category,
      order: a.order,
    }))
  )
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, description, url, category, order } = await req.json()
  if (!title || !description || !url || !category) {
    return NextResponse.json({ error: 'title, description, url, and category are required' }, { status: 400 })
  }

  await connectDB()
  const article = await ExternalArticle.create({ title, description, url, category, order: order ?? 0 })
  return NextResponse.json({ _id: article._id.toString() }, { status: 201 })
}
