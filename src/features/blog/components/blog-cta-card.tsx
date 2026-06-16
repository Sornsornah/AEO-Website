'use client'

import Link from 'next/link'
import { PenSquare, Sparkles } from 'lucide-react'

export function BlogCtaCard() {
  return (
    <Link href="/editor/blog/new?from=blog" className="group block h-full">
      <div className="h-full flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
        {/* Cover */}
        <div className="relative aspect-[16/9] overflow-hidden">
          <div className="w-full h-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white/90" />
          </div>
          <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-orange-100 text-orange-700 backdrop-blur-sm">
            Your turn
          </span>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-bold text-slate-900 text-sm leading-snug mb-1.5 group-hover:text-orange-600 transition-colors">
            Feeling inspired to share your thoughts?
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-3">
            Got a win, a lesson, or a half-formed idea worth sharing? Start writing — it only takes a few minutes.
          </p>
          <span className="mt-auto inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full bg-orange-600 text-white shadow-sm group-hover:bg-orange-700 group-hover:shadow-md transition-all self-start">
            <PenSquare className="w-3.5 h-3.5" />
            Write a post
          </span>
        </div>
      </div>
    </Link>
  )
}
