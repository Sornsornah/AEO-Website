import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IBlogComment extends Document {
  postId: Types.ObjectId
  authorId: Types.ObjectId
  authorName: string
  content: string
  editedAt?: Date
  createdAt: Date
}

const BlogCommentSchema = new Schema<IBlogComment>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'BlogPost', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    editedAt: { type: Date },
  },
  { timestamps: true }
)

export const BlogComment =
  mongoose.models.BlogComment || mongoose.model<IBlogComment>('BlogComment', BlogCommentSchema)
