import mongoose, { Schema, type Document } from 'mongoose'
import type { BlogCategory } from './BlogPost'

export interface IExternalArticle extends Document {
  title: string
  description: string
  url: string
  category: BlogCategory
  order: number
  createdAt: Date
  updatedAt: Date
}

const ExternalArticleSchema = new Schema<IExternalArticle>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['thought', 'learning-journey', 'field-notes', 'deep-dive'],
      required: true,
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export const ExternalArticle =
  mongoose.models.ExternalArticle ||
  mongoose.model<IExternalArticle>('ExternalArticle', ExternalArticleSchema)
