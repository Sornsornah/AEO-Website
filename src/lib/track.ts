import type { AnalyticsEventType } from '@/models/AnalyticsEvent'

interface TrackPayload {
  entityId?: string
  entityType?: 'product' | 'blog' | 'update'
  category?: string
  path?: string
}

/**
 * Fire-and-forget analytics event. Swallows all errors — tracking must never
 * break the page. Uses `keepalive` so events survive navigation/unload.
 */
export function track(type: AnalyticsEventType, payload: TrackPayload = {}) {
  try {
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...payload }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // ignore
  }
}
