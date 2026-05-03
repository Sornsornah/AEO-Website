import mongoose, { Schema, Document, Types } from 'mongoose'

export type BlogCategory = string
export type BlogStatus = 'draft' | 'scheduled' | 'published'

export interface IBlogPost extends Document {
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage?: string
  category: BlogCategory
  tags: string[]
  authorName: string
  publishedAt: Date
  readTime: number
  status: BlogStatus
  isFeatured: boolean
  featuredUntil?: Date
  likes: Types.ObjectId[]
  savedBy: Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const BlogPostSchema = new Schema<IBlogPost>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    excerpt: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    coverImage: { type: String },
    category: { type: String, required: true },
    tags: [{ type: String, trim: true }],
    authorName: { type: String, required: true, trim: true },
    publishedAt: { type: Date, required: true },
    readTime: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published'],
      default: 'draft',
    },
    isFeatured: { type: Boolean, default: false },
    featuredUntil: { type: Date },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    savedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

BlogPostSchema.index({ slug: 1 })
BlogPostSchema.index({ status: 1, publishedAt: -1 })
BlogPostSchema.index({ isFeatured: 1 })

export const BlogPost =
  mongoose.models.BlogPost || mongoose.model<IBlogPost>('BlogPost', BlogPostSchema)
