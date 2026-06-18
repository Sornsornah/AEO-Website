import type { AnalyticsEventType } from '@/models/AnalyticsEvent'

/**
 * Single source of truth for how each analytics event type is described.
 * Shared by the on-screen activity timeline (user-activity-tab) and the CSV
 * export route so the two never drift.
 *
 *  - `label`       — the "Type" of action (badge / CSV "Type" column)
 *  - `verb`        — the human "Action" phrase (CSV "Action" column)
 *  - `color`       — timeline dot/badge colour (UI only)
 *  - `description` — plain-language definition (legend / info popover)
 */
export const EVENT_META: Record<
  AnalyticsEventType,
  { label: string; color: string; verb: string; description: string }
> = {
  site_access:           { label: 'Site access',    color: '#64748b', verb: 'Accessed the site',           description: 'Opened the site (counted once per day per user).' },
  page_view:             { label: 'Page view',      color: '#2563eb', verb: 'Visited',                     description: 'Visited a public or gated page. Admin pages are not tracked.' },
  product_view:          { label: 'Product view',   color: '#16a34a', verb: 'Viewed product',              description: 'Opened a product’s detail page.' },
  product_visit_website: { label: 'Visit website',  color: '#0891b2', verb: 'Clicked “Visit website” on',  description: 'Clicked “Visit website” on a product.' },
  product_share:         { label: 'Product share',  color: '#d97706', verb: 'Shared product',              description: 'Clicked share on a product.' },
  blog_view:             { label: 'Blog view',         color: '#7c3aed', verb: 'Viewed blog post',            description: 'Opened a blog post.' },
  blog_share:            { label: 'Blog share',        color: '#e11d48', verb: 'Shared blog post',            description: 'Shared a blog post.' },
  blog_like:             { label: 'Blog like',         color: '#db2777', verb: 'Liked blog post',             description: 'Liked a blog post.' },
  blog_unlike:           { label: 'Blog unlike',       color: '#9d174d', verb: 'Unliked blog post',           description: 'Removed a like from a blog post.' },
  blog_save:             { label: 'Blog save',         color: '#0d9488', verb: 'Saved blog post',             description: 'Saved (bookmarked) a blog post.' },
  blog_unsave:           { label: 'Blog unsave',       color: '#115e59', verb: 'Unsaved blog post',           description: 'Removed a blog post from saved.' },
  blog_comment_add:      { label: 'Blog comment',      color: '#9333ea', verb: 'Commented on blog post',      description: 'Added a comment on a blog post.' },
  blog_comment_edit:     { label: 'Blog comment edit', color: '#7e22ce', verb: 'Edited comment on blog post',  description: 'Edited their own comment on a blog post.' },
  blog_comment_delete:   { label: 'Blog comment delete', color: '#6b21a8', verb: 'Deleted comment on blog post', description: 'Deleted their own comment on a blog post.' },
  blog_post:             { label: 'Blog post',         color: '#ea580c', verb: 'Published blog post',          description: 'Saved a blog post with status “published”.' },
  blog_draft:            { label: 'Blog draft',        color: '#ca8a04', verb: 'Drafted blog post',            description: 'Saved a blog post with status “draft”.' },
  update_comment_add:    { label: 'Update comment',    color: '#c026d3', verb: 'Commented on update',          description: 'Added a comment on an internal update.' },
  update_comment_edit:   { label: 'Update comment edit', color: '#a21caf', verb: 'Edited comment on update',    description: 'Edited their own comment on an internal update.' },
  update_comment_delete: { label: 'Update comment delete', color: '#86198f', verb: 'Deleted comment on update', description: 'Deleted their own comment on an internal update.' },
}

/**
 * Event types in display order, derived from EVENT_META's insertion order.
 * Client-safe (no Mongoose import), so UI can iterate without pulling the model.
 */
export const EVENT_TYPE_ORDER = Object.keys(EVENT_META) as AnalyticsEventType[]

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
