import type { BlogStatus } from '@/models/BlogPost'

export type BlogCategory = string

export interface CategoryMeta {
  name: string
  color: string
}

export type CategoriesMap = Record<string, CategoryMeta>

// Legacy fallback maps for old category slugs that may still exist in data
const LEGACY_LABELS: Record<string, string> = {
  'thought': 'Thought',
  'learning-journey': 'Learning Journey',
  'field-notes': 'Field Notes',
  'deep-dive': 'Deep Dive',
}

const LEGACY_COLORS: Record<string, string> = {
  'thought': '#f97316',
  'learning-journey': '#6366f1',
  'field-notes': '#10b981',
  'deep-dive': '#f59e0b',
}

export function getCategoryDisplay(slug: string, categoriesMap: CategoriesMap): { name: string; color: string } {
  if (categoriesMap[slug]) return categoriesMap[slug]
  return {
    name: LEGACY_LABELS[slug] ?? slug,
    color: LEGACY_COLORS[slug] ?? '#94a3b8',
  }
}

export function hexToBadgeStyle(hex: string): React.CSSProperties {
  return {
    backgroundColor: hex + '25',
    color: hex,
  }
}

export function hexToGradient(hex: string): string {
  return `linear-gradient(135deg, ${hex}cc, ${hex})`
}

// Keep legacy exports for any code not yet migrated to dynamic categories
export const CATEGORY_LABELS: Record<string, string> = LEGACY_LABELS

export const CATEGORY_GRADIENTS: Record<string, string> = {
  'thought': 'from-orange-400 to-red-500',
  'learning-journey': 'from-blue-400 to-indigo-600',
  'field-notes': 'from-emerald-500 to-teal-700',
  'deep-dive': 'from-amber-500 to-orange-700',
}

export const CATEGORY_BADGE_COLORS: Record<string, string> = {
  'thought': 'bg-orange-100 text-orange-700',
  'learning-journey': 'bg-blue-100 text-blue-700',
  'field-notes': 'bg-emerald-100 text-emerald-700',
  'deep-dive': 'bg-amber-100 text-amber-700',
}

export function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

export interface BlogPostSummary {
  _id: string
  title: string
  slug: string
  excerpt: string
  coverImage: string | null
  category: BlogCategory
  tags: string[]
  authorName: string
  publishedAt: string
  readTime: number
  status: BlogStatus
  isFeatured: boolean
  likeCount: number
  liked: boolean
  saved: boolean
  commentCount: number
}
