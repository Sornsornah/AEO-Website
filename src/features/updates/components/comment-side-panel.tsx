'use client'

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Trash2, Pencil, Check, Link2, Link2Off, List, ListOrdered, Reply, CornerUpLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useSession } from '@/lib/use-session'
import { track } from '@/lib/track'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useEditor, EditorContent, Node, mergeAttributes, Extension, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Mention from '@tiptap/extension-mention'
import { mentionSuggestion } from './comment-mention-suggestion'
import { encodeImageFile, imageFileFromClipboardData } from '@/features/editor/lib/image-data-url'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { sanitizeMarkdown } from '@/lib/sanitizeMarkdown'
import DOMPurify from 'dompurify'

interface Comment {
  _id: string
  userId: string
  userName: string
  text: string
  attachments: string[]
  mentions: string[]
  parentId: string | null
  createdAt: string
}

// A shared Mention extension for both the compose and edit editors: '@' opens
// the Management/AEO autocomplete and inserts a chip carrying the user id.
const CommentMention = Mention.configure({
  HTMLAttributes: { class: 'mention' },
  suggestion: mentionSuggestion,
})

// Pasting a raw photo embeds it as a multi-MB base64 `data:` URI in the comment
// HTML, and the Airbase edge rejects the oversized request body with a 403 (the
// same reason direct server uploads are restricted in deploy). So we mirror the
// blog cover / product image pattern: downscale the pasted image client-side
// with `encodeImageFile`, then keep the (now small) base64 inline — no upload.
// Comment thumbnails render tiny, so a modest width is plenty.
const COMMENT_IMAGE_MAX_WIDTH = 1280

async function insertPastedImage(editor: Editor, file: File) {
  try {
    const dataUrl = await encodeImageFile(file, COMMENT_IMAGE_MAX_WIDTH)
    editor.chain().focus().setImage({ src: dataUrl }).run()
  } catch {
    toast.error('Could not add image')
  }
}

// Intercept image paste/drop (clipboard or dragged file) and downscale it,
// instead of letting Tiptap insert the original full-size base64.
function handleImageInsert(editor: Editor | null, data: DataTransfer | null, event: Event): boolean {
  if (!editor) return false
  const file = imageFileFromClipboardData(data)
  if (!file) return false
  event.preventDefault()
  void insertPastedImage(editor, file)
  return true
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
  { key: 'progressUpdates' as const, label: 'Key Milestones',   bg: 'bg-emerald-150', labelColor: 'text-emerald-800' },
  { key: 'nextSteps'       as const, label: 'Next Steps',       bg: 'bg-blue-150',    labelColor: 'text-blue-800'    },
  { key: 'learningPoints'  as const, label: 'Learning Points',  bg: 'bg-amber-150',   labelColor: 'text-amber-800'   },
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

// Detect whether stored text is HTML (from Tiptap) or legacy plain text
function isHtml(text: string) {
  return /<[a-z][\s\S]*>/i.test(text)
}

// Flatten a comment body (HTML or markdown) into a short plain-text snippet for
// the Teams-style reply quote. Tags are stripped; if the body is only media
// (pasted image/video as inline base64), fall back to a media label.
function commentPreviewText(raw: string): string {
  if (!raw) return ''
  const hasVideo = /<video\b/i.test(raw)
  const hasImage = /<img\b/i.test(raw) || /!\[/.test(raw)
  const plain = raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
  if (plain) return plain
  if (hasVideo) return '🎬 Video'
  if (hasImage) return '🖼️ Image'
  return ''
}

function CommentBody({ text }: { text: string }) {
  if (!text) return null
  if (isHtml(text)) {
    const clean = DOMPurify.sanitize(text, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a', 'img', 'video', 'source', 'span'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'controls', 'class', 'type', 'data-type', 'data-id', 'data-label'],
    })
    return (
      <div
        className="text-sm text-slate-600 leading-relaxed prose prose-sm prose-slate max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_video]:max-h-48 [&_video]:rounded-lg [&_video]:w-full"
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    )
  }
  return (
    <div className="text-sm text-slate-600 leading-relaxed prose prose-sm prose-slate max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{sanitizeMarkdown(text)}</ReactMarkdown>
    </div>
  )
}

// Custom video node for inline video embeds
const VideoNode = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  addAttributes() { return { src: { default: null } } },
  parseHTML() { return [{ tag: 'video' }] },
  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes(HTMLAttributes, { controls: true, class: 'w-full rounded-lg max-h-48' })]
  },
})

export interface CommentEditorHandle {
  getHtml(): string
  clear(): void
  focus(): void
}

