'use client'

import { useRef } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tertiaryLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
  onTertiary?: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tertiaryLabel,
  variant = 'default',
  onConfirm,
  onCancel,
  onTertiary,
}: ConfirmDialogProps) {
  // Radix fires BOTH a footer button's onClick AND onOpenChange(false) when that
  // button closes the dialog. Without this guard every handler runs twice (e.g.
  // the unsaved-changes "Cancel changes" button fires navigation twice). Track
  // whether a button already handled the close so onOpenChange only treats a
  // genuine dismiss (Esc / overlay) as a cancel.
  const handledRef = useRef(false)
  const runOnce = (fn?: () => void) => () => {
    handledRef.current = true
    fn?.()
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (v) return
        if (!handledRef.current) onCancel()
        handledRef.current = false
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogCancel onClick={runOnce(onCancel)} className="w-full">
            {cancelLabel}
          </AlertDialogCancel>
          {tertiaryLabel && onTertiary && (
            <AlertDialogAction
              onClick={runOnce(onTertiary)}
              className="w-full border border-red-200 bg-transparent text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              {tertiaryLabel}
            </AlertDialogAction>
          )}
          <AlertDialogAction
            onClick={runOnce(onConfirm)}
            className={cn(
              'w-full',
              variant === 'danger'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : ''
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
