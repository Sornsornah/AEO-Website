import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { PageSetting } from '@/models/PageSetting'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ pageKey: string }> }) {
  const { pageKey } = await params
  const session = await getSession(req.headers)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  const body = await req.json()
  const allowed = ['label', 'navEnabled', 'bannerEnabled', 'bannerText', 'bannerStyle']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  console.log('[page-settings PATCH]', pageKey, update)

  const setting = await PageSetting.findOneAndUpdate(
    { pageKey },
    { $set: update },
    { returnDocument: 'after' }
  )

  console.log('[page-settings result]', setting ? 'found' : 'NOT FOUND')

  if (!setting) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(setting)
}
