import mongoose, { Schema, Document } from 'mongoose'

export interface IHomeConfig extends Document {
  key: string
  // Positional slot array: index = constellation slot (0–7), `null` = empty slot.
  // Stored as Mixed so empty slots survive as `null` (an ObjectId array would
  // drop them) and so both legacy ObjectId values and string ids read back.
  featuredProductIds: (string | null)[]
}

const HomeConfigSchema = new Schema<IHomeConfig>({
  key: { type: String, required: true, unique: true, default: 'home' },
  featuredProductIds: { type: [Schema.Types.Mixed], default: [] },
})

export const HomeConfig =
  mongoose.models.HomeConfig || mongoose.model<IHomeConfig>('HomeConfig', HomeConfigSchema)
