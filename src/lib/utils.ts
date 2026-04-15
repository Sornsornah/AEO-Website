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
