import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IProduct extends Document {
  name: string
  slug: string
  description?: string
  color: string
  domainId?: Types.ObjectId
  websiteUrl?: string
  deckUrl?: string
  logoUrl?: string
  members: Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    color: { type: String, default: '#6366f1' },
    domainId: { type: Schema.Types.ObjectId, ref: 'Domain', required: false },
    websiteUrl: { type: String, trim: true },
    deckUrl: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

export const Product = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)
