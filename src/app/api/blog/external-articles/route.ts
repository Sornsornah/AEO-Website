import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { ExternalArticle } from '@/models/ExternalArticle'
import { computeDiff, writeLog, serializeExternalArticleSnapshot } from '@/lib/activityLog'

export async function GET() {
  await connectDB()
  const articles = await ExternalArticle.find().sort({ order: 1, createdAt: -1 }).lean()
  return NextResponse.json(
    articles.map((a) => ({
      _id: a._id.toString(),
      title: a.title,
      description: a.description,
      url: a.url,
      order: a.order,
    }))
  )
}

export async function POST(req: NextRequest) {
  const session = await getSession(req.headers)
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, description, url, order } = await req.json()
  if (!title || !description || !url) {
    return NextResponse.json({ error: 'title, description, and url are required' }, { status: 400 })
  }

  await connectDB()
  const article = await ExternalArticle.create({ title, description, url, order: order ?? 0 })

  const changes = computeDiff('external_article', null, article.toObject())
  await writeLog({
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? 'Unknown',
    action: 'create',
    entityType: 'external_article',
    entityId: article._id.toString(),
    entityTitle: article.title,
    changes,
    afterSnapshot: serializeExternalArticleSnapshot(article.toObject()),
  })

  return NextResponse.json({ _id: article._id.toString() }, { status: 201 })
}
