import mongoose, { Schema, Document } from 'mongoose'

export interface IOTP extends Document {
  email: string
  code: string
  expiresAt: Date
  used: boolean
  createdAt: Date
}

const OTPSchema = new Schema<IOTP>(
  {
    email: { type: String, required: true, lowercase: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
)

OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const OTP = mongoose.models.OTP || mongoose.model<IOTP>('OTP', OTPSchema)