const CommentTiptapEditor = forwardRef<CommentEditorHandle, { onSubmit: () => void }>(
function CommentTiptapEditor({ onSubmit }, ref) {
  const linkInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  // Stable ref so the extension always calls the latest onSubmit
  const onSubmitRef = useRef(onSubmit)
  useEffect(() => { onSubmitRef.current = onSubmit }, [onSubmit])

  const SubmitKeymap = useMemo(() => Extension.create({
    name: 'commentSubmitKeymap',
    addKeyboardShortcuts() {
      return {
        // Enter outside a list → submit; inside a list → default (new list item)
        Enter: () => {
          if (this.editor.isActive('listItem')) return false
          onSubmitRef.current()
          return true
        },
        // Shift+Enter inside a list → new list item; outside → hard break (default)
        'Shift-Enter': () => {
          if (this.editor.isActive('listItem')) {
            return this.editor.commands.splitListItem('listItem')
          }
          return false
        },
      }
    },
  }), [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, code: false, blockquote: false, horizontalRule: false }),
      Placeholder.configure({ placeholder: 'Add to the discussion… (Shift+Enter for new line, Enter to post)' }),
      Underline,
      Link.configure({ openOnClick: false, autolink: false }),
      // Inline base64 is allowed, but pasted/dropped images are downscaled first
      // (handlers below) so the comment body stays under the edge size limit.
      Image.configure({ allowBase64: true }),
      VideoNode,
      CommentMention,
      SubmitKeymap,
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-3 py-2.5 text-sm text-slate-800 min-h-[72px] [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-0 [&_li]:my-0 [&_a]:text-blue-600 [&_a]:underline [&_img]:max-h-48 [&_img]:rounded-lg',
      },
      handlePaste: (_view, event) => handleImageInsert(editorRef.current, event.clipboardData, event),
      handleDrop: (_view, event) => handleImageInsert(editorRef.current, (event as DragEvent).dataTransfer, event),
    },
  })

  useEffect(() => { editorRef.current = editor }, [editor])

  useImperativeHandle(ref, () => ({
    getHtml() {
      if (!editor) return ''
      const html = editor.getHTML()
      return html === '<p></p>' ? '' : html
    },
    clear() {
      editor?.commands.clearContent()
      setShowLinkInput(false)
      setLinkUrl('')
    },
    focus() {
      editor?.commands.focus('end')
    },
  }), [editor])

  function handleLinkToggle() {
    if (!editor) return
    if (editor.isActive('link')) {
      setLinkUrl(editor.getAttributes('link').href || '')
    } else {
      setLinkUrl('')
    }
    setShowLinkInput((v) => !v)
    setTimeout(() => linkInputRef.current?.focus(), 0)
  }

  function applyLink() {
    if (!editor) return
    const url = linkUrl.trim()
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank', rel: 'noopener noreferrer' }).run()
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    }
    setShowLinkInput(false)
    setLinkUrl('')
  }

  if (!editor) return null

  const btnClass = (active: boolean) =>
    `px-2 py-1 text-xs rounded transition-colors ${active ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`

  const tb = (label: React.ReactNode, title: string, active: boolean, onClick: () => void) => (
    <button
      key={title}
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={btnClass(active)}
    >
      {label}
    </button>
  )

  return (
    <div className="rounded-xl border border-slate-200 bg-background focus-within:ring-2 focus-within:ring-slate-300 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-slate-100">
        {tb(<span className="font-bold">B</span>, 'Bold', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
        {tb(<span className="italic">I</span>, 'Italic', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
        {tb(<span className="underline">U</span>, 'Underline', editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run())}
        {tb(<span className="line-through">S</span>, 'Strikethrough', editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run())}
        <div className="w-px h-4 bg-slate-200 mx-0.5" />
        {tb(<List className="w-3 h-3" />, 'Bullet list', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
        {tb(<ListOrdered className="w-3 h-3" />, 'Ordered list', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
        <div className="w-px h-4 bg-slate-200 mx-0.5" />
        <button
          type="button"
          title="Link"
          onMouseDown={(e) => { e.preventDefault(); handleLinkToggle() }}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${editor.isActive('link') || showLinkInput ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
        >
          <Link2 className="w-3 h-3" />
        </button>
      </div>

      {/* Link input row */}
      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50">
          <Link2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
          <input
            ref={linkInputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink() }
              if (e.key === 'Escape') { setShowLinkInput(false); editor.commands.focus() }
            }}
            placeholder="https://…"
            className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white"
          />
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyLink() }}
            className="px-2.5 py-1 bg-slate-900 text-white rounded text-xs hover:bg-slate-700 transition-colors"
          >
            Apply
          </button>
          {editor.isActive('link') && (
            <button
              type="button"
              title="Remove link"
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().extendMarkRange('link').unsetLink().run(); setShowLinkInput(false) }}
              className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition-colors"
            >
              <Link2Off className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setShowLinkInput(false); editor.commands.focus() }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  )
})

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
      {update.summary && update.summary !== '<p></p>' && (
        <div
          className="text-sm text-slate-500 leading-relaxed mb-4 prose prose-sm prose-slate max-w-none prose-a:text-blue-600 prose-a:underline [&_u]:underline [&_s]:line-through"
          dangerouslySetInnerHTML={{ __html: update.summary }}
        />
      )}

      <div className="space-y-2">
        {SECTIONS.map((s) => {
          const content = update[s.key]
          if (!content?.trim()) return null
          return (
            <div key={s.key} className={`rounded-lg px-3 py-2.5 ${s.bg}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${s.labelColor}`}>{s.label}</p>
              <div className="prose prose-xs max-w-none text-black leading-relaxed [&_ol]:list-decimal [&_ol]:pl-4 [&_ol_ol]:list-[lower-alpha] [&_p]:mb-1 [&_li]:mb-0.5 [&_u]:underline [&_s]:line-through [&_del]:line-through">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{sanitizeMarkdown(content)}</ReactMarkdown>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EditCommentTiptapEditor({
  initialHtml,
  onSave,
  onCancel,
  saving,
}: {
  initialHtml: string
  onSave: (html: string) => void
  onCancel: () => void
  saving: boolean
}) {
  const linkInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const onSaveRef = useRef(onSave)
  useEffect(() => { onSaveRef.current = onSave }, [onSave])
  const onCancelRef = useRef(onCancel)
  useEffect(() => { onCancelRef.current = onCancel }, [onCancel])

  const EditKeymap = useMemo(() => Extension.create({
    name: 'editCommentKeymap',
    addKeyboardShortcuts() {
      return {
        Enter: () => {
          if (this.editor.isActive('listItem')) return false
          const html = this.editor.getHTML()
          if (html && html !== '<p></p>') onSaveRef.current(html)
          return true
        },
        'Shift-Enter': () => {
          if (this.editor.isActive('listItem')) return this.editor.commands.splitListItem('listItem')
          return false
        },
        Escape: () => { onCancelRef.current(); return true },
      }
    },
  }), [])

  const editor = useEditor({
    immediatelyRender: false,
    content: initialHtml,
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, code: false, blockquote: false, horizontalRule: false }),
      Placeholder.configure({ placeholder: 'Edit your comment…' }),
      Underline,
      Link.configure({ openOnClick: false, autolink: false }),
      Image.configure({ allowBase64: true }),
      VideoNode,
      CommentMention,
      EditKeymap,
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-3 py-2.5 text-sm text-slate-800 min-h-[72px] [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-0 [&_li]:my-0 [&_a]:text-blue-600 [&_a]:underline [&_img]:max-h-48 [&_img]:rounded-lg',
      },
      handlePaste: (_view, event) => handleImageInsert(editorRef.current, event.clipboardData, event),
      handleDrop: (_view, event) => handleImageInsert(editorRef.current, (event as DragEvent).dataTransfer, event),
    },
    autofocus: true,
  })

  useEffect(() => { editorRef.current = editor }, [editor])

  function handleLinkToggle() {
    if (!editor) return
    if (editor.isActive('link')) setLinkUrl(editor.getAttributes('link').href || '')
    else setLinkUrl('')
    setShowLinkInput((v) => !v)
    setTimeout(() => linkInputRef.current?.focus(), 0)
  }

  function applyLink() {
    if (!editor) return
    const url = linkUrl.trim()
    if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank', rel: 'noopener noreferrer' }).run()
    else editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setShowLinkInput(false)
    setLinkUrl('')
  }

  if (!editor) return null

  const btnClass = (active: boolean) =>
    `px-2 py-1 text-xs rounded transition-colors ${active ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`

  const tb = (label: React.ReactNode, title: string, active: boolean, onClick: () => void) => (
    <button key={title} type="button" title={title} onMouseDown={(e) => { e.preventDefault(); onClick() }} className={btnClass(active)}>
      {label}
    </button>
  )

  const html = editor.getHTML()
  const isEmpty = !html || html === '<p></p>'

  return (
    <div className="mt-1 space-y-1.5">
      <div className="rounded-xl border border-slate-200 bg-background focus-within:ring-2 focus-within:ring-slate-300 overflow-hidden">
        <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-slate-100">
          {tb(<span className="font-bold">B</span>, 'Bold', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
          {tb(<span className="italic">I</span>, 'Italic', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
          {tb(<span className="underline">U</span>, 'Underline', editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run())}
          {tb(<span className="line-through">S</span>, 'Strikethrough', editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run())}
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          {tb(<List className="w-3 h-3" />, 'Bullet list', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
          {tb(<ListOrdered className="w-3 h-3" />, 'Ordered list', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <button type="button" title="Link" onMouseDown={(e) => { e.preventDefault(); handleLinkToggle() }}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${editor.isActive('link') || showLinkInput ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}>
            <Link2 className="w-3 h-3" />
          </button>
        </div>
        {showLinkInput && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50">
            <Link2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <input ref={linkInputRef} type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); applyLink() }
                if (e.key === 'Escape') { setShowLinkInput(false); editor.commands.focus() }
              }}
              placeholder="https://…"
              className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white" />
            <button type="button" onMouseDown={(e) => { e.preventDefault(); applyLink() }}
              className="px-2.5 py-1 bg-slate-900 text-white rounded text-xs hover:bg-slate-700 transition-colors">Apply</button>
            {editor.isActive('link') && (
              <button type="button" title="Remove link"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().extendMarkRange('link').unsetLink().run(); setShowLinkInput(false) }}
                className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition-colors">
                <Link2Off className="w-3 h-3" />
              </button>
            )}
            <button type="button" onMouseDown={(e) => { e.preventDefault(); setShowLinkInput(false); editor.commands.focus() }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => { const h = editor.getHTML(); if (h && h !== '<p></p>') onSave(h) }}
          disabled={isEmpty || saving}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-800 text-white rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors">
          <Check className="w-3 h-3" />
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

export function CommentSidePanel({ updateId, update, onClose, onCountChange }: CommentSidePanelProps) {
  const session = useSession()
  const queryClient = useQueryClient()
  const commentEditorRef = useRef<CommentEditorHandle>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string; text: string } | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: comments = [], isLoading: loading } = useQuery<Comment[]>({
    queryKey: ['comments', updateId],
    queryFn: () => fetch(`/api/updates/${updateId}/comments`).then((r) => r.json()),
  })

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submitMutation = useMutation({
    mutationFn: ({ text, parentId }: { text: string; parentId: string | null }) =>
      fetch(`/api/updates/${updateId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, attachments: [], parentId }),
      }).then((r) => r.json()),
    onMutate: async ({ text, parentId }) => {
      await queryClient.cancelQueries({ queryKey: ['comments', updateId] })
      const prev = queryClient.getQueryData<Comment[]>(['comments', updateId]) ?? []
      const optimistic: Comment = {
        _id: `temp-${Date.now()}`,
        userId: session?.user?.id || '',
        userName: session?.user?.name || 'You',
        text,
        attachments: [],
        mentions: [],
        parentId,
        createdAt: new Date().toISOString(),
      }
      const next = [...prev, optimistic]
      queryClient.setQueryData(['comments', updateId], next)
      onCountChange(next.length)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      return { prev, optimisticId: optimistic._id }
    },
    onSuccess: (saved, _text, ctx) => {
      queryClient.setQueryData<Comment[]>(['comments', updateId], (old = []) =>
        old.map((c) => (c._id === ctx?.optimisticId ? saved : c))
      )
      track('update_comment', { entityId: updateId, entityType: 'update' })
    },
    onError: (_err, _text, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['comments', updateId], ctx.prev)
      toast.error('Failed to post comment')
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ commentId, html }: { commentId: string; html: string }) =>
      fetch(`/api/updates/${updateId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: html }),
      }).then((r) => r.json()),
    onSuccess: (updated) => {
      queryClient.setQueryData<Comment[]>(['comments', updateId], (old = []) =>
        old.map((c) => (c._id === updated._id ? updated : c))
      )
      setEditingId(null)
    },
    onError: () => toast.error('Failed to save edit'),
  })

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) =>
      fetch(`/api/updates/${updateId}/comments/${commentId}`, { method: 'DELETE' }),
    onSuccess: (_res, commentId) => {
      queryClient.setQueryData<Comment[]>(['comments', updateId], (old = []) => {
        const next = old.filter((c) => c._id !== commentId)
        onCountChange(next.length)
        return next
      })
    },
    onError: () => toast.error('Failed to delete comment'),
  })

  function startEdit(c: Comment) {
    setEditingId(c._id)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function saveEdit(commentId: string, html: string) {
    if (!html.trim() || editMutation.isPending) return
    editMutation.mutate({ commentId, html })
  }

  function deleteComment(commentId: string) {
    deleteMutation.mutate(commentId)
  }

  function submit() {
    const html = commentEditorRef.current?.getHtml() ?? ''
    if (!html || submitMutation.isPending) return
    const parentId = replyingTo?.id ?? null
    commentEditorRef.current?.clear()
    setReplyingTo(null)
    submitMutation.mutate({ text: html, parentId })
  }

  function startReply(c: Comment) {
    setReplyingTo({ id: c._id, userName: c.userName, text: c.text })
    setTimeout(() => commentEditorRef.current?.focus(), 0)
  }

  function scrollToComment(commentId: string) {
    document.getElementById(`comment-${commentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const panel = (
    <>
      <div
        className={`fixed top-14 inset-x-0 bottom-0 z-40 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        onClick={onClose}
        aria-hidden
      />

      <div className="fixed top-14 inset-x-0 bottom-0 z-50 flex pointer-events-none">
        {/* Enlarged card */}
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
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-900">Discussion</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                  <span>
                    {loading ? '…' : `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="mt-0.5 flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close comments"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Comment list */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {loading ? (
              <p className="text-xs text-slate-400">Loading…</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-slate-400">No comments yet. Be the first!</p>
            ) : (
              comments.map((c) => {
                const parent = c.parentId ? comments.find((p) => p._id === c.parentId) : null
                const isOwn = c.userId === session?.user?.id
                const isTemp = c._id.startsWith('temp-')
                return (
                <div key={c._id} id={`comment-${c._id}`} className="flex gap-3 scroll-mt-4">
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
                      {session && !isTemp && editingId !== c._id && (
                        <div className="ml-auto flex items-center gap-1.5">
                          <button
                            onClick={() => startReply(c)}
                            className="text-slate-300 hover:text-slate-500 transition-colors"
                            aria-label="Reply to comment"
                          >
                            <Reply className="w-3 h-3" />
                          </button>
                          {isOwn && (
                            <>
                              <button
                                onClick={() => startEdit(c)}
                                className="text-slate-300 hover:text-slate-500 transition-colors"
                                aria-label="Edit comment"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteComment(c._id)}
                                disabled={deleteMutation.isPending}
                                className="text-slate-300 hover:text-red-400 transition-colors disabled:opacity-40"
                                aria-label="Delete comment"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {c.parentId && (
                      parent ? (
                        <button
                          type="button"
                          onClick={() => scrollToComment(parent._id)}
                          className="block w-full text-left mb-1.5 pl-2 pr-2 py-1 rounded-md bg-slate-50 border-l-2 border-slate-300 hover:bg-slate-100 transition-colors"
                        >
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                            <CornerUpLeft className="w-3 h-3 flex-shrink-0" />
                            {parent.userName}
                          </span>
                          <span className="block text-[11px] text-slate-400 truncate">
                            {commentPreviewText(parent.text)}
                          </span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 mb-1 text-[11px] text-slate-400">
                          <CornerUpLeft className="w-3 h-3 flex-shrink-0" />
                          <span>Replying to a deleted comment</span>
                        </div>
                      )
                    )}

                    {editingId === c._id ? (
                      <EditCommentTiptapEditor
                        initialHtml={c.text}
                        saving={editMutation.isPending}
                        onSave={(html) => saveEdit(c._id, html)}
                        onCancel={cancelEdit}
                      />
                    ) : (
                      <>
                        <CommentBody text={c.text} />
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
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {session && (
            <div className="px-6 py-4 border-t border-slate-100">
              {replyingTo && (
                <div className="flex items-start gap-1.5 mb-2 pl-2.5 pr-2 py-1.5 rounded-lg bg-slate-100 border-l-2 border-slate-400">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <CornerUpLeft className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">
                        Replying to <span className="font-semibold text-slate-700">{replyingTo.userName}</span>
                      </span>
                    </div>
                    {commentPreviewText(replyingTo.text) && (
                      <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 break-words">
                        {commentPreviewText(replyingTo.text)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Cancel reply"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <CommentTiptapEditor
                ref={commentEditorRef}
                onSubmit={submit}
              />
              <div className="flex items-center justify-end mt-2">
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 text-white rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors"
                >
                  {submitMutation.isPending ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )

  return createPortal(panel, document.body)
}
