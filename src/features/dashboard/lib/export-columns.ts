/**
 * Canonical list of CSV export columns, shared by the export modal (checkbox
 * picker) and the export route (header + cell order) so the two never drift.
 *
 *  - `key`         — the snake_case CSV header (graph-friendly, stable)
 *  - `label`       — the human label shown in the column picker
 *  - `description` — plain-language explanation of what the column holds
 */
export interface ExportColumn {
  key: string
  label: string
  description: string
}

export const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'timestamp_utc', label: 'Timestamp (UTC)', description: 'Exact event time in UTC (ISO 8601).' },
  { key: 'date', label: 'Date (SGT)', description: 'Calendar date of the event in SGT (UTC+8). Best for daily charts.' },
  { key: 'hour', label: 'Hour (SGT)', description: 'Hour of day, 00–23, in SGT. For time-of-day charts.' },
  { key: 'day_of_week', label: 'Day of week', description: 'Day name (Mon–Sun) in SGT. For weekly-pattern charts.' },
  { key: 'user_name', label: 'User name', description: 'Display name of the user who performed the action.' },
  { key: 'user_email', label: 'User email', description: 'Email address of that user.' },
  { key: 'event_label', label: 'Event', description: 'What the user did, e.g. “Blog view” or “Product share”.' },
  { key: 'entity_type', label: 'Entity type', description: 'What the action targeted: product, blog, or update.' },
  { key: 'entity_name', label: 'Entity name', description: 'Name/title of the target (product name or blog post title).' },
  { key: 'blog_post_author', label: 'Blog post author', description: 'Byline author of the blog post (blog events only).' },
  { key: 'category', label: 'Category', description: 'Blog category of the target post (blog events only).' },
  { key: 'path', label: 'Path', description: 'URL path of the page visited (page-view events).' },
]

export const EXPORT_COLUMN_KEYS = EXPORT_COLUMNS.map((c) => c.key)
