'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Paperclip, Send, Trash2, Pencil, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useSession } from 'next-auth/react'
import ReactMarkdown from 'react-markdown'

interface Comment {
  _id: string
  userId: string
  userName: string
  text: string
  attachments: string[]
  mentions: string[]
  createdAt: string
}

interface UpdateData {
  title: string
  summary: string
  progressUpdates: string
  nextSteps: string
  learningPoints: string
  domains: { _id: string; name: string }[]
  tags: { _id: string; name: string }[]
  productId?: { _id?: string; name: string; color: string }
  productIds?: { _id: string; name: string; color: string }[]
}

interface CommentSidePanelProps {
  updateId: string
  update: UpdateData
  onClose: () => void
  onCountChange: (count: number) => void
}

const SECTIONS = [
  { key: 'progressUpdates' as const, label: 'Key Milestones',   bg: 'bg-emerald-50', labelColor: 'text-emerald-700' },
  { key: 'nextSteps'       as const, label: 'Next Steps',       bg: 'bg-blue-50',    labelColor: 'text-blue-700'    },
  { key: 'learningPoints'  as const, label: 'Learning Points',  bg: 'bg-amber-50',   labelColor: 'text-amber-700'   },
]


const AVATAR_COLORS = [
  'bg-pink-200 text-pink-800',
  'bg-orange-200 text-orange-800',
  'bg-blue-200 text-blue-800',
  'bg-emerald-200 text-emerald-800',
  'bg-purple-200 text-purple-800',
  'bg-yellow-200 text-yellow-800',
  'bg-rose-200 text-rose-800',
]

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov)$/i.test(url)
}

