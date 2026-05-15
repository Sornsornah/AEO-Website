export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'
import { Navbar } from '@/components/layout/Navbar'
import { ProductDetailForm } from '@/components/editor/ProductDetailForm'

interface Props {
  params: { id: string }
}

export default async function EditProductPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') redirect('/updates')

  await connectDB()

  const product = await Product.findById(params.id).lean()
  if (!product) notFound()

  const p = product as typeof product & {
    _id: { toString(): string }
    status?: string
    shortDescription?: string
    uiScreenshot?: string
    productManagers?: { name: string; email: string }[]
    developers?: { name: string; email: string }[]
    overviewContent?: string
    whyWeBuiltThis?: string
    whatWeBuilt?: string
    highlightStats?: { value: string; label: string }[]
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
    productManagers: p.productManagers || [],
    developers: p.developers || [],
    overviewContent: p.overviewContent || '',
    highlightStats: p.highlightStats || [],
    useCases: (p.useCases || []).map((uc: { title: string; content: string; image?: string; functionTag?: string; isDraft?: boolean }) => ({
      title: uc.title,
      content: uc.content,
      image: uc.image || '',
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
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Edit product page</h1>
        <ProductDetailForm productId={p._id.toString()} productSlug={p.slug} defaultValues={defaultValues} />
      </main>
    </div>
  )
}
