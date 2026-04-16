import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Product } from '@/models/Product'
import { Update } from '@/models/Update'
import { Navbar } from '@/components/layout/Navbar'
import { formatDate } from '@/lib/utils'

interface Props {
  params: { slug: string }
}

export default async function ProductPage({ params }: Props) {
  await getServerSession(authOptions)
  await connectDB()

  const product = await Product.findOne({ slug: params.slug }).populate('domainId').populate('members', 'name email').lean()
  if (!product) notFound()

  const updates = await Update.find({ productId: product._id, isPublished: true })
    .sort({ date: -1 })
    .lean()

  const domainDoc = product.domainId as { name: string } | null

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Back */}
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-8 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          All Products
        </Link>

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ backgroundColor: product.logoUrl ? undefined : product.color }}
          >
            {product.logoUrl ? (
              <Image src={product.logoUrl} alt={product.name} width={48} height={48} className="object-contain w-full h-full" />
            ) : (
              <span className="text-white text-lg font-bold">
                {product.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {domainDoc && (
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                {domainDoc.name}
              </p>
            )}
            <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
            {product.description && (
              <p className="text-base text-slate-500 mt-2 leading-relaxed">{product.description}</p>
            )}
            {(product.websiteUrl || product.deckUrl) && (
              <div className="flex items-center gap-3 mt-3">
                {product.websiteUrl && (
                  <a
                    href={product.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 hover:border-slate-300 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    Website
                  </a>
                )}
                {product.deckUrl && (
                  <a
                    href={product.deckUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 hover:border-slate-300 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Product Deck
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 py-4 border-y border-slate-100 mb-8">
          <div>
            <p className="text-2xl font-bold text-slate-900">{updates.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">update{updates.length !== 1 ? 's' : ''}</p>
          </div>
          {updates.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-900">{formatDate(updates[0].date)}</p>
              <p className="text-xs text-slate-400 mt-0.5">last updated</p>
            </div>
          )}
          <div className="ml-auto">
            <Link
              href={`/updates?product=${product.slug}`}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View in feed →
            </Link>
          </div>
        </div>

        {/* Members */}
        {(() => {
          const members = (product.members as unknown as { _id: { toString(): string }; name: string; email: string }[]) || []
          if (members.length === 0) return null
          return (
            <div className="mb-8">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Team</h2>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <div
                    key={m._id.toString()}
                    className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2"
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold"
                      style={{ backgroundColor: product.color }}
                    >
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-800 leading-tight">{m.name}</p>
                      <p className="text-xs text-slate-400 leading-tight">{m.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Updates list */}
        {updates.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm">No updates published yet.</p>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-slate-100">
            {updates.map((update) => (
              <Link
                key={update._id.toString()}
                href={`/updates?product=${product.slug}&id=${update._id}`}
                className="block py-4 group hover:bg-slate-50 -mx-3 px-3 rounded-lg transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {update.title}
                    </p>
                    {update.summary && (
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {update.summary}
                      </p>
                    )}
                    {update.highlights && update.highlights.length > 0 && (
                      <div className="flex flex-wrap gap-x-3 mt-2">
                        {update.highlights.slice(0, 3).map((h: string, i: number) => (
                          <span key={i} className="text-xs text-slate-400 flex items-center gap-1">
                            <span
                              className="w-1 h-1 rounded-full flex-shrink-0"
                              style={{ backgroundColor: product.color }}
                            />
                            {h}
                          </span>
                        ))}
                        {update.highlights.length > 3 && (
                          <span className="text-xs text-slate-300">+{update.highlights.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                  <time className="text-xs text-slate-400 flex-shrink-0 mt-0.5">
                    {formatDate(update.date)}
                  </time>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
