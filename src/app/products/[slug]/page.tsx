export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'
import { Navbar } from '@/components/layout/Navbar'
import { PageBanner } from '@/components/layout/PageBanner'
import { ProductDetailClient } from '@/components/products/ProductDetailClient'

interface Props {
  params: { slug: string }
}

export default async function ProductPage({ params }: Props) {
  await getServerSession(authOptions)
  await connectDB()

  const product = await Product.findOne({ slug: params.slug }).lean()
  if (!product) notFound()

  const p = product as typeof product & {
    _id: { toString(): string }
    status?: string
    shortDescription?: string
    uiScreenshot?: string
    productManagers?: { name: string; email: string }[]
    developers?: { name: string; email: string }[]
    overviewContent?: string
    vision?: string
    mission?: string
    goals?: string
    highlightStats?: { value: string; label: string }[]
    useCases?: { title: string; content: string; image?: string; functionTag?: string; department?: string; isDraft?: boolean }[]
    productUpdates?: { title: string; content: string; date?: Date }[]
  }

  const serializedProduct = {
    _id: p._id.toString(),
    name: p.name,
    slug: p.slug,
    description: p.description,
    shortDescription: p.shortDescription,
    color: p.color,
    logoUrl: p.logoUrl,
    uiScreenshot: p.uiScreenshot,
    status: (p.status as 'live' | 'beta' | 'coming_soon') || 'live',
    websiteUrl: p.websiteUrl,
    deckUrl: p.deckUrl,
    productManagers: p.productManagers || [],
    developers: p.developers || [],
    overviewContent: p.overviewContent,
    vision: p.vision,
    mission: p.mission,
    goals: p.goals,
    highlightStats: p.highlightStats || [],
    useCases: (p.useCases || []).filter((uc: { isDraft?: boolean }) => !uc.isDraft).map((uc: { title: string; content: string; image?: string; functionTag?: string; department?: string }) => ({
      title: uc.title,
      content: uc.content,
      image: uc.image,
      functionTag: uc.functionTag,
      department: uc.department,
    })),
    productUpdates: (p.productUpdates || []).map((u: { title: string; content: string; date?: Date }) => ({
      title: u.title,
      content: u.content,
      date: u.date ? new Date(u.date).toISOString() : new Date().toISOString(),
    })),
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {p.followParentBanner
        ? <PageBanner pageKey="products" />
        : <PageBanner banner={{ bannerEnabled: !!p.bannerEnabled, bannerText: p.bannerText || '', bannerStyle: (p.bannerStyle as 'info' | 'warning' | 'success' | 'neutral') || 'warning' }} />
      }
      <main className="px-6 py-10 max-w-4xl mx-auto">
        <ProductDetailClient product={{ ...serializedProduct, productUpdates: serializedProduct.productUpdates ?? [] }} />
      </main>
    </div>
  )
}
