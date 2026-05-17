import { connectDB } from '@/lib/mongodb'
import { PageSetting } from '@/models/PageSetting'

const STYLE_CLASSES: Record<string, string> = {
  info: 'bg-blue-50 border-b border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-b border-amber-200 text-amber-800',
  success: 'bg-emerald-50 border-b border-emerald-200 text-emerald-800',
  neutral: 'bg-stone-50 border-b border-stone-200 text-stone-700',
}

interface InlineBanner {
  bannerEnabled: boolean
  bannerText: string
  bannerStyle: 'info' | 'warning' | 'success' | 'neutral'
}

interface PageBannerProps {
  pageKey?: string
  banner?: InlineBanner
}

export async function PageBanner({ pageKey, banner }: PageBannerProps) {
  let enabled: boolean
  let text: string
  let style: string

  if (banner) {
    enabled = banner.bannerEnabled
    text = banner.bannerText
    style = banner.bannerStyle
  } else if (pageKey) {
    await connectDB()
    const setting = await PageSetting.findOne({ pageKey }).lean()
    if (!setting?.bannerEnabled || !setting.bannerText) return null
    enabled = setting.bannerEnabled
    text = setting.bannerText
    style = setting.bannerStyle
  } else {
    return null
  }

  if (!enabled || !text) return null
  const styleClass = STYLE_CLASSES[style] ?? STYLE_CLASSES.warning
  return (
    <div className={`w-full px-6 py-2.5 text-center text-xs ${styleClass}`}>
      {text}
    </div>
  )
}
