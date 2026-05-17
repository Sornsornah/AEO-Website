export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { ActivityLog } from '@/models/ActivityLog'
import { Product } from '@/models/Product'
import { Domain } from '@/models/Domain'
import { Tag } from '@/models/Tag'

const PAGE_SIZE = 50

type IdNameMap = Record<string, string>

function toIdNameMap(docs: { _id: unknown; name: string }[]): IdNameMap {
  const map: IdNameMap = {}
  for (const d of docs) {
    map[String(d._id)] = d.name
  }
  return map
}

// Resolve an array of stored IDs (strings, ObjectIds, or populated docs) to names
function resolveArray(arr: unknown, nameMap: IdNameMap): string[] {
  if (!Array.isArray(arr)) return []
  return arr.map((item) => {
    if (item === null || item === undefined) return ''
    // Populated document stored with a name field
    if (typeof item === 'object') {
      const obj = item as Record<string, unknown>
      if (typeof obj.name === 'string' && obj.name) return obj.name
      // Has _id — look up by it
      if (obj._id) {
        const name = nameMap[String(obj._id)]
        if (name) return name
      }
    }
    // Plain string ID
    const id = String(item)
    return nameMap[id] ?? id
  }).filter(Boolean)
}

export async function GET(req: NextRequest) {
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const skip = (page - 1) * PAGE_SIZE

  const [logs, totalCount, productDocs, domainDocs, tagDocs] = await Promise.all([
    ActivityLog.find().sort({ createdAt: -1 }).skip(skip).limit(PAGE_SIZE).lean(),
    ActivityLog.countDocuments(),
    Product.find({}, 'name').lean(),
    Domain.find({}, 'name').lean(),
    Tag.find({}, 'name').lean(),
  ])

  const productNames = toIdNameMap(productDocs as { _id: unknown; name: string }[])
  const domainNames = toIdNameMap(domainDocs as { _id: unknown; name: string }[])
  const tagNames = toIdNameMap(tagDocs as { _id: unknown; name: string }[])

  const FIELD_NAME_MAP: Record<string, IdNameMap> = {
    productIds: productNames,
    domainIds: domainNames,
    tagIds: tagNames,
  }

  const serialized = logs.map((log) => ({
    _id: log._id.toString(),
    userId: log.userId.toString(),
    userName: log.userName,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId.toString(),
    entityTitle: log.entityTitle,
    changes: log.changes.map((change: { field: string; before: unknown; after: unknown }) => {
      const nameMap = FIELD_NAME_MAP[change.field]
      if (!nameMap) return change
      return {
        field: change.field,
        before: resolveArray(change.before, nameMap),
        after: resolveArray(change.after, nameMap),
      }
    }),
    beforeSnapshot: log.beforeSnapshot ?? null,
    afterSnapshot: log.afterSnapshot ?? null,
    createdAt: (log.createdAt as Date).toISOString(),
  }))

  return NextResponse.json({ logs: serialized, totalCount, page, hasMore: skip + logs.length < totalCount })
}
