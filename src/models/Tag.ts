import mongoose, { Schema, Document } from 'mongoose'

export interface ITag extends Document {
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
}

const TagSchema = new Schema<ITag>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true }
)

TagSchema.index({ slug: 1 })

export const Tag = mongoose.models.Tag || mongoose.model<ITag>('Tag', TagSchema)
