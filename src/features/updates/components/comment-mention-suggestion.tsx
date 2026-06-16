'use client'

import { ReactRenderer } from '@tiptap/react'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { SuggestionOptions, SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'

export interface MentionItem {
  id: string
  label: string
  email?: string
}

interface MentionListHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

const MentionList = forwardRef<MentionListHandle, SuggestionProps<MentionItem>>(
  function MentionList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => setSelectedIndex(0), [items])

    const selectItem = (index: number) => {
      const item = items[index]
      if (item) command(item)
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (items.length === 0) return false
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % items.length)
          return true
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          selectItem(selectedIndex)
          return true
        }
        return false
      },
    }))

    if (items.length === 0) return null

    return (
      <div className="mention-dropdown">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`mention-dropdown-item${index === selectedIndex ? ' is-selected' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault()
              selectItem(index)
            }}
          >
            <span className="mention-dropdown-name">{item.label}</span>
            {item.email && item.email !== item.label && (
              <span className="mention-dropdown-email"> - {item.email}</span>
            )}
          </button>
        ))}
      </div>
    )
  }
)

// Tiptap mention suggestion: fetches the Management/AEO mentionable users and
// renders a lightweight dropdown positioned at the caret (no extra popup dep).
export const mentionSuggestion: Omit<SuggestionOptions<MentionItem>, 'editor'> = {
  items: async ({ query }) => {
    try {
      const res = await fetch(`/api/users/for-mention?q=${encodeURIComponent(query)}`)
      if (!res.ok) return []
      return (await res.json()) as MentionItem[]
    } catch {
      return []
    }
  },
  render: () => {
    let component: ReactRenderer<MentionListHandle, SuggestionProps<MentionItem>> | null = null
    let wrapper: HTMLDivElement | null = null

    const position = (clientRect?: (() => DOMRect | null) | null) => {
      if (!wrapper || !clientRect) return
      const rect = clientRect()
      if (!rect) return
      // Anchor the dropdown's BOTTOM just above the @ tag and let it grow
      // upward. Using `fixed` + the caret's viewport rect keeps it pinned to the
      // tag; the list scrolls internally (max-height) rather than the box moving.
      wrapper.style.position = 'fixed'
      wrapper.style.top = 'auto'
      wrapper.style.bottom = `${window.innerHeight - rect.top + 4}px`
      wrapper.style.zIndex = '60'
      // Clamp horizontally so the dropdown never runs off either screen edge
      // when the @ tag sits near the right margin.
      const margin = 8
      const width = wrapper.offsetWidth || 0
      const maxLeft = window.innerWidth - width - margin
      const left = Math.max(margin, Math.min(rect.left, maxLeft))
      wrapper.style.left = `${left}px`
    }

    return {
      onStart: (props) => {
        component = new ReactRenderer(MentionList, { props, editor: props.editor })
        wrapper = document.createElement('div')
        wrapper.appendChild(component.element)
        document.body.appendChild(wrapper)
        position(props.clientRect)
      },
      onUpdate: (props) => {
        component?.updateProps(props)
        position(props.clientRect)
      },
      onKeyDown: (props) => {
        if (props.event.key === 'Escape') return true
        return component?.ref?.onKeyDown(props) ?? false
      },
      onExit: () => {
        wrapper?.remove()
        component?.destroy()
        wrapper = null
        component = null
      },
    }
  },
}
