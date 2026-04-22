import mongoose, { Schema, Document, Types } from 'mongoose'

export interface ITeamMember {
  name: string
  email: string
}

export interface IHighlightStat {
  value: string
  label: string
}

export interface IFeature {
  title: string
  description: string
}

export interface IUserQuote {
  text: string
  author: string
}

export interface IRoadmapItem {
  quarter: string
  description: string
}

export interface IUseCase {
  title: string
  content: string
  image?: string
  functionTag?: string
  department?: string
  isDraft?: boolean
}

export interface IProductUpdate {
  title: string
  content: string
  date?: Date
}

export interface IProduct extends Document {
  name: string
  slug: string
  description?: string
  color: string
  domainId?: Types.ObjectId
  websiteUrl?: string
  deckUrl?: string
  logoUrl?: string
  members: Types.ObjectId[]
  // New fields
  status: 'live' | 'beta' | 'coming_soon'
  shortDescription?: string
  uiScreenshot?: string
  productManagers: ITeamMember[]
  developers: ITeamMember[]
  overviewContent?: string
  whyWeBuiltThis?: string
  whatWeBuilt?: string
  vision?: string
  mission?: string
  goals?: string
  highlightStats: IHighlightStat[]
  features: IFeature[]
  userQuotes: IUserQuote[]
  roadmap: IRoadmapItem[]
  useCases: IUseCase[]
  productUpdates: IProductUpdate[]
  createdAt: Date
  updatedAt: Date
}

const TeamMemberSchema = new Schema<ITeamMember>(
  { name: { type: String, trim: true }, email: { type: String, trim: true } },
  { _id: false }
)

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    color: { type: String, default: '#6366f1' },
    domainId: { type: Schema.Types.ObjectId, ref: 'Domain', required: false },
    websiteUrl: { type: String, trim: true },
    deckUrl: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    // New fields
    status: { type: String, enum: ['live', 'beta', 'coming_soon'], default: 'live' },
    shortDescription: { type: String, trim: true },
    uiScreenshot: { type: String, trim: true },
    productManagers: [TeamMemberSchema],
    developers: [TeamMemberSchema],
    overviewContent: { type: String },
    whyWeBuiltThis: { type: String },
    whatWeBuilt: { type: String },
    vision: { type: String },
    mission: { type: String },
    goals: { type: String },
    highlightStats: [{ value: { type: String }, label: { type: String }, _id: false }],
    features: [{ title: { type: String }, description: { type: String }, _id: false }],
    userQuotes: [{ text: { type: String }, author: { type: String }, _id: false }],
    roadmap: [{ quarter: { type: String }, description: { type: String }, _id: false }],
    useCases: [{ title: { type: String }, content: { type: String }, image: { type: String }, functionTag: { type: String }, department: { type: String }, isDraft: { type: Boolean, default: false }, _id: false }],
    productUpdates: [{ title: { type: String }, content: { type: String }, date: { type: Date }, _id: false }],
  },
  { timestamps: true }
)

export const Product = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)
