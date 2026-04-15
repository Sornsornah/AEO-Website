import mongoose, { Schema, Document } from 'mongoose'

export interface IDomain extends Document {
  name: string
  slug: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

const DomainSchema = new Schema<IDomain>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
)

export const Domain = mongoose.models.Domain || mongoose.model<IDomain>('Domain', DomainSchema)
