import mongoose, { Schema, Document, Types } from 'mongoose'
import { MAX_COMMENT_LENGTH } from '@/lib/comment-length'

export interface IComment extends Document {
  updateId: Types.ObjectId
  userId: Types.ObjectId
  userName: string
  text: string
  attachments: string[]
  // User ObjectId strings of @mentioned users (resolved from the comment HTML).
  mentions: string[]
  // Set when this comment is a reply to another comment on the same update.
  parentId?: Types.ObjectId
  createdAt: Date
}

const CommentSchema = new Schema<IComment>(
  {
    updateId: { type: Schema.Types.ObjectId, ref: 'Update', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    // Visible-prose length is enforced in the route; this cap only guards the
    // raw HTML (incl. pasted base64 media) against MongoDB's 16MB doc limit.
    text: { type: String, maxlength: MAX_COMMENT_LENGTH, trim: true },
    attachments: [{ type: String }],
    mentions: [{ type: String }],
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment', index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

CommentSchema.index({ updateId: 1, createdAt: 1 })

export const Comment = mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema)
