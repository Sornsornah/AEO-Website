import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { ExternalArticle } from '@/models/ExternalArticle'
import { computeDiff, writeLog, serializeExternalArticleSnapshot } from '@/lib/activityLog'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(req.headers)
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, description, url, order, isHidden } = await req.json()
  await connectDB()
  const article = await ExternalArticle.findById(id)
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const beforeSnapshot = serializeExternalArticleSnapshot(article.toObject())

  if (title) article.title = title
  if (description) article.description = description
  if (url) article.url = url
  if (order !== undefined) article.order = order
  if (isHidden !== undefined) article.isHidden = isHidden

  await article.save()

  const changes = computeDiff('external_article', beforeSnapshot, article.toObject())
  if (changes.length > 0) {
    await writeLog({
      userId: session.user.id,
      userName: session.user.name ?? session.user.email ?? 'Unknown',
      action: 'update',
      entityType: 'external_article',
      entityId: article._id.toString(),
      entityTitle: article.title,
      changes,
      beforeSnapshot,
      afterSnapshot: serializeExternalArticleSnapshot(article.toObject()),
    })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(req.headers)
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const article = await ExternalArticle.findById(id).lean()
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await ExternalArticle.findByIdAndDelete(id)
  await writeLog({
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? 'Unknown',
    action: 'delete',
    entityType: 'external_article',
    entityId: id,
    entityTitle: (article as Record<string, unknown>).title as string,
    changes: [],
    beforeSnapshot: serializeExternalArticleSnapshot(article as Record<string, unknown>),
  })
  return NextResponse.json({ ok: true })
}
