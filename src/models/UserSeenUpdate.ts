import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IUserSeenUpdate extends Document {
  userId: Types.ObjectId
  updateId: Types.ObjectId
  seenAt: Date
}

const UserSeenUpdateSchema = new Schema<IUserSeenUpdate>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updateId: { type: Schema.Types.ObjectId, ref: 'Update', required: true },
  seenAt: { type: Date, default: Date.now },
})

UserSeenUpdateSchema.index({ userId: 1, updateId: 1 }, { unique: true })

export const UserSeenUpdate =
  mongoose.models.UserSeenUpdate ||
  mongoose.model<IUserSeenUpdate>('UserSeenUpdate', UserSeenUpdateSchema)
