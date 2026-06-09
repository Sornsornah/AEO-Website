import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { HomeStoryCard, type HomeStoryPost } from './home-story-card'
import type { CategoriesMap } from '@/features/blog/components/blog-utils'

interface StoriesSectionProps {
  posts: HomeStoryPost[]
  categoriesMap: CategoriesMap
}

export function StoriesSection({ posts, categoriesMap }: StoriesSectionProps) {
  if (posts.length === 0) return null

  return (
    <section className="max-w-6xl 2xl:max-w-[78vw] mx-auto px-6 py-16">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-4xl font-bold tracking-tight text-[#1C1512] md:text-5xl">
          What&rsquo;s h<span className="text-orange-600">AI</span>ppening
        </h2>
        <p className="text-sm text-stone-500 mt-3">
          Explore the latest updates, product news, success stories and practical insights about AI,
          shared by CPF officers across the board.
        </p>
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors mt-4"
        >
          Read our blog
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
        {posts.map((post) => (
          <HomeStoryCard key={post._id} post={post} categoriesMap={categoriesMap} />
        ))}
      </div>
    </section>
  )
}
