/**
 * Centralised, validated date handling for every date/time selection in the UI.
 *
 * Goals:
 *  - One place owns parsing, validation and timezone conversion (no more
 *    hand-rolled offset math duplicated across forms).
 *  - Nothing here ever throws on bad input — invalid values resolve to `null`
 *    (for converters) or `false` (for validators) so callers can block submit.
 *  - Singapore time (SGT, UTC+8, no DST) is represented as a fixed offset,
 *    which is correct year-round for that zone.
 *
 * Input string shapes handled:
 *  - date-only  ........ `yyyy-MM-dd`        (<input type="date">)
 *  - month  ............ `yyyy-MM`           (<input type="month"> / update period)
 *  - datetime-local  ... `yyyy-MM-ddTHH:mm`  (<input type="datetime-local">)
 */
import { isValid, parse, format } from 'date-fns'

export const SGT_OFFSET_MS = 8 * 60 * 60 * 1000

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MONTH_RE = /^\d{4}-\d{2}$/
const DATETIME_LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

const DATETIME_LOCAL_FMT = "yyyy-MM-dd'T'HH:mm"

// ---------------------------------------------------------------------------
// Validators — shape + real-calendar-date check (rejects e.g. 2026-02-30, 13th month)
// ---------------------------------------------------------------------------

export function isValidDateInput(value: string): boolean {
  return DATE_RE.test(value) && isValid(parse(value, 'yyyy-MM-dd', new Date()))
}

export function isValidMonthInput(value: string): boolean {
  return MONTH_RE.test(value) && isValid(parse(value, 'yyyy-MM', new Date()))
}

export function isValidDateTimeLocal(value: string): boolean {
  return DATETIME_LOCAL_RE.test(value) && isValid(parse(value, DATETIME_LOCAL_FMT, new Date()))
}

// ---------------------------------------------------------------------------
// SGT (UTC+8) wall-time <-> UTC instant
// ---------------------------------------------------------------------------

/** SGT wall-time `yyyy-MM-ddTHH:mm` -> UTC ISO instant, or `null` if invalid. */
export function sgtInputToUtcIso(value: string): string | null {
  if (!isValidDateTimeLocal(value)) return null
  // Treat the wall time as if it were UTC, then back off 8h to the real instant.
  const utc = new Date(new Date(`${value}:00Z`).getTime() - SGT_OFFSET_MS)
  return isValid(utc) ? utc.toISOString() : null
}

/** UTC instant -> SGT wall-time `yyyy-MM-ddTHH:mm` for a datetime-local input. */
export function utcToSgtInput(iso: string | Date | null | undefined): string {
  if (iso == null) return ''
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (!isValid(d)) return ''
  return new Date(d.getTime() + SGT_OFFSET_MS).toISOString().slice(0, 16)
}

/** Current moment as an SGT wall-time string — use for `min=` on schedule inputs. */
export function nowSgtInput(): string {
  return new Date(Date.now() + SGT_OFFSET_MS).toISOString().slice(0, 16)
}

/** True when an SGT wall-time input refers to a moment strictly in the future. */
export function isFutureSgtInput(value: string): boolean {
  const iso = sgtInputToUtcIso(value)
  return iso != null && new Date(iso).getTime() > Date.now()
}

// ---------------------------------------------------------------------------
// Local (browser-timezone) datetime-local helpers
// ---------------------------------------------------------------------------

/** Current moment as a local wall-time string — use for `min=` on local inputs. */
export function nowDateTimeLocal(): string {
  return format(new Date(), DATETIME_LOCAL_FMT)
}

/** True when a local datetime-local input refers to a moment strictly in the future. */
export function isFutureDateTimeLocal(value: string): boolean {
  if (!isValidDateTimeLocal(value)) return false
  return parse(value, DATETIME_LOCAL_FMT, new Date()).getTime() > Date.now()
}

// ---------------------------------------------------------------------------
// Safe formatters for seeding inputs from stored values (never throw)
// ---------------------------------------------------------------------------

/** ISO/Date -> `yyyy-MM` for a month input; falls back to the current month. */
export function toMonthInput(iso: string | Date | null | undefined): string {
  const d = iso != null ? new Date(iso) : new Date()
  return format(isValid(d) ? d : new Date(), 'yyyy-MM')
}

/** ISO/Date -> local `yyyy-MM-ddTHH:mm`; falls back to now. */
export function toDateTimeLocalInput(iso: string | Date | null | undefined): string {
  const d = iso != null ? new Date(iso) : new Date()
  return format(isValid(d) ? d : new Date(), DATETIME_LOCAL_FMT)
}

/** Today as `yyyy-MM-dd` — use for `max=` on backward-looking date inputs. */
export function todayDateInput(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

// ---------------------------------------------------------------------------
// Date-only range helpers (analytics dashboard custom range)
// ---------------------------------------------------------------------------

/** date-only `yyyy-MM-dd` -> ISO at local start-of-day, or `null` if invalid. */
export function dateInputToStartIso(value: string): string | null {
  if (!isValidDateInput(value)) return null
  return new Date(`${value}T00:00:00`).toISOString()
}

/** date-only `yyyy-MM-dd` -> ISO at local end-of-day, or `null` if invalid. */
export function dateInputToEndIso(value: string): string | null {
  if (!isValidDateInput(value)) return null
  return new Date(`${value}T23:59:59.999`).toISOString()
}

/** True when both date-only inputs are valid and `from` is on/before `to`. */
export function isValidDateRange(from: string, to: string): boolean {
  if (!isValidDateInput(from) || !isValidDateInput(to)) return false
  return new Date(`${from}T00:00:00`).getTime() <= new Date(`${to}T00:00:00`).getTime()
}
