'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import { marked } from 'marked'
import TurndownService from 'turndown'
import { sanitizeMarkdown } from '@/lib/sanitizeMarkdown'
import { Link2, Link2Off, Indent, Outdent } from 'lucide-react'
import { sinkListItem, liftListItem, splitListItem } from 'prosemirror-schema-list'

const turndown = new TurndownService({ bulletListMarker: '-', headingStyle: 'atx' })
turndown.keep(['u'])
turndown.addRule('strikethrough', {
  filter: ['s', 'del'],
  replacement: (content) => `~~${content}~~`,
})

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
  const lastMarkdown = useRef(value)
  const isApplyingFix = useRef(false)
  const fixTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorRef = useRef<Editor | null>(null)
  // Populated by LinkBubble so Cmd+K and the toolbar button can open it
  const openLinkBubbleRef = useRef<(() => void) | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false, code: false, heading: forceOrderedList ? false : undefined }),
      Underline,
      Placeholder.configure({ placeholder: '- ' }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: forceOrderedList ? toOrderedListHtml(value) : markdownToHtml(value),
    onUpdate({ editor }) {
      if (isApplyingFix.current) return
      const html = editor.getHTML()
      let md = htmlToMarkdown(html)
      if (forceOrderedListRef.current) {
        md = md.split('\n').filter(line => !/^\d+\.\s*$/.test(line)).join('\n').trim()
      }
      lastMarkdown.current = md
      onChangeRef.current(md)

      if (forceOrderedListRef.current) {
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

            const { doc } = editor.view.state
            let cursorPos = -1
            doc.forEach((topNode, topOffset) => {
              if (topNode.type.name === 'orderedList') {
                topNode.forEach((liNode, liOffset) => {
                  liNode.forEach((pNode, pOffset) => {
                    if (pNode.isTextblock) {
                      cursorPos = topOffset + 1 + liOffset + 1 + pOffset + 1 + pNode.content.size
                    }
                  })
                })
              }
            })
            if (cursorPos >= 0) {
              editor.commands.setTextSelection(cursorPos)
            } else {
              editor.commands.focus('end')
            }

            const newMd = htmlToMarkdown(editor.getHTML()).split('\n').filter(line => !/^\d+\.\s*$/.test(line)).join('\n').trim()
            lastMarkdown.current = newMd
            onChangeRef.current(newMd)
            isApplyingFix.current = false
          }, 0)
        }
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2 text-sm text-slate-800 [&_u]:underline [&_s]:line-through',
      },
      handleKeyDown(view, event) {
        // Cmd+K / Ctrl+K — open link bubble
        if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
          event.preventDefault()
          openLinkBubbleRef.current?.()
          return true
        }

        if (!forceOrderedListRef.current) return false

        const { state, dispatch } = view
        const listItemType = state.schema.nodes.listItem

        if (event.key === 'Tab') {
          event.preventDefault()
          if (listItemType) {
            if (event.shiftKey) {
              liftListItem(listItemType)(state, dispatch)
            } else {
              if (state.selection.$from.depth < 7) {
                sinkListItem(listItemType)(state, dispatch)
              }
            }
          }
          return true
        }

        if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
          const { $from } = state.selection

          let inListItem = false
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === 'listItem') { inListItem = true; break }
          }

          if (!inListItem) {
            event.preventDefault()
            setTimeout(() => {
              const ed = editorRef.current
              if (!ed) return
              ed.chain().focus('end').run()
              const { $from: $f } = ed.view.state.selection
              let nowInList = false
              for (let d = $f.depth; d > 0; d--) {
                if ($f.node(d).type.name === 'listItem') { nowInList = true; break }
              }
              if (nowInList) ed.chain().splitListItem('listItem').run()
            }, 0)
            return true
          }

          if (listItemType) {
            const isInEmptyListItem =
              $from.depth >= 2 &&
              $from.parent.type.name === 'paragraph' &&
              $from.parent.textContent === '' &&
              $from.node($from.depth - 1).type.name === 'listItem'
            if (isInEmptyListItem) {
              event.preventDefault()
              return true
            }
            event.preventDefault()
            splitListItem(listItemType)(state, dispatch)
            return true
          }
          return false
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

  useEffect(() => { editorRef.current = editor }, [editor])

  useEffect(() => {
    if (!editor || forceOrderedList) return
    if (value === lastMarkdown.current) return
    lastMarkdown.current = value
    const pos = editor.state.selection.anchor
    editor.commands.setContent(markdownToHtml(value))
    try { editor.commands.setTextSelection(Math.min(pos, editor.state.doc.content.size)) } catch {}
  }, [editor, value, forceOrderedList])

  return (
    <>
      <div className="rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <Toolbar
          editor={editor}
          forceOrderedList={forceOrderedList}
          onLinkClick={() => openLinkBubbleRef.current?.()}
        />
        <div className="border-t border-slate-100">
          <EditorContent editor={editor} />
        </div>
      </div>
      {editor && (
        <LinkBubble
          editor={editor}
          onRegisterOpen={(fn) => { openLinkBubbleRef.current = fn }}
        />
      )}
    </>
  )
}

