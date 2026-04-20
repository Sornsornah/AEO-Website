'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { createPortal } from 'react-dom'
import { X, Paperclip, Send } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useSession } from 'next-auth/react'

interface Comment {
  _id: string
  userName: string
  text: string
  attachments: string[]
  mentions: string[]
  createdAt: string
}

interface MentionUser {
  _id: string
  name: string
}

interface UpdateData {
  title: string
  summary: string
  progressUpdates: string | string[]
  nextSteps: string | string[]
  learningPoints: string | string[]
  domains: { _id: string; name: string }[]
  tags: { _id: string; name: string }[]
  productId?: { name: string; color: string }
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

function toMarkdown(val: string | string[]): string {
  if (Array.isArray(val)) return val.map((item) => `- ${item}`).join('\n')
  return val
}

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

function renderTextWithMentions(text: string) {
  const parts = text.split(/(@[\w][\w ]*)/g)
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="text-blue-600 font-medium">
        {part}
      </span>
    ) : (
      part
    )
  )
}

function EnlargedCard({ update }: { update: UpdateData }) {
  const hasProduct = !!update.productId?.name
  const hasTags = update.domains.length > 0 || hasProduct || update.tags.length > 0

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
      {hasTags && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {update.domains.map((d) => (
            <span key={d._id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              {d.name}
            </span>
          ))}
          {hasProduct && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: update.productId!.color }} />
              {update.productId!.name}
            </span>
          )}
          {update.tags.map((t) => (
            <span key={t._id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              {t.name}
            </span>
          ))}
        </div>
      )}

      <h2 className="text-lg font-semibold text-slate-900 mb-2 leading-snug">{update.title}</h2>
      <p className="text-sm text-slate-500 leading-relaxed mb-4">{update.summary}</p>

      <div className="space-y-2">
        {SECTIONS.map((s) => {
          const md = toMarkdown(update[s.key] || '')
          if (!md.trim()) return null
          return (
            <div key={s.key} className={`rounded-lg px-3 py-2.5 ${s.bg}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${s.labelColor}`}>{s.label}</p>
              <div className="prose prose-xs max-w-none text-xs text-slate-600 [&_ul]:space-y-0.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:pl-4 [&_p]:mb-0 [&_li]:leading-relaxed">
                <ReactMarkdown>{md}</ReactMarkdown>
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
  const [isVisible, setIsVisible] = useState(false)

  const [allUsers, setAllUsers] = useState<MentionUser[]>([])
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionAnchorIndex, setMentionAnchorIndex] = useState<number>(-1)

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
    fetch('/api/users/for-mention')
      .then((r) => r.json())
      .then((data) => setAllUsers(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [loading])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (mentionQuery !== null) setMentionQuery(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, mentionQuery])

  const TEAM_OPTION: MentionUser = { _id: 'team', name: 'team' }

  const filteredUsers: MentionUser[] = mentionQuery !== null
    ? [
        ...('team'.startsWith(mentionQuery.toLowerCase()) ? [TEAM_OPTION] : []),
        ...allUsers.filter((u) => u.name.toLowerCase().startsWith(mentionQuery.toLowerCase())).slice(0, 5),
      ]
    : []

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setText(val)
    const cursor = e.target.selectionStart ?? val.length
    const prefix = val.slice(0, cursor)
    const atIndex = prefix.lastIndexOf('@')
    if (atIndex !== -1) {
      const afterAt = prefix.slice(atIndex + 1)
      if (!/\s/.test(afterAt)) {
        setMentionQuery(afterAt)
        setMentionAnchorIndex(atIndex)
        return
      }
    }
    setMentionQuery(null)
    setMentionAnchorIndex(-1)
  }

  const insertMention = useCallback(
    (name: string) => {
      const textarea = inputRef.current
      if (!textarea) return
      const cursor = textarea.selectionStart ?? text.length
      const before = text.slice(0, mentionAnchorIndex)
      const after = text.slice(cursor)
      const newText = `${before}@${name} ${after}`
      setText(newText)
      setMentionQuery(null)
      setMentionAnchorIndex(-1)
      setTimeout(() => {
        textarea.focus()
        const newCursor = before.length + name.length + 2
        textarea.setSelectionRange(newCursor, newCursor)
      }, 0)
    },
    [text, mentionAnchorIndex]
  )

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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if ((!text.trim() && pendingFiles.length === 0) || submitting) return
    setSubmitting(true)
    const optimistic: Comment = {
      _id: `temp-${Date.now()}`,
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
    setMentionQuery(null)
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
      {/* Full-screen backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        onClick={onClose}
        aria-hidden
      />

      {/* Layout: enlarged card center + side panel right */}
      <div className="fixed inset-0 z-50 flex items-center pointer-events-none">
        {/* Enlarged card area */}
        <div
          className={`flex-1 flex items-center justify-center px-8 pointer-events-auto transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          <EnlargedCard update={update} />
        </div>

        {/* Comment side panel */}
        <div
          className={`h-full w-[380px] flex-shrink-0 bg-white shadow-2xl flex flex-col pointer-events-auto transition-transform duration-300 ease-out ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
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
                    </div>
                    {c.text && (
                      <p className="text-sm text-slate-600 leading-relaxed">{renderTextWithMentions(c.text)}</p>
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
                {mentionQuery !== null && filteredUsers.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {filteredUsers.map((u) => (
                      <button
                        key={u._id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); insertMention(u.name) }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 transition-colors"
                      >
                        {u._id === 'team' ? (
                          <>
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold flex-shrink-0">@</span>
                            <span className="font-medium text-blue-700">team</span>
                            <span className="text-xs text-slate-400 ml-auto">notify everyone in domain</span>
                          </>
                        ) : (
                          <>
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-xs flex items-center justify-center font-medium flex-shrink-0">{u.name[0].toUpperCase()}</span>
                            {u.name}
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && mentionQuery === null) {
                      e.preventDefault()
                      submit(e as unknown as React.FormEvent)
                    }
                  }}
                  placeholder="Add to the discussion…"
                  rows={3}
                  maxLength={1000}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300 placeholder:text-slate-400"
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
                    <span className="text-xs text-slate-400">Markdown supported</span>
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
