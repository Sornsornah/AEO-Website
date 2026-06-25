'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { Pencil, Heart, PenSquare } from 'lucide-react'
import { getCategoryDisplay, hexToBadgeStyle, type CategoriesMap, type BlogPostSummary } from './blog-utils'

interface MyPostsTableProps {
  posts: BlogPostSummary[]
  categoriesMap?: CategoriesMap
}

export function MyPostsTable({ posts, categoriesMap = {} }: MyPostsTableProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl mt-6">
        <PenSquare className="w-7 h-7 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-400 text-sm font-medium mb-1">No posts yet</p>
        <Link href="/editor/blog/new?from=blog" className="text-xs text-blue-500 hover:underline">
          Write your first post
        </Link>
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
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Date</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Likes</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {posts.map((post) => {
            const { name: catName, color } = getCategoryDisplay(post.category, categoriesMap)
            return (
              <tr key={post._id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/editor/blog/${post._id}?from=blog`}
                    className="font-medium text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
                  >
                    {post.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={hexToBadgeStyle(color)}
                  >
                    {catName}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                  {format(new Date(post.publishedAt), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3">
                  {post.status === 'published' && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Published</span>
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
                  <div className="flex items-center justify-end">
                    <Link
                      href={`/editor/blog/${post._id}?from=blog`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
