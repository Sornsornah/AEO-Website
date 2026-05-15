import { connectDB } from '@/lib/mongodb'
import { ActivityLog, ActivityAction, ActivityEntityType, IFieldChange } from '@/models/ActivityLog'

export const TRACKED_FIELDS: Record<ActivityEntityType, string[]> = {
  update:  ['title', 'isPublished', 'scheduledAt', 'date', 'productIds', 'domainIds', 'tagIds',
             'progressUpdates', 'nextSteps', 'learningPoints', 'content'],
  product: [
    'name', 'status', 'color', 'shortDescription', 'description',
    'logoUrl', 'uiScreenshot', 'websiteUrl', 'deckUrl', 'contactUsUrl',
    'overviewContent', 'vision', 'mission', 'goals',
    'highlightStats', 'productManagers', 'developers',
    'useCases', 'productUpdates',
    'isHidden', 'order',
  ],
  blog: [
    'title', 'excerpt', 'coverImage', 'content',
    'category', 'tags', 'authorName', 'publishedAt',
    'status', 'isFeatured', 'featuredUntil',
  ],
  product_order:          [],
  update_order:           [],
  external_article:       ['title', 'description', 'url', 'isHidden'],
  external_article_order: [],
}

type PlainObject = Record<string, unknown>

function normalizeValue(val: unknown): unknown {
  if (val === null || val === undefined) return null
  if (val instanceof Date) return val.toISOString()
  if (Array.isArray(val)) return val.map(normalizeValue)
  if (typeof val === 'object' && val !== null) {
    const str = (val as { toString(): string }).toString()
    if (/^[0-9a-f]{24}$/.test(str)) return str
    // Populated Mongoose doc — extract its _id
    const obj = val as Record<string, unknown>
    if ('_id' in obj) return normalizeValue(obj._id)
  }
  return val
}

export function computeDiff(
  entityType: ActivityEntityType,
  before: PlainObject | null,
  after: PlainObject
): IFieldChange[] {
  const fields = TRACKED_FIELDS[entityType]
  const changes: IFieldChange[] = []

  for (const field of fields) {
    const beforeVal = before ? normalizeValue(before[field]) : null
    const afterVal = normalizeValue(after[field])
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      changes.push({ field, before: beforeVal, after: afterVal })
    }
  }

  return changes
}

interface WriteLogParams {
  userId: string
  userName: string
  action: ActivityAction
  entityType: ActivityEntityType
  entityId: string
  entityTitle: string
  changes: IFieldChange[]
  beforeSnapshot?: unknown
  afterSnapshot?: unknown
}

export async function writeLog(params: WriteLogParams): Promise<void> {
  try {
    await connectDB()
    await ActivityLog.create(params)
  } catch (err) {
    console.error('[ActivityLog] Failed to write log entry:', err)
  }
}

// Snapshot serializers — store only display-relevant fields for the diff modal

type PlainDoc = Record<string, unknown>

export function serializeProductSnapshot(doc: PlainDoc): Record<string, unknown> {
  return {
    name: doc.name ?? null,
    status: doc.status ?? 'live',
    color: doc.color ?? '#6366f1',
    shortDescription: doc.shortDescription ?? null,
    description: doc.description ?? null,
    logoUrl: doc.logoUrl ?? null,
    uiScreenshot: doc.uiScreenshot ?? null,
    websiteUrl: doc.websiteUrl ?? null,
    deckUrl: doc.deckUrl ?? null,
    contactUsUrl: doc.contactUsUrl ?? null,
    overviewContent: doc.overviewContent ?? null,
    vision: doc.vision ?? null,
    mission: doc.mission ?? null,
    goals: doc.goals ?? null,
    highlightStats: Array.isArray(doc.highlightStats) ? doc.highlightStats : [],
    productManagers: Array.isArray(doc.productManagers) ? doc.productManagers : [],
    developers: Array.isArray(doc.developers) ? doc.developers : [],
    useCases: Array.isArray(doc.useCases) ? doc.useCases : [],
    productUpdates: Array.isArray(doc.productUpdates) ? doc.productUpdates : [],
    isHidden: doc.isHidden ?? false,
    order: doc.order ?? 0,
  }
}

export function serializeUpdateSnapshot(doc: PlainDoc): Record<string, unknown> {
  return {
    title: doc.title ?? null,
    summary: doc.summary ?? null,
    content: doc.content ?? null,
    date: doc.date ? new Date(doc.date as string | Date).toISOString() : null,
    isPublished: doc.isPublished ?? false,
    scheduledAt: doc.scheduledAt ? new Date(doc.scheduledAt as string | Date).toISOString() : null,
    progressUpdates: doc.progressUpdates ?? null,
    nextSteps: doc.nextSteps ?? null,
    learningPoints: doc.learningPoints ?? null,
  }
}

export function serializeBlogSnapshot(doc: PlainDoc): Record<string, unknown> {
  return {
    title: doc.title ?? null,
    excerpt: doc.excerpt ?? null,
    coverImage: doc.coverImage ?? null,
    content: doc.content ?? null,
    category: doc.category ?? null,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    authorName: doc.authorName ?? null,
    publishedAt: doc.publishedAt ? new Date(doc.publishedAt as string | Date).toISOString() : null,
    status: doc.status ?? 'draft',
    isFeatured: doc.isFeatured ?? false,
    featuredUntil: doc.featuredUntil ? new Date(doc.featuredUntil as string | Date).toISOString() : null,
  }
}

export function serializeExternalArticleSnapshot(doc: PlainDoc): Record<string, unknown> {
  return {
    title: doc.title ?? null,
    description: doc.description ?? null,
    url: doc.url ?? null,
    order: doc.order ?? 0,
    isHidden: doc.isHidden ?? false,
  }
}
