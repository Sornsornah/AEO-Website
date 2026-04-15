'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SaveButtonProps {
  updateId: string
  isSaved: boolean
  className?: string
}

export function SaveButton({ updateId, isSaved: initialSaved, className }: SaveButtonProps) {
  const [saved, setSaved] = useState(initialSaved)
  const [loading, setLoading] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const method = saved ? 'DELETE' : 'POST'
      await fetch(`/api/updates/${updateId}/save`, { method })
      setSaved(!saved)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={cn(
        'flex items-center gap-1 text-xs transition-colors',
        saved
          ? 'text-blue-600 hover:text-blue-800'
          : 'text-slate-400 hover:text-slate-600',
        className
      )}
      title={saved ? 'Remove from saved' : 'Save this update'}
    >
      {saved ? (
        <BookmarkCheck className="w-4 h-4" />
      ) : (
        <Bookmark className="w-4 h-4" />
      )}
    </button>
  )
}
