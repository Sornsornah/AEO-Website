import mongoose, { Schema, Document } from 'mongoose'

export interface IBlogCategory extends Document {
  name: string
  slug: string
  purpose?: string
  color: string
  createdAt: Date
  updatedAt: Date
}

const BlogCategorySchema = new Schema<IBlogCategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    purpose: { type: String, trim: true },
    color: { type: String, required: true, default: '#6366f1' },
  },
  { timestamps: true }
)

export const BlogCategory =
  mongoose.models.BlogCategory || mongoose.model<IBlogCategory>('BlogCategory', BlogCategorySchema)
