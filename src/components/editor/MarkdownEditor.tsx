'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { marked } from 'marked'
import TurndownService from 'turndown'
import { Link2, Link2Off, Indent, Outdent } from 'lucide-react'

const turndown = new TurndownService({ bulletListMarker: '-', headingStyle: 'atx' })

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [linkPopover, setLinkPopover] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: '- ' }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: markdownToHtml(value),
    onUpdate({ editor }) {
      const html = editor.getHTML()
      const md = htmlToMarkdown(html)
      onChangeRef.current(md)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2 text-sm text-slate-800',
      },
    },
  })

  // Sync external value changes (e.g. initial load of edit form)
  const lastMarkdown = useRef(value)
  useEffect(() => {
    if (!editor || value === lastMarkdown.current) return
    lastMarkdown.current = value
    const pos = editor.state.selection.anchor
    editor.commands.setContent(markdownToHtml(value))
    try { editor.commands.setTextSelection(Math.min(pos, editor.state.doc.content.size)) } catch {}
  }, [editor, value])

  const openLinkPopover = useCallback(() => {
    if (!editor) return
    const existing = editor.getAttributes('link').href as string | undefined
    setLinkUrl(existing || 'https://')
    setLinkPopover(true)
  }, [editor])

  const applyLink = useCallback(() => {
    if (!editor) return
    const url = linkUrl.trim()
    if (url && url !== 'https://') {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    }
    setLinkPopover(false)
  }, [editor, linkUrl])

  const removeLink = useCallback(() => {
    if (!editor) return
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setLinkPopover(false)
  }, [editor])

  return (
    <div className="rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <Toolbar
        editor={editor}
        onLinkClick={openLinkPopover}
        linkPopover={linkPopover}
        linkUrl={linkUrl}
        setLinkUrl={setLinkUrl}
        onLinkApply={applyLink}
        onLinkRemove={removeLink}
        onLinkClose={() => setLinkPopover(false)}
      />
      <div className="border-t border-slate-100">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function markdownToHtml(md: string): string {
  if (!md) return ''
  return marked.parse(md, { async: false }) as string
}

function htmlToMarkdown(html: string): string {
  return turndown.turndown(html).trim()
}

interface ToolbarProps {
  editor: Editor | null
  onLinkClick: () => void
  linkPopover: boolean
  linkUrl: string
  setLinkUrl: (v: string) => void
  onLinkApply: () => void
  onLinkRemove: () => void
  onLinkClose: () => void
}

function Toolbar({ editor, onLinkClick, linkPopover, linkUrl, setLinkUrl, onLinkApply, onLinkRemove, onLinkClose }: ToolbarProps) {
  if (!editor) return null

  const btn = (label: string, title: string, active: boolean, onClick: () => void) => (
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

  const isLinkActive = editor.isActive('link')

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 relative">
      {btn('B', 'Bold', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
      {btn('I', 'Italic', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
      <div className="w-px h-4 bg-slate-200 mx-1" />
      {btn('1. List', 'Numbered list', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
      <button
        type="button"
        title="Indent (Tab)"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().sinkListItem('listItem').run() }}
        disabled={!editor.can().sinkListItem('listItem')}
        className="px-2 py-1 rounded transition-colors text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Indent size={13} />
      </button>
      <button
        type="button"
        title="Outdent (Shift+Tab)"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().liftListItem('listItem').run() }}
        disabled={!editor.can().liftListItem('listItem')}
        className="px-2 py-1 rounded transition-colors text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Outdent size={13} />
      </button>
      <div className="w-px h-4 bg-slate-200 mx-1" />

      {/* Link button */}
      <button
        type="button"
        title="Insert link"
        onMouseDown={(e) => { e.preventDefault(); onLinkClick() }}
        className={`px-2 py-1 rounded transition-colors flex items-center gap-1 text-xs ${
          isLinkActive
            ? 'bg-slate-200 text-slate-900'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
        }`}
      >
        <Link2 size={12} />
        Link
      </button>

      {/* Link popover */}
      {linkPopover && (
        <div className="absolute left-0 top-full mt-1 z-50 flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg shadow-lg px-2.5 py-2">
          <input
            autoFocus
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); onLinkApply() }
              if (e.key === 'Escape') onLinkClose()
            }}
            placeholder="https://example.com"
            className="text-xs border border-slate-200 rounded px-2 py-1 w-56 focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onLinkApply() }}
            className="px-2.5 py-1 text-xs bg-slate-900 text-white rounded hover:bg-slate-700 transition-colors"
          >
            Apply
          </button>
          {isLinkActive && (
            <button
              type="button"
              title="Remove link"
              onMouseDown={(e) => { e.preventDefault(); onLinkRemove() }}
              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
            >
              <Link2Off size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
