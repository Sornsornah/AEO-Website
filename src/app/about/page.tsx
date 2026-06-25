export const dynamic = 'force-dynamic'

import { Navbar } from '@/components/layout/navbar'
import { StrategyImage } from './strategy-image'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-16 sm:py-20">

        {/* Header */}
        <header className="mb-20">
          <p className="text-xs font-semibold tracking-[0.2em] text-orange-700 uppercase mb-3">
            Who we are
          </p>
          <h1 className="text-5xl font-bold text-[#1C1512] mb-5 leading-[1.05] tracking-tight">
            AI Enablement Office
          </h1>
          <p className="text-lg text-stone-500 leading-relaxed">
            We build the central capabilities, tools and governance that make it easy for everyone in CPFB to create value with AI, turning everyday experimentation into CPFB-wide transformation.
          </p>
        </header>

        {/* Vision */}
        <section className="mb-20">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600 mb-5">Vision</p>
          <div className="rounded-2xl border border-[#E8E0D6] bg-[#F5EFE6] px-8 py-8">
            <p className="text-[1.45rem] sm:text-[1.7rem] font-semibold text-[#1C1512] leading-[1.35] tracking-tight">
              To enable the responsible adoption of AI to transform CPFB&rsquo;s technology and business so that the workforce is empowered to create more value for members.
            </p>
          </div>
        </section>

        {/* Strategy diagram */}
        <section>
          <StrategyImage />
        </section>

      </main>
    </div>
  )
}
