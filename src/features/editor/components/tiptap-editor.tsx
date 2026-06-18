'use client'

import { useEditor, EditorContent, Editor, Node, mergeAttributes } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { useEffect, useRef, useState } from 'react'
import { Link2, Link2Off, Code, Quote } from 'lucide-react'
import { uploadImage, imageFileFromClipboardData } from '@/features/editor/lib/image-data-url'
import { toast } from 'sonner'

// Custom video node — renders as <video controls>
const VideoNode = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  addAttributes() {
    return { src: { default: null } }
  },
  parseHTML() {
    return [{ tag: 'video' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes(HTMLAttributes, { controls: true, class: 'w-full rounded max-h-[480px]' })]
  },
})

// Pasted/dropped images are downscaled and uploaded to GridFS, then inserted by
// URL — never inline base64 (the deploy WAF 403s any body containing ";base64,").
const EDITOR_IMAGE_MAX_WIDTH = 1600

async function insertUploadedImage(editor: Editor | null, file: File) {
  if (!editor) return
  try {
    const url = await uploadImage(file, EDITOR_IMAGE_MAX_WIDTH)
    editor.chain().focus().setImage({ src: url }).run()
  } catch {
    toast.error('Could not add image')
  }
}

function handleImageInsert(editor: Editor | null, data: DataTransfer | null, event: Event): boolean {
  const file = imageFileFromClipboardData(data)
  if (!file) return false
  event.preventDefault()
  void insertUploadedImage(editor, file)
  return true
}

interface TiptapEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
  limitedToolbar?: boolean
}

export function TiptapEditor({ value, onChange, placeholder = 'Start writing...', minHeight = '120px', limitedToolbar = false }: TiptapEditorProps) {
  const lastHtml = useRef(value)
  const editorRef = useRef<Editor | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    enableInputRules: false,
    extensions: [
      StarterKit.configure({ codeBlock: {}, code: false }),
      Underline,
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, autolink: false }),
      Image.configure({ allowBase64: true }),
      VideoNode,
    ],
    content: value || '',
    onUpdate({ editor }) {
      const html = editor.getHTML()
      lastHtml.current = html
      onChange(html)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-3 py-2 text-sm text-slate-800 [&_u]:underline [&_s]:line-through [&_pre]:bg-slate-100 [&_pre]:rounded [&_pre]:p-3 [&_pre]:text-xs [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:text-slate-600 [&_blockquote]:italic [&_blockquote]:bg-transparent [&_blockquote]:border-r-0 [&_blockquote]:border-t-0 [&_blockquote]:border-b-0 [&_p]:[line-height:1.25] [&_li]:[line-height:1.25] [&_h1]:[line-height:1.25] [&_h2]:[line-height:1.25] [&_h3]:[line-height:1.25]',
        style: `min-height: ${minHeight}`,
      },
      handlePaste: (_view, event) => handleImageInsert(editorRef.current, event.clipboardData, event),
      handleDrop: (_view, event) => handleImageInsert(editorRef.current, (event as DragEvent).dataTransfer, event),
    },
  })

  editorRef.current = editor

  useEffect(() => {
    if (!editor) return
    if (value === lastHtml.current) return
    lastHtml.current = value
    editor.commands.setContent(value || '')
  }, [editor, value])

  return (
    <div className="rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <Toolbar editor={editor} limited={limitedToolbar} />
      <div className="border-t border-slate-100">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function Toolbar({ editor, limited = false }: { editor: Editor | null; limited?: boolean }) {
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const linkInputRef = useRef<HTMLInputElement>(null)

  if (!editor) return null

  function handleLinkClick() {
    if (editor!.isActive('link')) {
      setLinkUrl(editor!.getAttributes('link').href || '')
    } else {
      setLinkUrl('')
    }
    setShowLinkInput((v) => !v)
    setTimeout(() => linkInputRef.current?.focus(), 0)
  }

  function applyLink() {
    const url = linkUrl.trim()
    if (url) {
      editor!.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    } else {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run()
    }
    setShowLinkInput(false)
    setLinkUrl('')
  }

  function removeLink() {
    editor!.chain().focus().extendMarkRange('link').unsetLink().run()
    setShowLinkInput(false)
    setLinkUrl('')
  }

  const btn =(label: React.ReactNode, title: string, active: boolean, onClick: () => void) => (
    <button
      key={title}
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={`px-2 py-1 text-xs rounded transition-colors ${
        active
          ? 'bg-slate-200 text-slate-900'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div>
      <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5">
        {btn(<span className="font-bold">B</span>, 'Bold', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
        {btn(<span className="italic">I</span>, 'Italic', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
        {btn(<span className="underline">U</span>, 'Underline', editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run())}
        {btn(<span className="line-through">S</span>, 'Strikethrough', editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run())}
        {!limited && (
          <>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            {btn('H1', 'Heading 1', editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
            {btn('H2', 'Heading 2', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
            {btn('H3', 'Heading 3', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
            <div className="w-px h-4 bg-slate-200 mx-1" />
            {btn('• List', 'Bullet list', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
            {btn('1. List', 'Numbered list', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
            <div className="w-px h-4 bg-slate-200 mx-1" />
            {btn(<Code size={12} />, 'Code block', editor.isActive('codeBlock'), () => editor.chain().focus().toggleCodeBlock().run())}
            {btn(<Quote size={12} />, 'Blockquote', editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run())}
          </>
        )}
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <button
          type="button"
          title="Link"
          onMouseDown={(e) => { e.preventDefault(); handleLinkClick() }}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
            editor.isActive('link') || showLinkInput
              ? 'bg-slate-200 text-slate-900'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          <Link2 size={12} />
          Link
        </button>
      </div>

      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50">
          <Link2 size={12} className="text-slate-400 flex-shrink-0" />
          <input
            ref={linkInputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink() }
              if (e.key === 'Escape') { setShowLinkInput(false); editor.commands.focus() }
            }}
            placeholder="https://..."
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
              onMouseDown={(e) => { e.preventDefault(); removeLink() }}
              className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition-colors"
            >
              <Link2Off size={12} />
            </button>
          )}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setShowLinkInput(false); editor.commands.focus() }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
