'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Pencil, Trash2, Star, Heart } from 'lucide-react'
import { getCategoryDisplay, hexToBadgeStyle, type CategoriesMap } from '@/features/blog/components/blog-utils'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { BlogCategory } from '@/models/BlogPost'

interface BlogRow {
  _id: string
  slug: string
  title: string
  category: BlogCategory
  authorName: string
  publishedAt: string
  status: 'draft' | 'published'
  isFeatured: boolean
  featuredUntil: string | null
  likeCount: number
}

export function BlogTable({ posts, categories }: { posts: BlogRow[]; categories: { slug: string; name: string; color: string }[] }) {
  const categoriesMap: CategoriesMap = Object.fromEntries(
    categories.map((c) => [c.slug, { name: c.name, color: c.color }])
  )
  const router = useRouter()
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null)
  const [featuringSlug, setFeaturingSlug] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ slug: string; title: string } | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')

  const visiblePosts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return posts
      .filter((p) => (q ? p.title.toLowerCase().includes(q) : true))
      .filter((p) => (statusFilter === 'all' ? true : p.status === statusFilter))
      .filter((p) => (categoryFilter === 'all' ? true : p.category === categoryFilter))
      .sort((a, b) => {
        const diff = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
        return sort === 'newest' ? -diff : diff
      })
  }, [posts, search, statusFilter, categoryFilter, sort])

  async function confirmDelete(slug: string) {
    setDeleteConfirm(null)
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

  return (
    <div>
      {/* Status pills + New Post */}
      <div className="mt-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {([
            { value: 'all', label: 'All' },
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Draft' },
          ] as const).map((t) => (
            <button
              key={t.value}
              onClick={() => setStatusFilter(t.value)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                statusFilter === t.value
                  ? 'bg-[#070E1D] text-white'
                  : 'text-[#64748B] hover:text-[#070E1D] hover:bg-[#F4F4F6]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Link
          href="/editor/blog/new"
          className="inline-flex items-center bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium h-9 px-4 rounded-lg transition-colors"
        >
          + New Post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl mt-6">
          <p className="text-slate-400 text-sm font-medium mb-1">No blog posts yet</p>
          <p className="text-slate-300 text-xs">Create your first article to get started</p>
        </div>
      ) : (
      <>
      {/* Search / category / sort */}
      <div className="mt-4 flex flex-wrap items-end gap-4 pb-6 border-b border-slate-100">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Search</Label>
          <Input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-52 h-9 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Category</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-slate-500 font-medium uppercase tracking-wide">Sort</Label>
          <Select value={sort} onValueChange={(v) => setSort(v as 'newest' | 'oldest')}>
            <SelectTrigger className="w-36 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {visiblePosts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl mt-4">
          <p className="text-slate-400 text-sm font-medium">No posts match your filters</p>
        </div>
      ) : (
      <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
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
          {visiblePosts.map((post) => (
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
                {(() => {
                  const { name, color } = getCategoryDisplay(post.category, categoriesMap)
                  return (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={hexToBadgeStyle(color)}>
                      {name}
                    </span>
                  )
                })()}
              </td>
              <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{post.authorName}</td>
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
                    onClick={() => setDeleteConfirm({ slug: post.slug, title: post.title })}
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
      )}
      </>
      )}
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete post?"
        message={deleteConfirm ? `"${deleteConfirm.title}" will be permanently deleted. This cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => deleteConfirm && confirmDelete(deleteConfirm.slug)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  )
}
