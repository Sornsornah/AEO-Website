import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  email: string
  name: string
  hashedPassword?: string
  role: 'viewer' | 'admin'
  isWhitelisted: boolean
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    hashedPassword: { type: String },
    role: { type: String, enum: ['viewer', 'admin'], default: 'viewer' },
    isWhitelisted: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
