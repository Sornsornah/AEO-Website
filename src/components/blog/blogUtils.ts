import type { BlogCategory, BlogStatus } from '@/models/BlogPost'

export const CATEGORY_LABELS: Record<BlogCategory, string> = {
  'thought': 'Thought',
  'learning-journey': 'Learning Journey',
  'field-notes': 'Field Notes',
  'deep-dive': 'Deep Dive',
}

export const CATEGORY_GRADIENTS: Record<BlogCategory, string> = {
  'thought': 'from-orange-400 to-red-500',
  'learning-journey': 'from-blue-400 to-indigo-600',
  'field-notes': 'from-emerald-500 to-teal-700',
  'deep-dive': 'from-amber-500 to-orange-700',
}

export const CATEGORY_BADGE_COLORS: Record<BlogCategory, string> = {
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
