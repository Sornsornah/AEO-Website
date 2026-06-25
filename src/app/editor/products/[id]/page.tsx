export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'
import { Navbar } from '@/components/layout/navbar'
import { ProductDetailForm } from '@/features/editor/components/product-detail-form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params
  const session = await getSession(await headers())
  if (!session || session.user.role !== 'admin') redirect('/updates')

  await connectDB()

  const product = await Product.findById(id).lean()
  if (!product) notFound()

  const p = product as typeof product & {
    _id: { toString(): string }
    status?: string
    shortDescription?: string
    uiScreenshot?: string
    maintainedByAEO?: boolean
    maintainerNote?: string
    productManagers?: { name: string; email: string }[]
    developers?: { name: string; email: string }[]
    overviewContent?: string
    whyWeBuiltThis?: string
    whatWeBuilt?: string
    features?: { title: string; description: string }[]
    userQuotes?: { text: string; author: string }[]
    roadmap?: { quarter: string; description: string }[]
    useCases?: { title: string; content: string; image?: string; functionTag?: string; department?: string; isDraft?: boolean }[]
    productUpdates?: { title: string; content: string; date?: Date }[]
  }

  const defaultValues = {
    name: p.name,
    description: p.description || '',
    shortDescription: p.shortDescription || '',
    status: p.status || 'live',
    color: p.color,
    logoUrl: p.logoUrl || '',
    uiScreenshot: p.uiScreenshot || '',
    websiteUrl: p.websiteUrl || '',
    deckUrl: p.deckUrl || '',
    contactUsUrl: (p as typeof p & { contactUsUrl?: string }).contactUsUrl || '',
    maintainedByAEO: p.maintainedByAEO !== false,
    maintainerNote: p.maintainerNote || '',
    productManagers: p.productManagers || [],
    developers: p.developers || [],
    overviewContent: p.overviewContent || '',
    useCases: (p.useCases || []).map((uc: { title: string; content: string; functionTag?: string; isDraft?: boolean }) => ({
      title: uc.title,
      content: uc.content,
      functionTag: uc.functionTag || '',
      isDraft: uc.isDraft || false,
    })),
    productUpdates: (p.productUpdates || []).map((u: { title: string; content: string; date?: Date; isDraft?: boolean }) => ({
      title: u.title,
      content: u.content,
      date: u.date ? new Date(u.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      isDraft: u.isDraft || false,
    })),
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="px-6 py-10">
        <ProductDetailForm productId={p._id.toString()} productSlug={p.slug} defaultValues={defaultValues} />
      </main>
    </div>
  )
}