function markdownToHtml(md: string): string {
  if (!md) return ''
  return marked.parse(sanitizeMarkdown(md), { async: false }) as string
}

function htmlToMarkdown(html: string): string {
  return sanitizeMarkdown(turndown.turndown(html).trim())
}

function fixToOrderedList(html: string): string {
  const md = htmlToMarkdown(html)
  const lines = md.split('\n').filter((l) => l.trim())
  if (!lines.length) return '<ol><li><p></p></li></ol>'
  const fixed = lines.map((l) => {
    if (/^\s*\d+\./.test(l)) return l
    if (/^\s*[*\-+] /.test(l)) return l.replace(/^(\s*)[*\-+] /, '$11. ')
    const escaped = l.replace(/^(#{1,6}) /, (_, hashes) =>
      hashes.split('').map(() => '\\#').join('') + ' '
    )
    return '1. ' + escaped
  }).join('\n')
  return markdownToHtml(fixed) || '<ol><li><p></p></li></ol>'
}

// ─── Toolbar ────────────────────────────────────────────────────────────────

interface ToolbarProps {
  editor: Editor | null
  forceOrderedList?: boolean
  onLinkClick: () => void
}

function Toolbar({ editor, forceOrderedList, onLinkClick }: ToolbarProps) {
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
    <div className="flex items-center gap-0.5 px-2 py-1.5">
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
        disabled={!editor.can().sinkListItem('listItem') || editor.state.selection.$from.depth >= 7}
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
        title="Insert link (⌘K)"
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
    </div>
  )
}

// ─── Link bubble ─────────────────────────────────────────────────────────────

interface LinkBubbleProps {
  editor: Editor
  onRegisterOpen: (fn: () => void) => void
}

type BubbleMode = 'hidden' | 'toolbar' | 'input' | 'hover'

const BUBBLE_MARGIN = 8

function clampBubblePos(rawLeft: number, rawTop: number, bubbleEl: HTMLDivElement | null) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const bw = bubbleEl?.offsetWidth ?? 360
  const bh = bubbleEl?.offsetHeight ?? 40

  const left = Math.max(bw / 2 + BUBBLE_MARGIN, Math.min(vw - bw / 2 - BUBBLE_MARGIN, rawLeft))
  const showBelow = rawTop - bh - BUBBLE_MARGIN < 0
  const top = showBelow ? rawTop + 28 : rawTop - BUBBLE_MARGIN

  return { left, top, showBelow }
}

