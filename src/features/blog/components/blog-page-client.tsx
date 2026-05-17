'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react'
import { BlogCard } from './blog-card'
import { FeaturedBlogCard } from './featured-blog-card'
import { ExternalArticlesSidebar, type ExternalArticleEntry } from './external-articles-sidebar'
import { type BlogPostSummary, type CategoriesMap } from './blog-utils'

interface BlogPageClientProps {
  posts: BlogPostSummary[]
  featured: BlogPostSummary[]
  isLoggedIn: boolean
  externalArticles: ExternalArticleEntry[]
  categoriesMap?: CategoriesMap
}

export function BlogPageClient({ posts: initialPosts, featured: initialFeatured, isLoggedIn, externalArticles, categoriesMap = {} }: BlogPageClientProps) {
  const [posts, setPosts] = useState(initialPosts)
  const [activeTab, setActiveTab] = useState<'browse' | 'saved'>('browse')
  const [search, setSearch] = useState('')
  const [featuredIdx, setFeaturedIdx] = useState(0)
  const isPaused = useRef(false)

  // Keep live-updated versions of featured posts (for like/save counts)
  const featuredPosts = useMemo(
    () => posts.filter((p) => initialFeatured.some((f) => f._id === p._id)),
    [posts, initialFeatured]
  )

  const activeIdx = featuredPosts.length > 0 ? featuredIdx % featuredPosts.length : 0

  useEffect(() => {
    if (featuredPosts.length <= 1) return
    const interval = setInterval(() => {
      if (!isPaused.current) {
        setFeaturedIdx((i) => (i + 1) % featuredPosts.length)
      }
    }, 15000)
    return () => clearInterval(interval)
  }, [featuredPosts.length])

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

  const showFeatured = featuredPosts.length > 0 && !search.trim() && activeTab === 'browse'
  const featuredIds = new Set(initialFeatured.map((f) => f._id))
  const grid = showFeatured ? browsePosts.filter((p) => !featuredIds.has(p._id)) : browsePosts

  return (
    <div>


      {/* Hero header */}
      <div className="pt-12 pb-8 text-center px-6">
        <h1 className="text-4xl font-bold text-[#1C1512] mb-3">Stories</h1>
        <p className="text-stone-500 text-sm">
          Explore the latest updates, product news, success stories and practical insights from AEO.
        </p>
      </div>

      {/* Tab + filter bar */}
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur border-b border-[#E8E0D6]">
        <div className="px-6 py-2.5 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors ${
              activeTab === 'browse'
                ? 'bg-[#070E1D] text-white'
                : 'text-[#64748B] hover:text-[#070E1D] hover:bg-[#F4F4F6]'
            }`}
          >
            All
          </button>
          {isLoggedIn && (
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                activeTab === 'saved'
                  ? 'bg-[#070E1D] text-white'
                  : 'text-[#64748B] hover:text-[#070E1D] hover:bg-[#F4F4F6]'
              }`}
            >
              <Bookmark className={`w-3 h-3 ${activeTab === 'saved' ? 'fill-white' : ''}`} />
              Saved
            </button>
          )}
          {activeTab === 'browse' && (
            <>
              <div className="w-px h-4 bg-[#E2E8F0] mx-1 flex-shrink-0" />
              <div className="relative flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search articles..."
                  className="pl-8 pr-4 py-1.5 text-xs rounded-full border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 w-44"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-10">
        <div className="lg:grid lg:grid-cols-[1fr_288px] lg:gap-10 lg:items-start">
          {/* Main column */}
          <div>
            {activeTab === 'saved' ? (
              savedPosts.length === 0 ? (
                <div className="text-center py-20">
                  <Bookmark className="w-8 h-8 text-stone-200 mx-auto mb-3" />
                  <p className="text-stone-400 text-sm font-medium">No saved articles yet</p>
                  <p className="text-stone-300 text-xs mt-1">Bookmark articles to read them later</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {savedPosts.map((post) => (
                    <BlogCard key={post._id} post={post} onSave={(e) => handleSave(e, post.slug)} categoriesMap={categoriesMap} />
                  ))}
                </div>
              )
            ) : (
              <>
                {/* Featured carousel */}
                {showFeatured && (
                  <div
                    className="mb-10"
                    onMouseEnter={() => { isPaused.current = true }}
                    onMouseLeave={() => { isPaused.current = false }}
                  >
                    <div className="relative">
                      <div
                        key={activeIdx}
                        style={{ animation: 'blog-fade-in 0.5s ease-out' }}
                      >
                        <FeaturedBlogCard post={featuredPosts[activeIdx]} categoriesMap={categoriesMap} />
                      </div>

                      {featuredPosts.length > 1 && (
                        <>
                          <button
                            onClick={() => setFeaturedIdx((i) => (i - 1 + featuredPosts.length) % featuredPosts.length)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-[#FDFCFB]/90 border border-[#E8E0D6] shadow-sm flex items-center justify-center text-stone-600 hover:bg-[#FDFCFB] hover:shadow-md transition-all"
                            aria-label="Previous featured post"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setFeaturedIdx((i) => (i + 1) % featuredPosts.length)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-[#FDFCFB]/90 border border-[#E8E0D6] shadow-sm flex items-center justify-center text-stone-600 hover:bg-[#FDFCFB] hover:shadow-md transition-all"
                            aria-label="Next featured post"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>

                    {featuredPosts.length > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-4">
                        {featuredPosts.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setFeaturedIdx(i)}
                            className={`rounded-full transition-all duration-300 ${
                              i === activeIdx
                                ? 'w-5 h-2 bg-[#1C1512]'
                                : 'w-2 h-2 bg-stone-300 hover:bg-stone-400'
                            }`}
                            aria-label={`Go to featured post ${i + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Grid */}
                {grid.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-stone-400 text-sm font-medium">No articles found</p>
                    <p className="text-stone-300 text-xs mt-1">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {grid.map((post) => (
                      <BlogCard
                        key={post._id}
                        post={post}
                        onSave={isLoggedIn ? (e) => handleSave(e, post.slug) : undefined}
                        categoriesMap={categoriesMap}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          {externalArticles.length > 0 && (
            <aside className="hidden lg:block sticky top-24">
              <ExternalArticlesSidebar articles={externalArticles} />
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
