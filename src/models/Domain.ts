import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IDomain extends Document {
  name: string
  slug: string
  description?: string
  members: Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const DomainSchema = new Schema<IDomain>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

export const Domain = mongoose.models.Domain || mongoose.model<IDomain>('Domain', DomainSchema)
