'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Paperclip } from 'lucide-react'
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

interface CommentSidePanelProps {
  updateId: string
  updateTitle: string
  onClose: () => void
  onCountChange: (count: number) => void
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

export function CommentSidePanel({ updateId, updateTitle, onClose, onCountChange }: CommentSidePanelProps) {
  const { data: session } = useSession()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [pendingFiles, setPendingFiles] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // @mention state
  const [allUsers, setAllUsers] = useState<MentionUser[]>([])
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionAnchorIndex, setMentionAnchorIndex] = useState<number>(-1)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Fetch comments
  useEffect(() => {
    fetch(`/api/updates/${updateId}/comments`)
      .then((r) => r.json())
      .then((data) => {
        setComments(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [updateId])

  // Fetch mentionable users once
  useEffect(() => {
    fetch('/api/users/for-mention')
      .then((r) => r.json())
      .then((data) => setAllUsers(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  // Focus input when panel opens
  useEffect(() => {
    inputRef.current?.focus()
  }, [loading])

  // Close on Escape (only when mention dropdown is not open)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (mentionQuery !== null) {
          setMentionQuery(null)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, mentionQuery])

  const TEAM_OPTION: MentionUser = { _id: 'team', name: 'team' }

  const filteredUsers: MentionUser[] = mentionQuery !== null
    ? [
        ...('team'.startsWith(mentionQuery.toLowerCase()) ? [TEAM_OPTION] : []),
        ...allUsers
          .filter((u) => u.name.toLowerCase().startsWith(mentionQuery.toLowerCase()))
          .slice(0, 5),
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
      // Only show dropdown if no whitespace after @
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
      // Replace from the @ sign up to cursor with @name + space
      const before = text.slice(0, mentionAnchorIndex)
      const after = text.slice(cursor)
      const newText = `${before}@${name} ${after}`
      setText(newText)
      setMentionQuery(null)
      setMentionAnchorIndex(-1)
      // Restore focus and move cursor after inserted mention
      setTimeout(() => {
        textarea.focus()
        const newCursor = before.length + name.length + 2 // '@' + name + ' '
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
      // silently ignore individual upload errors
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
        aria-hidden
      />

      {/* Side panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm z-50 bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Comments</p>
            <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{updateTitle}</p>
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
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading ? (
            <p className="text-xs text-slate-400">Loading...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-slate-400">No comments yet. Be the first!</p>
          ) : (
            comments.map((c) => (
              <div key={c._id} className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-slate-700">{c.userName}</span>
                  <span className="text-[11px] text-slate-400">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </span>
                </div>
                {c.text && (
                  <p className="text-sm text-slate-600">{renderTextWithMentions(c.text)}</p>
                )}
                {c.attachments?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {c.attachments.map((url, i) =>
                      isVideo(url) ? (
                        <video
                          key={i}
                          src={url}
                          controls
                          className="max-w-full rounded-lg max-h-48 bg-black"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={url}
                          alt=""
                          className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer"
                          onClick={() => window.open(url)}
                        />
                      )
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {session && (
          <form onSubmit={submit} className="px-5 py-4 border-t border-slate-100">
            {/* Pending attachment previews */}
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

            {/* Mention dropdown */}
            <div className="relative">
              {mentionQuery !== null && filteredUsers.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  {filteredUsers.map((u) => (
                    <button
                      key={u._id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        insertMention(u.name)
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    >
                      {u._id === 'team' ? (
                        <>
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold flex-shrink-0">
                            @
                          </span>
                          <span className="font-medium text-blue-700">team</span>
                          <span className="text-xs text-slate-400 ml-auto">notify everyone in domain</span>
                        </>
                      ) : (
                        <>
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-xs flex items-center justify-center font-medium flex-shrink-0">
                            {u.name[0].toUpperCase()}
                          </span>
                          {u.name}
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
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
                  placeholder="Add a comment… type @ to mention someone"
                  rows={2}
                  maxLength={1000}
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300 placeholder:text-slate-400"
                />
                <div className="flex flex-col gap-1.5 self-end">
                  <label
                    className={`flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 cursor-pointer text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  <button
                    type="submit"
                    disabled={(!text.trim() && pendingFiles.length === 0) || submitting || uploading}
                    className="px-3 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors"
                  >
                    {uploading ? '...' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </>
  )

  return createPortal(panel, document.body)
}