function EnlargedCard({ update }: { update: UpdateData }) {
  const products = update.productIds?.length
    ? update.productIds
    : update.productId?.name ? [update.productId as { _id?: string; name: string; color: string }] : []
  const hasTags = update.domains.length > 0 || products.length > 0 || update.tags.length > 0

  return (
    <div className="bg-card rounded-2xl shadow-2xl p-6 w-full">
      {hasTags && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {update.domains.map((d) => (
            <span key={d._id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              {d.name}
            </span>
          ))}
          {products.map((p, i) => (
            <span key={p._id ?? i} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
              {p.name}
            </span>
          ))}
          {update.tags.map((t) => (
            <span key={t._id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              {t.name}
            </span>
          ))}
        </div>
      )}

      <h2 className="text-lg font-semibold text-slate-900 mb-2 leading-snug">{update.title}</h2>
      <div className="text-sm text-slate-500 leading-relaxed mb-4 prose prose-sm prose-slate max-w-none prose-a:text-blue-600 prose-a:underline">
        <ReactMarkdown>{update.summary}</ReactMarkdown>
      </div>

      <div className="space-y-2">
        {SECTIONS.map((s) => {
          const content = update[s.key]
          if (!content?.trim()) return null
          return (
            <div key={s.key} className={`rounded-lg px-3 py-2.5 ${s.bg}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${s.labelColor}`}>{s.label}</p>
              <div className="prose prose-xs max-w-none text-black leading-relaxed [&_ol]:list-decimal [&_ol]:pl-4 [&_ol_ol]:list-[lower-alpha] [&_p]:mb-1 [&_li]:mb-0.5">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CommentSidePanel({ updateId, update, onClose, onCountChange }: CommentSidePanelProps) {
  const { data: session } = useSession()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [pendingFiles, setPendingFiles] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [savingEditId, setSavingEditId] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    fetch(`/api/updates/${updateId}/comments`)
      .then((r) => r.json())
      .then((data) => { setComments(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [updateId])

  useEffect(() => {
    inputRef.current?.focus()
  }, [loading])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    try {
      const urls = await Promise.all(
        files.map(async (file) => {
          const fd = new FormData()
          fd.append('file', file)
          const res = await fetch('/api/uploads', { method: 'POST', body: fd })
          if (!res.ok) throw new Error('Upload failed')
          const data = await res.json()
          return data.url as string
        })
      )
      setPendingFiles((prev) => [...prev, ...urls])
    } catch {
      // silently ignore
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function removePending(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function startEdit(c: Comment) {
    setEditingId(c._id)
    setEditText(c.text)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditText('')
  }

  async function saveEdit(commentId: string) {
    if (!editText.trim() || savingEditId) return
    setSavingEditId(commentId)
    try {
      const res = await fetch(`/api/updates/${updateId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText.trim() }),
      })
      if (res.ok) {
        const updated = await res.json()
        setComments((prev) => prev.map((c) => (c._id === commentId ? updated : c)))
        setEditingId(null)
        setEditText('')
      }
    } finally {
      setSavingEditId(null)
    }
  }

  async function deleteComment(commentId: string) {
    setDeletingId(commentId)
    try {
      await fetch(`/api/updates/${updateId}/comments/${commentId}`, { method: 'DELETE' })
      const next = comments.filter((c) => c._id !== commentId)
      setComments(next)
      onCountChange(next.length)
    } finally {
      setDeletingId(null)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if ((!text.trim() && pendingFiles.length === 0) || submitting) return
    setSubmitting(true)
    const optimistic: Comment = {
      _id: `temp-${Date.now()}`,
      userId: session?.user?.id || '',
      userName: session?.user?.name || 'You',
      text: text.trim(),
      attachments: [...pendingFiles],
      mentions: [],
      createdAt: new Date().toISOString(),
    }
    const next = [...comments, optimistic]
    setComments(next)
    onCountChange(next.length)
    setText('')
    setPendingFiles([])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    try {
      const res = await fetch(`/api/updates/${updateId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: optimistic.text, attachments: optimistic.attachments }),
      })
      if (res.ok) {
        const saved = await res.json()
        setComments((prev) => prev.map((c) => (c._id === optimistic._id ? saved : c)))
      }
    } catch {
      // keep optimistic
    } finally {
      setSubmitting(false)
    }
  }

  const panel = (
    <>
      {/* Backdrop — sits below navbar (top-14 = h-14 navbar height) */}
      <div
        className={`fixed top-14 inset-x-0 bottom-0 z-40 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        onClick={onClose}
        aria-hidden
      />

      {/* Layout: enlarged card (3/4) + side panel (1/4) */}
      <div className="fixed top-14 inset-x-0 bottom-0 z-50 flex pointer-events-none">
        {/* Enlarged card area — scrollable; clicking empty space closes modal */}
        <div
          className={`flex-[3] h-full overflow-y-auto flex items-start justify-center px-8 py-10 pointer-events-auto transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
        >
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <EnlargedCard update={update} />
          </div>
        </div>

        {/* Comment side panel */}
        <div
          className={`h-full flex-[1] min-w-[320px] max-w-[460px] bg-card shadow-2xl flex flex-col pointer-events-auto transition-transform duration-300 ease-out ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-slate-100">
            <div>
              <p className="text-base font-semibold text-slate-900">Discussion</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? '…' : `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-0.5 flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close comments"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Comment list */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {loading ? (
              <p className="text-xs text-slate-400">Loading…</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-slate-400">No comments yet. Be the first!</p>
            ) : (
              comments.map((c) => (
                <div key={c._id} className="flex gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-semibold ${getAvatarColor(c.userName)}`}
                  >
                    {getInitials(c.userName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-slate-800">{c.userName}</span>
                      <span className="text-[11px] text-slate-400">
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </span>
                      {c.userId === session?.user?.id && !c._id.startsWith('temp-') && editingId !== c._id && (
                        <div className="ml-auto flex items-center gap-1.5">
                          <button
                            onClick={() => startEdit(c)}
                            className="text-slate-300 hover:text-slate-500 transition-colors"
                            aria-label="Edit comment"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteComment(c._id)}
                            disabled={deletingId === c._id}
                            className="text-slate-300 hover:text-red-400 transition-colors disabled:opacity-40"
                            aria-label="Delete comment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {editingId === c._id ? (
                      <div className="mt-1 space-y-1.5">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(c._id) }
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          rows={3}
                          maxLength={1000}
                          autoFocus
                          className="w-full text-sm text-slate-900 bg-background border border-slate-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(c._id)}
                            disabled={!editText.trim() || savingEditId === c._id}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-800 text-white rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            {savingEditId === c._id ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {c.text && (
                          <p className="text-sm text-slate-600 leading-relaxed">{c.text}</p>
                        )}
                        {c.attachments?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {c.attachments.map((url, i) =>
                              isVideo(url) ? (
                                <video key={i} src={url} controls className="max-w-full rounded-lg max-h-48 bg-black" />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={i} src={url} alt="" className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer" onClick={() => window.open(url)} />
                              )
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {session && (
            <form onSubmit={submit} className="px-6 py-4 border-t border-slate-100">
              {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {pendingFiles.map((url, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                      {isVideo(url) ? (
                        <video src={url} className="w-full h-full object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removePending(i)}
                        className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5 text-white"
                        aria-label="Remove attachment"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      submit(e as unknown as React.FormEvent)
                    }
                  }}
                  placeholder="Add to the discussion…"
                  rows={3}
                  maxLength={1000}
                  className="w-full text-sm text-slate-900 bg-background border border-slate-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300 placeholder:text-slate-400"
                />

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <label
                      className={`flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer text-slate-400 hover:text-slate-600 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="Attach photo or video"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                        disabled={uploading}
                      />
                      <Paperclip className="w-3.5 h-3.5" />
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={(!text.trim() && pendingFiles.length === 0) || submitting || uploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 text-white rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    Post
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )

  return createPortal(panel, document.body)
}
