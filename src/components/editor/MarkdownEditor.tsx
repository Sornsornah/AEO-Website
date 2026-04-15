'use client'

import dynamic from 'next/dynamic'
import { useRef } from 'react'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/uploads', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Upload failed')
        return
      }
      const { url } = await res.json()
      const imageMarkdown = `\n![${file.name}](${url})\n`
      onChange(value + imageMarkdown)
    } catch {
      alert('Upload failed')
    } finally {
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div data-color-mode="light">
      <div className="flex justify-end mb-1.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-md px-2.5 py-1 transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <circle cx="5.5" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M1 11l3.5-3.5L7 10l2.5-2.5L15 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Insert image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || '')}
        height={400}
        preview="edit"
      />
    </div>
  )
}
