'use client'

import Link from 'next/link'
import { X, ExternalLink } from 'lucide-react'
import { UpdateDetail } from './UpdateDetail'
import { SaveButton } from './SaveButton'
import { SeenTracker } from './SeenTracker'

interface UpdatePanelProps {
  update: {
    _id: string
    title: string
    summary: string
    date: string
    progressUpdates: string
    nextSteps: string
    learningPoints: string
    media: string[]
    isPublished: boolean
    productId?: { _id: string; name: string; color: string; slug: string }
    productIds?: { _id: string; name: string; color: string; slug: string }[]
  }
  isSaved: boolean
  onClose: () => void
}

export function UpdatePanel({ update, isSaved, onClose }: UpdatePanelProps) {
  return (
    <div className="w-[480px] flex-shrink-0 border-l border-slate-100 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto bg-white">
      <SeenTracker updateId={update._id} />

      {/* Panel header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <SaveButton updateId={update._id} isSaved={isSaved} />
          <Link
            href={`/updates/${update._id}`}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            title="Open full page"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Full page</span>
          </Link>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded hover:bg-slate-100"
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Panel content */}
      <div className="px-6 py-8">
        <UpdateDetail update={update} />
      </div>
    </div>
  )
}
