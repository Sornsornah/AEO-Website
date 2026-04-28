'use client'

import { useState, useMemo } from 'react'
import { Search, Bookmark } from 'lucide-react'
import { BlogCard } from './BlogCard'
import { FeaturedBlogCard } from './FeaturedBlogCard'
import { type BlogPostSummary } from './blogUtils'

interface BlogPageClientProps {
  posts: BlogPostSummary[]
  featured: BlogPostSummary | null
  isLoggedIn: boolean
}

export function BlogPageClient({ posts: initialPosts, featured: initialFeatured, isLoggedIn }: BlogPageClientProps) {
  const [posts, setPosts] = useState(initialPosts)
  const [activeTab, setActiveTab] = useState<'browse' | 'saved'>('browse')
  const [search, setSearch] = useState('')

  async function handleSave(e: React.MouseEvent, slug: string) {
    e.preventDefault()
    e.stopPropagation()
    const res = await fetch(`/api/blog/${slug}/save`, { method: 'POST' })
    if (!res.ok) return
    const { saved } = await res.json()
    setPosts((prev) => prev.map((p) => p.slug === slug ? { ...p, saved } : p))
  }

  const browsePosts = useMemo(() => {
    if (!search.trim()) return posts
    const q = search.toLowerCase()
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q)
    )
  }, [posts, search])

  const savedPosts = useMemo(() => posts.filter((p) => p.saved), [posts])

  const featured = posts.find((p) => p._id === initialFeatured?._id) ?? initialFeatured
  const showFeatured = featured && !search.trim() && activeTab === 'browse'
  const grid = showFeatured ? browsePosts.filter((p) => p._id !== featured!._id) : browsePosts

  return (
    <div>
      {/* Hero header */}
      <div className="pt-12 pb-8 text-center px-6">
        <h1 className="text-4xl font-bold text-slate-900 mb-3">Stories</h1>
        <p className="text-slate-500 text-sm">
          Explore the latest updates, product news, success stories and practical insights from AEO.
        </p>
      </div>

      {/* Tab + filter bar */}
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            {/* Tab switcher */}
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                activeTab === 'browse'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All
            </button>
            {isLoggedIn && (
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                  activeTab === 'saved'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Bookmark className={`w-3 h-3 ${activeTab === 'saved' ? 'fill-white' : ''}`} />
                Saved
              </button>
            )}

          </div>

          {activeTab === 'browse' && (
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search articles..."
                className="pl-8 pr-4 py-1.5 text-xs rounded-full border border-slate-200 bg-card focus:outline-none focus:ring-2 focus:ring-slate-300 w-48"
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        {activeTab === 'saved' ? (
          savedPosts.length === 0 ? (
            <div className="text-center py-20">
              <Bookmark className="w-8 h-8 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">No saved articles yet</p>
              <p className="text-slate-300 text-xs mt-1">Bookmark articles to read them later</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {savedPosts.map((post) => (
                <BlogCard
                  key={post._id}
                  post={post}
                  onSave={(e) => handleSave(e, post.slug)}
                />
              ))}
            </div>
          )
        ) : (
          <>
            {/* Featured */}
            {showFeatured && (
              <div className="mb-10">
                <FeaturedBlogCard post={featured!} />
              </div>
            )}

            {/* Grid */}
            {grid.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-slate-400 text-sm font-medium">No articles found</p>
                <p className="text-slate-300 text-xs mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {grid.map((post) => (
                  <BlogCard
                    key={post._id}
                    post={post}
                    onSave={isLoggedIn ? (e) => handleSave(e, post.slug) : undefined}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
