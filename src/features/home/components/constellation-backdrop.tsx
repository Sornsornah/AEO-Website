import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

// Shared chrome for the homepage "Available Products" constellation: the soft
// orange wash and the centred title / description / CTA. Rendered both by the
// live homepage (ProductsCarousel) and by the admin Homepage-tab preview so the
// preview is a pixel-faithful rehearsal — the homepage is the source of truth.

export function ConstellationCenter({ interactive = true }: { interactive?: boolean }) {
  return (
    <div className="text-center">
      <h2 className="text-4xl font-bold tracking-tight text-[#1C1512] md:text-5xl">
        Available <span className="text-orange-600">Products</span>
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-sm text-stone-500">
        All the products made in-house available for CPF officers.
      </p>
      {interactive ? (
        <Link
          href="/products"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-[#F8FAFC] shadow-sm transition-colors hover:bg-[#EA580C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2"
        >
          Check out products
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-[#F8FAFC] shadow-sm">
          Check out products
          <ArrowRight className="h-4 w-4" />
        </span>
      )}
    </div>
  )
}

// The gradient wash + centred block, absolutely positioned within the
// constellation's relative block. `interactive={false}` makes it inert (no
// navigation, no pointer capture) so it can sit under the editor's drag layer.
export function ConstellationBackdrop({ interactive = true }: { interactive?: boolean }) {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: 'radial-gradient(closest-side, rgba(234,88,12,0.06), rgba(234,88,12,0))',
        }}
      />
      <div
        className={`absolute left-1/2 top-1/2 z-20 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-6 ${
          interactive ? '' : 'pointer-events-none'
        }`}
      >
        <ConstellationCenter interactive={interactive} />
      </div>
    </>
  )
}
