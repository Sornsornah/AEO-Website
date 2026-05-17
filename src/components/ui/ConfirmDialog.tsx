'use client'

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
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          {tertiaryLabel && onTertiary && (
            <AlertDialogAction
              onClick={onTertiary}
              className="w-full border border-red-200 bg-transparent text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              {tertiaryLabel}
            </AlertDialogAction>
          )}
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              'w-full',
              variant === 'danger'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : ''
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
          <AlertDialogCancel onClick={onCancel} className="w-full">
            {cancelLabel}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
