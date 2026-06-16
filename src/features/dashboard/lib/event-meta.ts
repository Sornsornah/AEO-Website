import type { AnalyticsEventType } from '@/models/AnalyticsEvent'

/**
 * Single source of truth for how each analytics event type is described.
 * Shared by the on-screen activity timeline (user-activity-tab) and the CSV
 * export route so the two never drift.
 *
 *  - `label` — the "Type" of action (badge / CSV "Type" column)
 *  - `verb`  — the human "Action" phrase (CSV "Action" column)
 *  - `color` — timeline dot/badge colour (UI only)
 */
export const EVENT_META: Record<AnalyticsEventType, { label: string; color: string; verb: string }> = {
  site_access:           { label: 'Site access',    color: '#64748b', verb: 'Accessed the site' },
  page_view:             { label: 'Page view',      color: '#2563eb', verb: 'Visited' },
  product_view:          { label: 'Product view',   color: '#16a34a', verb: 'Viewed product' },
  product_visit_website: { label: 'Visit website',  color: '#0891b2', verb: 'Clicked “Visit website” on' },
  product_share:         { label: 'Product share',  color: '#d97706', verb: 'Shared product' },
  blog_view:             { label: 'Blog view',      color: '#7c3aed', verb: 'Viewed blog post' },
  blog_share:            { label: 'Blog share',     color: '#e11d48', verb: 'Shared blog post' },
  blog_like:             { label: 'Blog like',      color: '#db2777', verb: 'Liked blog post' },
  blog_save:             { label: 'Blog save',      color: '#0d9488', verb: 'Saved blog post' },
  blog_comment:          { label: 'Blog comment',   color: '#9333ea', verb: 'Commented on blog post' },
  update_comment:        { label: 'Update comment', color: '#c026d3', verb: 'Commented on update' },
}

/** Minimal shape needed to derive the target of an activity row. */
export interface ActivityTargetInput {
  type: AnalyticsEventType
  entityName: string | null
  path: string | null
}

/** The "Action" verb for an event type. */
export function activityVerb(type: AnalyticsEventType): string {
  return EVENT_META[type].verb
}

/** The "Type" label for an event type. */
export function activityLabel(type: AnalyticsEventType): string {
  return EVENT_META[type].label
}

/**
 * The "Page" / target an action was performed on:
 *  - page_view  → the path
 *  - site_access → none
 *  - entity events → the resolved entity name (or "(removed)" if deleted)
 */
export function activityTarget(row: ActivityTargetInput): string {
  if (row.type === 'page_view') return row.path ?? ''
  if (row.type === 'site_access') return ''
  return row.entityName ?? '(removed)'
}
