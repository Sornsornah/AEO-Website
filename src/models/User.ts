import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  email: string
  name?: string
  role: 'public' | 'viewer' | 'admin'
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true },
    role: { type: String, enum: ['public', 'viewer', 'admin'], default: 'public' },
  },
  { timestamps: true }
)

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
