import mongoose, { Schema, Document, Types } from 'mongoose'

export type ActivityAction = 'create' | 'update' | 'reorder' | 'delete'
export type ActivityEntityType = 'update' | 'product' | 'blog' | 'product_order' | 'update_order' | 'external_article' | 'external_article_order'

export interface IFieldChange {
  field: string
  before: unknown
  after: unknown
}

export interface IActivityLog extends Document {
  userId: Types.ObjectId
  userName: string
  action: ActivityAction
  entityType: ActivityEntityType
  entityId: Types.ObjectId
  entityTitle: string
  changes: IFieldChange[]
  beforeSnapshot?: unknown
  afterSnapshot?: unknown
  createdAt: Date
}

const FieldChangeSchema = new Schema<IFieldChange>(
  {
    field: { type: String, required: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false }
)

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    action: { type: String, enum: ['create', 'update', 'reorder', 'delete'], required: true },
    entityType: { type: String, enum: ['update', 'product', 'blog', 'product_order', 'external_article', 'external_article_order'], required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    entityTitle: { type: String, required: true },
    changes: [FieldChangeSchema],
    beforeSnapshot: { type: Schema.Types.Mixed, default: null },
    afterSnapshot: { type: Schema.Types.Mixed, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

ActivityLogSchema.index({ createdAt: -1 })

export const ActivityLog =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema)
