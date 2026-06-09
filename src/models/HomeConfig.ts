import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IHomeConfig extends Document {
  key: string
  featuredProductIds: Types.ObjectId[]
}

const HomeConfigSchema = new Schema<IHomeConfig>({
  key: { type: String, required: true, unique: true, default: 'home' },
  featuredProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
})

export const HomeConfig =
  mongoose.models.HomeConfig || mongoose.model<IHomeConfig>('HomeConfig', HomeConfigSchema)
