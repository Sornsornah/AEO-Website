'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Pencil, Trash2, Star, Heart } from 'lucide-react'
import { CATEGORY_LABELS, CATEGORY_BADGE_COLORS } from '@/components/blog/blogUtils'
import type { BlogCategory } from '@/models/BlogPost'

interface BlogRow {
  _id: string
  slug: string
  title: string
  category: BlogCategory
  authorName: string
  publishedAt: string
  status: 'draft' | 'scheduled' | 'published'
  isFeatured: boolean
  likeCount: number
}

export function BlogTable({ posts }: { posts: BlogRow[] }) {
  const router = useRouter()
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null)
  const [featuringSlug, setFeaturingSlug] = useState<string | null>(null)

  async function handleDelete(slug: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeletingSlug(slug)
    try {
      const res = await fetch(`/api/blog/${slug}`, { method: 'DELETE' })
      if (res.ok) router.refresh()
      else alert('Failed to delete.')
    } finally {
      setDeletingSlug(null)
    }
  }

  async function handleFeature(slug: string) {
    setFeaturingSlug(slug)
    try {
      const res = await fetch(`/api/blog/${slug}/feature`, { method: 'POST' })
      if (res.ok) router.refresh()
    } finally {
      setFeaturingSlug(null)
    }
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl mt-6">
        <p className="text-slate-400 text-sm font-medium mb-1">No blog posts yet</p>
        <p className="text-slate-300 text-xs">Create your first article to get started</p>
      </div>
    )
  }

  return (
    <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Author</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Date</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Likes</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Featured</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {posts.map((post) => (
            <tr key={post._id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3">
                <Link
                  href={`/editor/blog/${post._id}`}
                  className="font-medium text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
                >
                  {post.title}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${CATEGORY_BADGE_COLORS[post.category]}`}>
                  {CATEGORY_LABELS[post.category]}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{post.authorName}</td>
              <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                {format(new Date(post.publishedAt), 'MMM d, yyyy')}
              </td>
              <td className="px-4 py-3">
                {post.status === 'published' && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Published</span>
                )}
                {post.status === 'scheduled' && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Scheduled</span>
                )}
                {post.status === 'draft' && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Draft</span>
                )}
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Heart className={`w-3.5 h-3.5 ${post.likeCount > 0 ? 'text-rose-400 fill-rose-400' : 'text-slate-300'}`} />
                  {post.likeCount}
                </span>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => handleFeature(post.slug)}
                  disabled={featuringSlug === post.slug}
                  title={post.isFeatured ? 'Unfeature' : 'Set as featured'}
                  className={`p-1.5 rounded-lg transition-colors ${
                    post.isFeatured
                      ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                      : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50'
                  }`}
                >
                  <Star className={`w-4 h-4 ${post.isFeatured ? 'fill-amber-400' : ''}`} />
                </button>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 justify-end">
                  <Link
                    href={`/editor/blog/${post._id}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(post.slug, post.title)}
                    disabled={deletingSlug === post.slug}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
