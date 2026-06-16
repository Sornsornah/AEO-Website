'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { Clock } from 'lucide-react'
import {
  getCategoryDisplay,
  hexToBadgeStyle,
  hexToGradient,
  type BlogPostSummary,
  type CategoriesMap,
} from './blog-utils'

export function FeaturedBlogCard({ post, categoriesMap = {} }: { post: BlogPostSummary; categoriesMap?: CategoriesMap }) {
  const { name: label, color } = getCategoryDisplay(post.category, categoriesMap)
  const badgeStyle = hexToBadgeStyle(color)
  const gradient = hexToGradient(color)

  return (
    <Link href={`/blog/${post.slug}`} className="group block h-full">
      <div className="h-full bg-white rounded-2xl overflow-hidden border border-[#E2E8F0] hover:border-[#CBD5E1] hover:shadow-md transition-all flex flex-col md:flex-row">
        {/* Cover */}
        <div className="relative md:w-2/5 aspect-[4/3] md:aspect-auto flex-shrink-0 overflow-hidden">
          {post.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: gradient }} />
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col justify-center p-8 md:p-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#070E1D] text-white">
              Featured
            </span>
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={badgeStyle}
            >
              {label}
            </span>
          </div>

          <p className="text-xs text-[#64748B] mb-3 flex items-center gap-1.5">
            {format(new Date(post.publishedAt), 'MMM dd, yyyy')}
            <span>·</span>
            <Clock className="w-3 h-3" />
            {post.readTime} min read
          </p>

          <h2 className="text-2xl font-bold text-[#070E1D] leading-tight mb-3 group-hover:text-[#EA580C] transition-colors">
            {post.title}
          </h2>

          <p className="text-sm text-[#64748B] leading-relaxed mb-6">
            {post.excerpt}
          </p>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full border border-[#E2E8F0] text-[#64748B] bg-[#F4F4F6]">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <span className="text-sm font-semibold text-[#EA580C] group-hover:text-[#C2410C] transition-colors flex items-center gap-1">
            Read article <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </Link>
  )
}
