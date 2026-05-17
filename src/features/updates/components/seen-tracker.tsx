'use client'

import { useEffect } from 'react'

interface SeenTrackerProps {
  updateId: string
}

export function SeenTracker({ updateId }: SeenTrackerProps) {
  useEffect(() => {
    fetch(`/api/updates/${updateId}/seen`, { method: 'POST' }).catch(() => {
      // Silently ignore — tracking failure should never break the UI
    })
  }, [updateId])

  return null
}
