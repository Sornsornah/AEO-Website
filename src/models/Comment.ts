import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IComment extends Document {
  updateId: Types.ObjectId
  userId: Types.ObjectId
  userName: string
  text: string
  attachments: string[]
  mentions: string[]
  createdAt: Date
}

const CommentSchema = new Schema<IComment>(
  {
    updateId: { type: Schema.Types.ObjectId, ref: 'Update', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    text: { type: String, maxlength: 1000, trim: true },
    attachments: [{ type: String }],
    mentions: [{ type: String }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

CommentSchema.index({ updateId: 1, createdAt: 1 })

export const Comment = mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema)
