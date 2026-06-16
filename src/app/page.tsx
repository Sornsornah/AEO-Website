export const dynamic = 'force-dynamic'

import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'
import { HomeConfig } from '@/models/HomeConfig'
import { BlogPost } from '@/models/BlogPost'
import { BlogCategory } from '@/models/BlogCategory'
import { Navbar } from '@/components/layout/navbar'
import { AboutSection } from '@/features/home/components/about-section'
import { ProductsCarousel, type HomeProduct } from '@/features/home/components/products-carousel'
import { StoriesSection } from '@/features/home/components/stories-section'
import type { HomeStoryPost } from '@/features/home/components/home-story-card'
import type { CategoriesMap } from '@/features/blog/components/blog-utils'

export default async function Home() {
  await connectDB()

  const HOME_MAX_PRODUCTS = 8

  const [homeConfig, rawPosts, rawCategories] = await Promise.all([
    HomeConfig.findOne({ key: 'home' }).lean(),
    BlogPost.find({ status: 'published' })
      .sort({ publishedAt: -1 })
      .limit(3)
      .lean(),
    BlogCategory.find().lean(),
  ])

  // Curated homepage products, kept in their exact constellation slots: the
  // stored array is positional (index = slot), `null` = an empty slot. Falls
  // back to catalogue order (filling slots 0..n) when nothing is configured.
  const slotIds = (
    ((homeConfig as { featuredProductIds?: ({ toString(): string } | null)[] } | null)
      ?.featuredProductIds) ?? []
  )
    .slice(0, HOME_MAX_PRODUCTS)
    .map((id) => (id == null ? null : id.toString()))

  type RawProduct = {
    _id: { toString(): string }
    name: string
    slug: string
    description?: string
    shortDescription?: string
    color: string
    logoUrl?: string
    uiScreenshot?: string
  }

  let rawSlots: (RawProduct | null)[]
  if (slotIds.some((id) => id !== null)) {
    const ids = slotIds.filter((id): id is string => id !== null)
    const found = await Product.find({ _id: { $in: ids }, isHidden: { $ne: true } }).lean()
    const byId = new Map((found as RawProduct[]).map((p) => [p._id.toString(), p]))
    // Hidden / deleted products collapse to an empty slot rather than shifting others.
    rawSlots = slotIds.map((id) => (id ? byId.get(id) ?? null : null))
  } else {
    rawSlots = (await Product.find({ isHidden: { $ne: true } })
      .sort({ order: 1, name: 1 })
      .limit(HOME_MAX_PRODUCTS)
      .lean()) as RawProduct[]
  }

  const toHomeProduct = (p: RawProduct): HomeProduct => ({
    _id: p._id.toString(),
    name: p.name,
    slug: p.slug,
    description: p.description,
    shortDescription: p.shortDescription,
    color: p.color,
    logoUrl: p.logoUrl,
    uiScreenshot: p.uiScreenshot,
  })

  // Positional list: index = constellation slot, `null` = empty slot.
  const products: (HomeProduct | null)[] = rawSlots.map((p) => (p ? toHomeProduct(p) : null))

  const posts: HomeStoryPost[] = (
    rawPosts as Array<{
      _id: { toString(): string }
      title: string
      slug: string
      excerpt: string
      coverImage?: string | null
      category: string
      authorName: string
      publishedAt: Date
      readTime: number
    }>
  ).map((p) => ({
    _id: p._id.toString(),
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    coverImage: p.coverImage || null,
    category: p.category,
    authorName: p.authorName,
    publishedAt: p.publishedAt.toISOString(),
    readTime: p.readTime,
  }))

  const categoriesMap: CategoriesMap = Object.fromEntries(
    (rawCategories as Array<{ slug: string; name: string; color: string }>).map((c) => [
      c.slug,
      { name: c.name, color: c.color },
    ])
  )

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <AboutSection />
      <ProductsCarousel products={products} />
      <StoriesSection posts={posts} categoriesMap={categoriesMap} />
    </div>
  )
}
