import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

export function AboutSection() {
  return (
    <section className="bg-[#F2EDE6]">
      <div className="max-w-6xl 2xl:max-w-[78vw] mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Department photo */}
          <div className="rounded-2xl border border-[#E8E0D6] bg-[#FDFCFB] overflow-hidden">
            <Image
              src="/department-photo.jpg"
              alt="The AEO department team"
              width={2560}
              height={1665}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="w-full h-auto"
              priority
            />
          </div>

          {/* Copy */}
          <div className="max-w-xl">
            <h2 className="text-5xl font-bold text-orange-600 tracking-tight mb-5">AI Enablement Office</h2>
            <p className="text-base text-stone-600 leading-relaxed mb-8">
              We enable TeamCPF to harness AI at scale, building the capabilities, tools,
              and solutions that turn AI&apos;s potential into real value for officers.
            </p>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 rounded-md bg-[#F97316] hover:bg-[#EA580C] text-[#F8FAFC] px-4 py-2.5 text-sm font-medium transition-colors"
            >
              Find out more
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
