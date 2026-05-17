'use client'

import { useState, KeyboardEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface HighlightsInputProps {
  value: string[]
  onChange: (highlights: string[]) => void
}

export function HighlightsInput({ value, onChange }: HighlightsInputProps) {
  const [inputValue, setInputValue] = useState('')

  function addHighlight() {
    const trimmed = inputValue.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
      setInputValue('')
    }
  }

  function removeHighlight(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addHighlight()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a highlight and press Enter"
          className="h-9 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addHighlight}
          className="h-9 px-3 text-sm flex-shrink-0"
        >
          Add
        </Button>
      </div>

      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((highlight, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2 group"
            >
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
              <span className="flex-1">{highlight}</span>
              <button
                type="button"
                onClick={() => removeHighlight(i)}
                className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                aria-label="Remove highlight"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
