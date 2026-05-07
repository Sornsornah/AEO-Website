import mongoose, { Schema, type Document } from 'mongoose'

export interface IExternalArticle extends Document {
  title: string
  description: string
  url: string
  order: number
  isHidden: boolean
  createdAt: Date
  updatedAt: Date
}

const ExternalArticleSchema = new Schema<IExternalArticle>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    isHidden: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export const ExternalArticle =
  mongoose.models.ExternalArticle ||
  mongoose.model<IExternalArticle>('ExternalArticle', ExternalArticleSchema)
