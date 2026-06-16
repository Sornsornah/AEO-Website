import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import slugifyLib from 'slugify'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), 'MMMM d, yyyy')
}

export function formatDateShort(date: Date | string): string {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatRelativeDate(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatMonthYear(date: Date | string): string {
  return format(new Date(date), 'MMMM yyyy')
}

export function slugify(text: string): string {
  return slugifyLib(text, { lower: true, strict: true })
}

/**
 * Copy text to the clipboard, with a fallback for non-secure contexts.
 *
 * `navigator.clipboard` only exists in secure contexts (HTTPS or localhost),
 * so on HTTP/bare-IP deployments (e.g. airbase staging) it is undefined.
 * In that case we fall back to a hidden <textarea> + execCommand('copy').
 * Returns true on success.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false

  // The async Clipboard API only exists in secure contexts (HTTPS / localhost).
  // On insecure origins (e.g. accessing airbase staging by bare IP over HTTP)
  // `navigator.clipboard` is undefined, so fall back to the legacy execCommand.
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Permission denied / not focused — fall through to the legacy path.
    }
  }

  return fallbackCopy(text)
}

function fallbackCopy(text: string): boolean {
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}
