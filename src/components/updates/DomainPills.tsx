'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface Domain {
  name: string
  slug: string
}

interface DomainPillsProps {
  domains: Domain[]
  activeDomain?: string
}

export function DomainPills({ domains, activeDomain }: DomainPillsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setDomain = useCallback(
    (slug: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (slug) {
        params.set('domain', slug)
      } else {
        params.delete('domain')
      }
      params.delete('page')
      params.delete('id')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  if (domains.length === 0) return null

  return (
    <div className="flex gap-2 flex-wrap mb-6">
      <button
        onClick={() => setDomain(null)}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
          !activeDomain
            ? 'bg-slate-900 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        All
      </button>
      {domains.map((d) => (
        <button
          key={d.slug}
          onClick={() => setDomain(d.slug)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeDomain === d.slug
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {d.name}
        </button>
      ))}
    </div>
  )
}
