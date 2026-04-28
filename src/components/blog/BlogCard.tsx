'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowUpRight, Clock, Bookmark, Heart, MessageCircle } from 'lucide-react'
import {
  CATEGORY_LABELS,
  CATEGORY_GRADIENTS,
  CATEGORY_BADGE_COLORS,
  type BlogPostSummary,
} from './blogUtils'

interface BlogCardProps {
  post: BlogPostSummary
  onSave?: (e: React.MouseEvent) => void
}

export function BlogCard({ post, onSave }: BlogCardProps) {
  const gradient = CATEGORY_GRADIENTS[post.category]
  const badgeColor = CATEGORY_BADGE_COLORS[post.category]
  const label = CATEGORY_LABELS[post.category]

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <div className="bg-card rounded-2xl overflow-hidden border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
        {/* Cover */}
        <div className="relative aspect-[16/9] overflow-hidden">
          {post.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
          )}
          <span className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${badgeColor} backdrop-blur-sm`}>
            {label}
          </span>
          {onSave && (
            <button
              onClick={onSave}
              className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-sm transition-colors ${
                post.saved
                  ? 'bg-slate-900/80 text-white'
                  : 'bg-black/30 text-white/70 hover:bg-black/50 hover:text-white'
              }`}
              title={post.saved ? 'Unsave' : 'Save article'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${post.saved ? 'fill-white' : ''}`} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
            {format(new Date(post.publishedAt), 'MMM dd, yyyy')}
            <span>·</span>
            <Clock className="w-3 h-3" />
            {post.readTime} min read
          </p>
          <h3 className="font-bold text-slate-900 text-sm leading-snug mb-1.5 group-hover:text-orange-600 transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-3">
            {post.excerpt}
          </p>
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {post.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 text-slate-400 bg-background">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Heart className={`w-3.5 h-3.5 ${post.likeCount > 0 ? 'fill-rose-400 text-rose-400' : ''}`} />
                {post.likeCount}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <MessageCircle className="w-3.5 h-3.5" />
                {post.commentCount}
              </span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  )
}
