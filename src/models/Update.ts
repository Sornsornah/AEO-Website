import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IUpdate extends Document {
  title: string
  summary: string
  content: string
  domainId: Types.ObjectId
  productId?: Types.ObjectId
  date: Date
  highlights: string[]
  isPublished: boolean
  createdBy?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const UpdateSchema = new Schema<IUpdate>(
  {
    title: { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    domainId: { type: Schema.Types.ObjectId, ref: 'Domain', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: false },
    date: { type: Date, required: true },
    highlights: [{ type: String, trim: true }],
    isPublished: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

UpdateSchema.index({ productId: 1 })
UpdateSchema.index({ date: -1 })
UpdateSchema.index({ isPublished: 1 })

export const Update = mongoose.models.Update || mongoose.model<IUpdate>('Update', UpdateSchema)
