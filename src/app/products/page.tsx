export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'
import { Navbar } from '@/components/layout/Navbar'
import { ProductsCatalogueClient } from '@/components/products/ProductsCatalogueClient'

export default async function ProductsPage() {
  await getServerSession(authOptions)
  await connectDB()

  const products = await Product.find({ isHidden: { $ne: true } }).sort({ order: 1, name: 1 }).lean()

  const serialized = (products as Array<{
    _id: { toString(): string }
    name: string
    slug: string
    description?: string
    shortDescription?: string
    color: string
    logoUrl?: string
    uiScreenshot?: string
    features?: { title: string; description: string }[]
  }>).map((p) => ({
    _id: p._id.toString(),
    name: p.name,
    slug: p.slug,
    description: p.description,
    shortDescription: p.shortDescription,
    color: p.color,
    logoUrl: p.logoUrl,
    uiScreenshot: p.uiScreenshot,
    features: p.features || [],
  }))

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <ProductsCatalogueClient products={serialized} />
    </div>
  )
}
