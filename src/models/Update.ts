import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IUpdate extends Document {
  title: string
  summary: string
  content?: string
  domainId?: Types.ObjectId
  domainIds: Types.ObjectId[]
  productId?: Types.ObjectId
  tagIds: Types.ObjectId[]
  date: Date
  highlights: string[]
  progressUpdates: string
  nextSteps: string
  learningPoints: string
  media: string[]
  isPublished: boolean
  createdBy?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const UpdateSchema = new Schema<IUpdate>(
  {
    title: { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true },
    content: { type: String, required: false },
    domainId: { type: Schema.Types.ObjectId, ref: 'Domain', required: false },
    domainIds: [{ type: Schema.Types.ObjectId, ref: 'Domain' }],
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: false },
    tagIds: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    date: { type: Date, required: true },
    highlights: [{ type: String, trim: true }],
    progressUpdates: { type: String, default: '' },
    nextSteps: { type: String, default: '' },
    learningPoints: { type: String, default: '' },
    media: [{ type: String }],
    isPublished: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

UpdateSchema.index({ productId: 1 })
UpdateSchema.index({ date: -1 })
UpdateSchema.index({ isPublished: 1 })

export const Update = mongoose.models.Update || mongoose.model<IUpdate>('Update', UpdateSchema)
