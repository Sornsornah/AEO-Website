'use client'

import { MessageCircle } from 'lucide-react'

interface CommentButtonProps {
  count: number
  onClick: (e: React.MouseEvent) => void
}

export function CommentButton({ count, onClick }: CommentButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
    >
      <MessageCircle className="w-4 h-4" />
      <span>{count > 0 ? `${count} Comment${count !== 1 ? 's' : ''}` : 'Comment'}</span>
    </button>
  )
}
