'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import { marked } from 'marked'
import TurndownService from 'turndown'
import { Link2, Link2Off, Indent, Outdent } from 'lucide-react'
import { sinkListItem, liftListItem } from 'prosemirror-schema-list'

const turndown = new TurndownService({ bulletListMarker: '-', headingStyle: 'atx' })

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  forceOrderedList?: boolean
}

function toOrderedListHtml(md: string): string {
  if (!md) return '<ol><li><p></p></li></ol>'
  const converted = md.replace(/^[*\-+] /gm, '1. ')
  return markdownToHtml(converted) || '<ol><li><p></p></li></ol>'
}

export function MarkdownEditor({ value, onChange, forceOrderedList = false }: MarkdownEditorProps) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const forceOrderedListRef = useRef(forceOrderedList)
  forceOrderedListRef.current = forceOrderedList
  // Must be declared before useEditor so onUpdate can update it via closure
  const lastMarkdown = useRef(value)
  const isApplyingFix = useRef(false)
  const fixTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [linkPopover, setLinkPopover] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: '- ' }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: forceOrderedList ? toOrderedListHtml(value) : markdownToHtml(value),
    onUpdate({ editor }) {
      if (isApplyingFix.current) return
      const html = editor.getHTML()
      const md = htmlToMarkdown(html)
      lastMarkdown.current = md
      onChangeRef.current(md)

      if (forceOrderedListRef.current) {
        // Only fix when real (non-whitespace) text has escaped outside the ordered list.
        // Ignoring empty/whitespace nodes prevents transient nodes created by input rules
        // (e.g. StarterKit's list input rules firing on space) from triggering setContent,
        // which would steal focus and make space presses scroll the page instead of type.
        let hasRealOutsideContent = false
        editor.state.doc.forEach((node) => {
          if (node.type.name !== 'orderedList' && node.textContent.trim()) {
            hasRealOutsideContent = true
          }
        })
        if (hasRealOutsideContent) {
          if (fixTimeoutRef.current) clearTimeout(fixTimeoutRef.current)
          fixTimeoutRef.current = setTimeout(() => {
            fixTimeoutRef.current = null
            isApplyingFix.current = true
            const fixed = fixToOrderedList(editor.getHTML())
            editor.commands.setContent(fixed)
            editor.commands.focus('end')
            const newMd = htmlToMarkdown(editor.getHTML())
            lastMarkdown.current = newMd
            onChangeRef.current(newMd)
            isApplyingFix.current = false
          }, 0)
        }
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2 text-sm text-slate-800',
      },
      handleKeyDown(view, event) {
        if (!forceOrderedListRef.current) return false

        const { state, dispatch } = view
        const listItemType = state.schema.nodes.listItem

        if (event.key === 'Tab') {
          event.preventDefault()
          if (listItemType) {
            if (event.shiftKey) {
              liftListItem(listItemType)(state, dispatch)
            } else {
              sinkListItem(listItemType)(state, dispatch)
            }
          }
          return true
        }

        if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
          if (listItemType) {
            const { $from } = state.selection
            const isInEmptyListItem =
              $from.depth >= 2 &&
              $from.parent.type.name === 'paragraph' &&
              $from.parent.textContent === '' &&
              $from.node($from.depth - 1).type.name === 'listItem'
            if (isInEmptyListItem) {
              event.preventDefault()
              return true  // eat Enter in empty list item — prevents exiting the list
            }
          }
          return false  // let TipTap's built-in splitListItem handle normal Enter
        }

        if (event.key === 'Backspace') {
          const { selection } = state
          if (!selection.empty) return false
          const { $from } = selection
          if (
            $from.depth >= 2 &&
            $from.parentOffset === 0 &&
            $from.node($from.depth - 2).type.name === 'orderedList' &&
            $from.index($from.depth - 2) === 0
          ) return true
        }

        return false
      },
    },
  })

  // Sync external value changes — skipped for forceOrderedList editors because
  // they initialize from the content prop and calling setContent on every onChange
  // re-render causes the add-item loop (stale closure in useEditor's onUpdate means
  // lastMarkdown.current updates don't reliably prevent the effect from running).
  useEffect(() => {
    if (!editor || forceOrderedList) return
    if (value === lastMarkdown.current) return
    lastMarkdown.current = value
    const pos = editor.state.selection.anchor
    editor.commands.setContent(markdownToHtml(value))
    try { editor.commands.setTextSelection(Math.min(pos, editor.state.doc.content.size)) } catch {}
  }, [editor, value, forceOrderedList])

  useEffect(() => {
    if (!editor) return
    const el = editor.view.dom
    function handleClick(e: MouseEvent) {
      if ((e.target as HTMLElement).closest('a[href]')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    el.addEventListener('click', handleClick)
    return () => el.removeEventListener('click', handleClick)
  }, [editor])

  const openLinkPopover = useCallback(() => {
    if (!editor) return
    const existing = editor.getAttributes('link').href as string | undefined
    setLinkUrl(existing || 'https://')
    const { from, to } = editor.state.selection
    setLinkText(editor.state.doc.textBetween(from, to))
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
        linkText={linkText}
        setLinkUrl={setLinkUrl}
        onLinkApply={applyLink}
        onLinkRemove={removeLink}
        onLinkClose={() => setLinkPopover(false)}
        forceOrderedList={forceOrderedList}
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

function fixToOrderedList(html: string): string {
  const md = htmlToMarkdown(html)
  const lines = md.split('\n').filter((l) => l.trim())
  if (!lines.length) return '<ol><li><p></p></li></ol>'
  const fixed = lines.map((l) => {
    if (/^\d+\./.test(l)) return l
    if (/^[*\-+] /.test(l)) return '1. ' + l.replace(/^[*\-+] /, '')
    return '1. ' + l
  }).join('\n')
  return markdownToHtml(fixed) || '<ol><li><p></p></li></ol>'
}

interface ToolbarProps {
  editor: Editor | null
  onLinkClick: () => void
  linkPopover: boolean
  linkUrl: string
  linkText: string
  setLinkUrl: (v: string) => void
  onLinkApply: () => void
  onLinkRemove: () => void
  onLinkClose: () => void
  forceOrderedList?: boolean
}

function Toolbar({ editor, onLinkClick, linkPopover, linkUrl, linkText, setLinkUrl, onLinkApply, onLinkRemove, onLinkClose, forceOrderedList }: ToolbarProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!linkPopover) return
    function handleMouseDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onLinkClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [linkPopover, onLinkClose])

  if (!editor) return null

  const btn = (label: React.ReactNode, title: string, active: boolean, onClick: () => void) => (
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
      {btn(<span className="font-bold">B</span>, 'Bold', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
      {btn(<span className="italic">I</span>, 'Italic', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
      {btn(<span className="underline">U</span>, 'Underline', editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run())}
      {btn(<span className="line-through">S</span>, 'Strikethrough', editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run())}
      <div className="w-px h-4 bg-slate-200 mx-1" />
      {!forceOrderedList && btn('1. List', 'Numbered list', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
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
        <div ref={popoverRef} className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2.5 min-w-[280px]">
          {linkText && (
            <p className="text-xs text-slate-500 mb-2 truncate">
              Text: <span className="font-medium text-slate-700">{linkText}</span>
            </p>
          )}
          <div className="flex items-center gap-1.5">
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
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onLinkClose() }}
            className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
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
        </div>
      )}
    </div>
  )
}