function LinkBubble({ editor, onRegisterOpen }: LinkBubbleProps) {
  const [mode, setMode] = useState<BubbleMode>('hidden')
  const [inputUrl, setInputUrl] = useState('')
  const [rawPos, setRawPos] = useState({ top: 0, left: 0 })
  // Force re-render when editor marks change (so B/I/U/S active states stay current)
  const [, forceUpdate] = useState(0)
  const savedRawPos = useRef({ top: 0, left: 0 })
  const bubbleRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const modeRef = useRef<BubbleMode>('hidden')
  modeRef.current = mode
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoveredLinkPosRef = useRef<number | null>(null)
  const hoveredHrefRef = useRef('')

  const scheduleHide = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      if (modeRef.current === 'hover') setMode('hidden')
    }, 150)
  }, [])

  const cancelHide = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }, [])

  const computeRawPos = useCallback(() => {
    const { selection } = editor.state
    const { from, to } = selection
    try {
      const s = editor.view.coordsAtPos(from)
      const e2 = editor.view.coordsAtPos(to)
      return { top: Math.min(s.top, e2.top), left: (s.left + e2.right) / 2 }
    } catch {
      return null
    }
  }, [editor])

  const enterInput = useCallback(() => {
    // If in hover mode, move cursor into the link first so extendMarkRange works
    if (modeRef.current === 'hover' && hoveredLinkPosRef.current !== null) {
      editor.commands.setTextSelection(hoveredLinkPosRef.current)
    }
    const p = computeRawPos() ?? savedRawPos.current
    setRawPos(p)
    savedRawPos.current = p
    const href = modeRef.current === 'hover'
      ? hoveredHrefRef.current
      : (editor.getAttributes('link').href as string | undefined) ?? ''
    setInputUrl(href)
    setMode('input')
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [editor, computeRawPos])

  const removeLink = useCallback(() => {
    if (modeRef.current === 'hover' && hoveredLinkPosRef.current !== null) {
      editor.commands.setTextSelection(hoveredLinkPosRef.current)
    }
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setMode('hidden')
  }, [editor])

  const applyLink = useCallback(() => {
    const url = inputUrl.trim()
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    }
    setMode('hidden')
  }, [editor, inputUrl])

  // Register open fn for Cmd+K and toolbar button
  useEffect(() => {
    onRegisterOpen(enterInput)
  }, [onRegisterOpen, enterInput])

  // Re-render on transactions so formatting active states stay fresh
  useEffect(() => {
    function onTransaction() {
      if (modeRef.current !== 'hidden') forceUpdate(n => n + 1)
    }
    editor.on('transaction', onTransaction)
    return () => { editor.off('transaction', onTransaction) }
  }, [editor])

  // Show bubble on text selection or cursor-in-link
  useEffect(() => {
    function onSelectionUpdate() {
      const { selection } = editor.state
      const isLink = editor.isActive('link')
      const hasSelection = !selection.empty

      if (!hasSelection && !isLink) {
        if (modeRef.current !== 'input') setMode('hidden')
        return
      }
      const p = computeRawPos()
      if (p) { setRawPos(p); savedRawPos.current = p }
      if (modeRef.current !== 'input') setMode('toolbar')
    }
    editor.on('selectionUpdate', onSelectionUpdate)
    return () => { editor.off('selectionUpdate', onSelectionUpdate) }
  }, [editor, computeRawPos])

  // Hover over link → show bubble; leave link → schedule hide
  useEffect(() => {
    const el = editor.view.dom

    function onMouseOver(e: MouseEvent) {
      const linkEl = (e.target as HTMLElement).closest('a[href]')
      if (!linkEl) return
      // Don't override an active selection or input
      if (modeRef.current === 'toolbar' || modeRef.current === 'input') return
      cancelHide()
      const rect = linkEl.getBoundingClientRect()
      const p = { top: rect.top, left: rect.left + rect.width / 2 }
      setRawPos(p)
      savedRawPos.current = p
      hoveredHrefRef.current = (linkEl as HTMLAnchorElement).href || linkEl.getAttribute('href') || ''
      const coords = { left: rect.left + 2, top: rect.top + rect.height / 2 }
      const pmPos = editor.view.posAtCoords(coords)
      hoveredLinkPosRef.current = pmPos?.pos ?? null
      setMode('hover')
    }

    function onMouseOut(e: MouseEvent) {
      if (modeRef.current !== 'hover') return
      const linkEl = (e.target as HTMLElement).closest('a[href]')
      if (!linkEl) return
      const related = e.relatedTarget as HTMLElement | null
      if (related && linkEl.contains(related)) return
      scheduleHide()
    }

    el.addEventListener('mouseover', onMouseOver)
    el.addEventListener('mouseout', onMouseOut)
    return () => {
      el.removeEventListener('mouseover', onMouseOver)
      el.removeEventListener('mouseout', onMouseOut)
    }
  }, [editor, cancelHide, scheduleHide])

  // Intercept link clicks: prevent navigation, show bubble instead
  useEffect(() => {
    const el = editor.view.dom
    function handleClick(e: MouseEvent) {
      const link = (e.target as HTMLElement).closest('a[href]')
      if (!link) return
      e.preventDefault()
      setTimeout(() => {
        if (editor.isActive('link')) {
          const p = computeRawPos()
          if (p) { setRawPos(p); savedRawPos.current = p }
          if (modeRef.current !== 'input') setMode('toolbar')
        }
      }, 0)
    }
    el.addEventListener('click', handleClick)
    return () => el.removeEventListener('click', handleClick)
  }, [editor, computeRawPos])

  // Hide when editor loses focus (unless focus went to bubble)
  useEffect(() => {
    function onBlur() {
      setTimeout(() => {
        if (!bubbleRef.current?.contains(document.activeElement)) {
          setMode('hidden')
        }
      }, 50)
    }
    editor.on('blur', onBlur)
    return () => { editor.off('blur', onBlur) }
  }, [editor])

  // Hide on click outside both editor and bubble
  useEffect(() => {
    if (mode === 'hidden') return
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node
      if (!bubbleRef.current?.contains(t) && !editor.view.dom.contains(t)) {
        setMode('hidden')
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [mode, editor])

  if (mode === 'hidden') return null

  const isLink = editor.isActive('link')
  const existingHref = editor.getAttributes('link').href as string | undefined
  const activeRawPos = mode === 'input' ? savedRawPos.current : rawPos
  const { left, top, showBelow } = clampBubblePos(activeRawPos.left, activeRawPos.top, bubbleRef.current)

  // Which view to render
  const showLinkView = mode === 'hover' || (mode === 'toolbar' && editor.state.selection.empty && isLink)
  const showFormatBar = mode === 'toolbar' && !editor.state.selection.empty
  const displayHref = mode === 'hover' ? hoveredHrefRef.current : existingHref

  const fmtBtn = (label: React.ReactNode, title: string, active: boolean, onClick: () => void) => (
    <button
      key={title}
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={`px-1.5 py-0.5 rounded transition-colors text-xs ${
        active ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div
      ref={bubbleRef}
      style={{
        position: 'fixed',
        top,
        left,
        transform: showBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
        zIndex: 9999,
      }}
      className="bg-white border border-slate-200 rounded-lg shadow-lg flex items-center gap-0.5 px-2 py-1.5 text-xs"
      onMouseEnter={cancelHide}
      onMouseLeave={() => { if (modeRef.current === 'hover') scheduleHide() }}
    >
      {mode === 'input' ? (
        <>
          <Link2 size={12} className="text-slate-400 flex-shrink-0 mr-0.5" />
          <input
            ref={inputRef}
            type="url"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink() }
              if (e.key === 'Escape') { setMode('hidden'); editor.commands.focus() }
            }}
            placeholder="Paste link"
            className="text-xs border border-slate-200 rounded px-2 py-1 w-44 focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyLink() }}
            className="ml-0.5 px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-xs"
          >
            Apply
          </button>
          {(isLink || !!inputUrl) && (
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
            onMouseDown={(e) => { e.preventDefault(); setMode('hidden'); editor.commands.focus() }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </>
      ) : showLinkView ? (
        <>
          <Link2 size={12} className="text-blue-500 flex-shrink-0" />
          <span className="text-slate-600 max-w-[160px] truncate mx-1">{displayHref}</span>
          <div className="w-px h-3.5 bg-slate-200 mx-0.5" />
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); enterInput() }}
            className="px-1.5 py-0.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
          >
            Edit
          </button>
          <button
            type="button"
            title="Remove link"
            onMouseDown={(e) => { e.preventDefault(); removeLink() }}
            className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition-colors"
          >
            <Link2Off size={12} />
          </button>
        </>
      ) : showFormatBar ? (
        <>
          {fmtBtn(<span className="font-bold">B</span>, 'Bold', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
          {fmtBtn(<span className="italic">I</span>, 'Italic', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
          {fmtBtn(<span className="underline">U</span>, 'Underline', editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run())}
          {fmtBtn(<span className="line-through">S</span>, 'Strikethrough', editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run())}
          <div className="w-px h-3.5 bg-slate-200 mx-0.5" />
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); enterInput() }}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
              isLink ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Link2 size={12} />
            Link
          </button>
        </>
      ) : (
        // Fallback: plain link button (empty selection, no active link — shouldn't normally show)
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); enterInput() }}
          className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 px-1 py-0.5 rounded hover:bg-slate-100 transition-colors"
        >
          <Link2 size={12} />
          Link
        </button>
      )}
    </div>
  )
}
