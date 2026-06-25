'use client'

import * as React from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format, parse, isValid } from 'date-fns'
import 'react-day-picker/style.css'

import { cn } from '@/lib/utils'

const FMT = 'yyyy-MM-dd'

/** `yyyy-MM-dd` -> Date, or undefined when empty/invalid. */
function toDate(value: string): Date | undefined {
  if (!value) return undefined
  const d = parse(value, FMT, new Date())
  return isValid(d) ? d : undefined
}

/** Date -> `yyyy-MM-dd`, or '' when undefined. */
function toStr(d: Date | undefined): string {
  return d ? format(d, FMT) : ''
}

interface DateRangePickerProps {
  /** Selected range, as `yyyy-MM-dd` strings ('' when unset). */
  from: string
  to: string
  /** Fires only when the user clicks Apply with a complete range. */
  onChange: (from: string, to: string) => void
  /** Latest selectable day, `yyyy-MM-dd` (defaults to today). */
  max?: string
  align?: 'start' | 'end'
  /** Highlight the trigger as the active range source. */
  active?: boolean
  /** Highlight the trigger as invalid (safety-net styling). */
  invalid?: boolean
}

/**
 * A two-month range calendar in a popover — click a start day, hover to preview,
 * click an end day, then Apply. No typing required. Selection is held as a draft
 * inside the popover and only committed via the Apply button.
 */
export function DateRangePicker({
  from,
  to,
  onChange,
  max,
  align = 'end',
  active = false,
  invalid = false,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<DateRange | undefined>()

  const maxDate = max ? toDate(max) : new Date()

  // Seed the draft from the committed value each time the popover opens.
  React.useEffect(() => {
    if (open) setDraft({ from: toDate(from), to: toDate(to) })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const fromDate = toDate(from)
  const toDateVal = toDate(to)
  const label =
    fromDate && toDateVal
      ? `${format(fromDate, 'd MMM')} – ${format(toDateVal, 'd MMM yyyy')}`
      : fromDate
        ? `${format(fromDate, 'd MMM yyyy')} – …`
        : 'Select dates'

  const canApply = Boolean(draft?.from && draft?.to)

  function apply() {
    if (!draft?.from || !draft?.to) return
    onChange(toStr(draft.from), toStr(draft.to))
    setOpen(false)
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm transition-colors',
            invalid
              ? 'border-2 border-red-500 bg-red-50 text-red-700'
              : active
                ? 'border-[#1C1512] text-stone-700'
                : 'border-stone-200 text-stone-600 hover:border-stone-300'
          )}
        >
          <CalendarIcon className="h-4 w-4 text-stone-400" />
          <span className="tabular-nums">{label}</span>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={8}
          className="z-[60] rounded-xl border border-stone-200 bg-card p-3 text-stone-700 shadow-xl"
          style={
            {
              '--rdp-accent-color': '#1C1512',
              '--rdp-accent-background-color': '#f1efed',
              '--rdp-range_middle-background-color': '#f1efed',
              '--rdp-range_start-color': '#ffffff',
              '--rdp-range_end-color': '#ffffff',
              '--rdp-day-width': '2.25rem',
              '--rdp-day-height': '2.25rem',
            } as React.CSSProperties
          }
        >
          <DayPicker
            mode="range"
            numberOfMonths={2}
            selected={draft}
            onSelect={setDraft}
            disabled={maxDate ? { after: maxDate } : undefined}
            defaultMonth={draft?.from ?? maxDate}
            showOutsideDays
          />
          <div className="mt-2 flex items-center justify-between border-t border-stone-100 pt-2.5">
            <button
              type="button"
              onClick={() => setDraft(undefined)}
              className="rounded-md px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
            >
              Clear
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-1 text-sm text-stone-500 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={apply}
                disabled={!canApply}
                className="rounded-md bg-[#1C1512] px-4 py-1 text-sm font-medium text-white transition-colors hover:bg-[#2c211b] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
