import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowUpRight, Clock } from 'lucide-react'
import {
  getCategoryDisplay,
  hexToBadgeStyle,
  hexToGradient,
  getInitials,
  type CategoriesMap,
} from '@/features/blog/components/blog-utils'

export interface HomeStoryPost {
  _id: string
  title: string
  slug: string
  excerpt: string
  coverImage: string | null
  category: string
  authorName: string
  publishedAt: string
  readTime: number
}

interface HomeStoryCardProps {
  post: HomeStoryPost
  categoriesMap?: CategoriesMap
}

export function HomeStoryCard({ post, categoriesMap = {} }: HomeStoryCardProps) {
  const { name: label, color } = getCategoryDisplay(post.category, categoriesMap)
  const badgeStyle = hexToBadgeStyle(color)
  const gradient = hexToGradient(color)

  return (
    <Link href={`/blog/${post.slug}`} className="group block h-full">
      <article className="h-full flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
        {/* Cover */}
        <div className="relative aspect-[16/9] overflow-hidden">
          {post.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: gradient }} />
          )}
          <span
            className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full backdrop-blur-sm"
            style={badgeStyle}
          >
            {label}
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 p-4">
          <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
            {format(new Date(post.publishedAt), 'MMM dd, yyyy')}
            <span>·</span>
            <Clock className="w-3 h-3" />
            {post.readTime} min read
          </p>
          <h3 className="font-bold text-slate-900 text-sm leading-snug mb-1.5 group-hover:text-orange-600 transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4">
            {post.excerpt}
          </p>

          <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-[10px] font-semibold flex items-center justify-center">
                {getInitials(post.authorName)}
              </span>
              <span className="text-xs font-medium text-slate-600 truncate">{post.authorName}</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-colors flex-shrink-0" />
          </div>
        </div>
      </article>
    </Link>
  )
}
