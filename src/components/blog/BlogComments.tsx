'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Trash2, MessageCircle, Send, Pencil, Check, X } from 'lucide-react'
import { getInitials } from './blogUtils'

export interface BlogCommentData {
  _id: string
  authorId: string
  authorName: string
  content: string
  createdAt: string
  editedAt?: string
}

interface BlogCommentsProps {
  slug: string
  initialComments: BlogCommentData[]
  isLoggedIn: boolean
  currentUserId?: string
  isAdmin?: boolean
}

export function BlogComments({ slug, initialComments, isLoggedIn, currentUserId, isAdmin }: BlogCommentsProps) {
  const [comments, setComments] = useState(initialComments)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/blog/${slug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text.trim() }),
      })
      if (res.ok) {
        const comment = await res.json()
        setComments((prev) => [...prev, comment])
        setText('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(comment: BlogCommentData) {
    setEditingId(comment._id)
    setEditText(comment.content)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditText('')
  }

  async function handleSaveEdit(id: string) {
    if (!editText.trim() || savingEdit) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/blog/${slug}/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editText.trim() }),
      })
      if (res.ok) {
        const updated = await res.json()
        setComments((prev) =>
          prev.map((c) => c._id === id ? { ...c, content: updated.content, editedAt: updated.editedAt } : c)
        )
        setEditingId(null)
        setEditText('')
      }
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this comment?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/blog/${slug}/comments/${id}`, { method: 'DELETE' })
      if (res.ok) setComments((prev) => prev.filter((c) => c._id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-6">
        <MessageCircle className="w-5 h-5 text-slate-400" />
        {comments.length === 0 ? 'Comments' : `${comments.length} Comment${comments.length === 1 ? '' : 's'}`}
      </h2>

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-4 mb-8">
          {comments.map((comment) => {
            const isOwner = comment.authorId === currentUserId
            const canEdit = isOwner
            const canDelete = isOwner || isAdmin
            const isEditing = editingId === comment._id

            return (
              <div key={comment._id} className="flex gap-3 group">
                <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getInitials(comment.authorName)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-900">{comment.authorName}</span>
                    <span className="text-xs text-slate-400">{format(new Date(comment.createdAt), 'MMM d, yyyy · h:mm a')}</span>
                    {comment.editedAt && (
                      <span className="text-[10px] text-slate-400 italic">(edited)</span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        maxLength={2000}
                        autoFocus
                        className="w-full text-sm rounded-xl border border-slate-300 bg-card px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveEdit(comment._id)}
                          disabled={!editText.trim() || savingEdit}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-700 disabled:opacity-40 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-slate-500 text-xs hover:bg-slate-100 transition-colors"
                        >
                          <X className="w-3 h-3" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>
                  )}
                </div>

                {/* Actions — visible on hover */}
                {!isEditing && (canEdit || canDelete) && (
                  <div className="flex items-start gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {canEdit && (
                      <button
                        onClick={() => startEdit(comment)}
                        className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors"
                        title="Edit comment"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(comment._id)}
                        disabled={deletingId === comment._id}
                        className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Compose */}
      {isLoggedIn ? (
        <form onSubmit={handleSubmit} className="flex gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your thoughts..."
            rows={2}
            maxLength={2000}
            className="flex-1 text-sm rounded-xl border border-slate-200 bg-card px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300 placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting}
            className="self-end px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Post
          </button>
        </form>
      ) : (
        <p className="text-sm text-slate-400 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
          Sign in to leave a comment.
        </p>
      )}
    </div>
  )
}
