'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { Clock } from 'lucide-react'
import {
  CATEGORY_LABELS,
  CATEGORY_GRADIENTS,
  CATEGORY_BADGE_COLORS,
  type BlogPostSummary,
} from './blogUtils'

export function FeaturedBlogCard({ post }: { post: BlogPostSummary }) {
  const gradient = CATEGORY_GRADIENTS[post.category]
  const badgeColor = CATEGORY_BADGE_COLORS[post.category]
  const label = CATEGORY_LABELS[post.category]

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <div className="bg-card rounded-2xl overflow-hidden border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all flex flex-col md:flex-row">
        {/* Cover */}
        <div className="relative md:w-2/5 aspect-[4/3] md:aspect-auto flex-shrink-0 overflow-hidden">
          {post.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col justify-center p-8 md:p-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-900 text-white">
              Featured
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${badgeColor}`}>
              {label}
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
            {format(new Date(post.publishedAt), 'MMM dd, yyyy')}
            <span>·</span>
            <Clock className="w-3 h-3" />
            {post.readTime} min read
          </p>

          <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-3 group-hover:text-orange-600 transition-colors">
            {post.title}
          </h2>

          <p className="text-sm text-slate-500 italic leading-relaxed mb-6">
            {post.excerpt}
          </p>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full border border-slate-200 text-slate-500">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <span className="text-sm font-semibold text-orange-600 group-hover:text-orange-700 transition-colors flex items-center gap-1">
            Read article <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </Link>
  )
}
