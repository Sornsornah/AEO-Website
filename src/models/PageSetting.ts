import mongoose, { Schema, Document } from 'mongoose'

export interface IPageSetting extends Document {
  pageKey: string
  label: string
  href: string
  navEnabled: boolean
  order: number
  bannerEnabled: boolean
  bannerText: string
  bannerStyle: 'info' | 'warning' | 'success' | 'neutral'
  adminOnly: boolean
}

const PageSettingSchema = new Schema<IPageSetting>({
  pageKey: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  href: { type: String, required: true },
  navEnabled: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  bannerEnabled: { type: Boolean, default: false },
  bannerText: { type: String, default: '' },
  bannerStyle: { type: String, enum: ['info', 'warning', 'success', 'neutral'], default: 'warning' },
  adminOnly: { type: Boolean, default: false },
})

export const PageSetting =
  mongoose.models.PageSetting || mongoose.model<IPageSetting>('PageSetting', PageSettingSchema)
