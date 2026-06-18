import mongoose, { Schema, Document, Types } from 'mongoose'

export const ANALYTICS_EVENT_TYPES = [
  'site_access',
  'page_view',
  'product_view',
  'product_visit_website',
  'product_share',
  'blog_view',
  'blog_share',
  'blog_like',
  'blog_unlike',
  'blog_save',
  'blog_unsave',
  'blog_comment_add',
  'blog_comment_edit',
  'blog_comment_delete',
  'blog_post',
  'blog_draft',
  'update_comment_add',
  'update_comment_edit',
  'update_comment_delete',
] as const

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number]

export interface IAnalyticsEvent extends Document {
  type: AnalyticsEventType
  userId?: Types.ObjectId
  visitorId?: string
  entityId?: Types.ObjectId
  entityType?: 'product' | 'blog' | 'update'
  category?: string
  path?: string
  createdAt: Date
  updatedAt: Date
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    type: { type: String, enum: ANALYTICS_EVENT_TYPES, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    visitorId: { type: String },
    entityId: { type: Schema.Types.ObjectId },
    entityType: { type: String, enum: ['product', 'blog', 'update'] },
    category: { type: String },
    path: { type: String },
  },
  { timestamps: true }
)

AnalyticsEventSchema.index({ type: 1, createdAt: -1 })
AnalyticsEventSchema.index({ entityId: 1, type: 1 })
AnalyticsEventSchema.index({ userId: 1, type: 1 })
// Per-user activity timeline (User Activity dashboard tab)
AnalyticsEventSchema.index({ userId: 1, createdAt: -1 })

export const AnalyticsEvent =
  mongoose.models.AnalyticsEvent ||
  mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema)
