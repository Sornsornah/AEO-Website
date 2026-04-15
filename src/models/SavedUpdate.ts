import mongoose, { Schema, Document, Types } from 'mongoose'

export interface ISavedUpdate extends Document {
  userId: Types.ObjectId
  updateId: Types.ObjectId
  savedAt: Date
}

const SavedUpdateSchema = new Schema<ISavedUpdate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updateId: { type: Schema.Types.ObjectId, ref: 'Update', required: true },
    savedAt: { type: Date, default: Date.now },
  }
)

SavedUpdateSchema.index({ userId: 1, updateId: 1 }, { unique: true })

export const SavedUpdate = mongoose.models.SavedUpdate || mongoose.model<ISavedUpdate>('SavedUpdate', SavedUpdateSchema)
