import mongoose, { Schema, Document, Types } from 'mongoose'

export interface INotification extends Document {
  userId: Types.ObjectId
  type: 'mention' | 'team_mention'
  fromUserId: Types.ObjectId
  fromUserName: string
  commentId: Types.ObjectId
  updateId: Types.ObjectId
  updateTitle: string
  read: boolean
  createdAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['mention', 'team_mention'], required: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fromUserName: { type: String, required: true },
    commentId: { type: Schema.Types.ObjectId, ref: 'Comment', required: true },
    updateId: { type: Schema.Types.ObjectId, ref: 'Update', required: true },
    updateTitle: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

NotificationSchema.index({ userId: 1, createdAt: -1 })

export const Notification =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema)
