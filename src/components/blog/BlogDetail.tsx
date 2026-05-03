'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Heart, Bookmark, Share2, Clock, ArrowLeft } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import {
  getCategoryDisplay,
  hexToBadgeStyle,
  hexToGradient,
  getInitials,
  type BlogPostSummary,
  type CategoriesMap,
} from './blogUtils'
import { BlogCard } from './BlogCard'
import { BlogComments, type BlogCommentData } from './BlogComments'

interface BlogDetailProps {
  post: BlogPostSummary & { content: string }
  related: BlogPostSummary[]
  isLoggedIn: boolean
  initialComments: BlogCommentData[]
  currentUserId?: string
  isAdmin?: boolean
  categoriesMap?: CategoriesMap
}

export function BlogDetail({ post, related, isLoggedIn, initialComments, currentUserId, isAdmin, categoriesMap = {} }: BlogDetailProps) {
  const [liked, setLiked] = useState(post.liked)
  const [likeCount, setLikeCount] = useState(post.likeCount)
  const [saved, setSaved] = useState(post.saved)
  const [sharing, setSharing] = useState(false)

  const { name: label, color } = getCategoryDisplay(post.category, categoriesMap)
  const badgeStyle = hexToBadgeStyle(color)
  const gradient = hexToGradient(color)

  const handleLike = useCallback(async () => {
    if (!isLoggedIn) return
    setLiked((v) => !v)
    setLikeCount((c) => (liked ? c - 1 : c + 1))
    try {
      const res = await fetch(`/api/blog/${post.slug}/like`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setLiked(data.liked)
        setLikeCount(data.likeCount)
      }
    } catch {
      setLiked((v) => !v)
      setLikeCount((c) => (liked ? c + 1 : c - 1))
    }
  }, [isLoggedIn, liked, post.slug])

  const handleSave = useCallback(async () => {
    if (!isLoggedIn) return
    setSaved((v) => !v)
    try {
      const res = await fetch(`/api/blog/${post.slug}/save`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setSaved(data.saved)
      }
    } catch {
      setSaved((v) => !v)
    }
  }, [isLoggedIn, post.slug])

  const handleShare = useCallback(async () => {
    const url = window.location.href
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url)
    }
    setSharing(true)
    setTimeout(() => setSharing(false), 2000)
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Back */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to the journal
      </Link>

      {/* Meta */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
          style={badgeStyle}
        >
          {label}
        </span>
        <span className="text-xs text-stone-400 flex items-center gap-1.5">
          {format(new Date(post.publishedAt), 'MMM dd, yyyy')}
          <span>·</span>
          <Clock className="w-3 h-3" />
          {post.readTime} min read
        </span>
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold text-[#1C1512] leading-tight mb-3">
        {post.title}
      </h1>

      {/* Excerpt */}
      <p className="text-lg text-stone-500 italic leading-relaxed mb-6">
        {post.excerpt}
      </p>

      {/* Cover image */}
      <div className="mb-8 rounded-2xl overflow-hidden aspect-[16/9]">
        {post.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: gradient }} />
        )}
      </div>

      {/* Author + actions */}
      <div className="flex items-center justify-between mb-8 pb-8 border-b border-[#E8E0D6]">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 text-sm font-bold flex items-center justify-center flex-shrink-0">
            {getInitials(post.authorName)}
          </span>
          <div>
            <p className="text-sm font-semibold text-[#1C1512]">{post.authorName}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleLike}
            title={isLoggedIn ? 'Like' : 'Sign in to like'}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              liked
                ? 'bg-red-50 text-red-500 hover:bg-red-100'
                : 'text-stone-400 hover:bg-stone-100 hover:text-stone-600'
            }`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-red-500' : ''}`} />
            <span className="text-xs font-medium">{likeCount > 0 ? likeCount : 'Like'}</span>
          </button>

          <button
            onClick={handleSave}
            title={isLoggedIn ? 'Save' : 'Sign in to save'}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              saved
                ? 'bg-blue-50 text-blue-500 hover:bg-blue-100'
                : 'text-stone-400 hover:bg-stone-100 hover:text-stone-600'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${saved ? 'fill-blue-500' : ''}`} />
            <span className="text-xs font-medium">Save</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-xs font-medium">{sharing ? 'Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {post.content.trim().startsWith('<') ? (
        <div
          className="prose prose-stone prose-base max-w-none mb-10 prose-headings:font-bold prose-a:text-orange-600 prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      ) : (
        <div className="prose prose-stone prose-base max-w-none mb-10 prose-headings:font-bold prose-a:text-orange-600 prose-a:no-underline hover:prose-a:underline">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex items-center gap-2 mb-10 pb-10 border-b border-[#E8E0D6]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Tags</span>
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full border border-[#E8E0D6] text-stone-500 bg-card">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Author */}
      <div className="bg-card rounded-2xl border border-[#E8E0D6] p-6 mb-12">
        <div className="flex items-center gap-4">
          <span className="w-12 h-12 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center flex-shrink-0">
            {getInitials(post.authorName)}
          </span>
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-widest mb-1">Written by</p>
            <p className="font-bold text-[#1C1512]">{post.authorName}</p>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="mb-12 pt-10 border-t border-[#E8E0D6]">
        <BlogComments
          slug={post.slug}
          initialComments={initialComments}
          isLoggedIn={isLoggedIn}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      </div>

      {/* Keep reading */}
      {related.length > 0 && (
        <div className="pt-10 border-t border-[#E8E0D6]">
          <h2 className="text-lg font-bold text-[#1C1512] mb-5">Keep reading</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {related.map((p) => (
              <BlogCard key={p._id} post={p} categoriesMap={categoriesMap} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
