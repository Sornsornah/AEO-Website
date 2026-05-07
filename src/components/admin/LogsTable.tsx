'use client'

import { useState, useCallback, useEffect } from 'react'
import { X, Globe, FileText, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateShort, formatRelativeDate } from '@/lib/utils'
import { format } from 'date-fns'

interface FieldChange {
  field: string
  before: unknown
  after: unknown
}

export interface LogEntry {
  _id: string
  userId: string
  userName: string
  action: 'create' | 'update' | 'reorder' | 'delete'
  entityType: 'update' | 'product' | 'blog' | 'product_order' | 'external_article' | 'external_article_order'
  entityId: string
  entityTitle: string
  changes: FieldChange[]
  beforeSnapshot?: Record<string, unknown> | null
  afterSnapshot?: Record<string, unknown> | null
  createdAt: string
}

interface LogsTableProps {
  initialLogs: LogEntry[]
  initialTotal: number
}

const ENTITY_LABELS: Record<string, string> = {
  update: 'Internal Update',
  product: 'Product',
  blog: 'Blog Post',
  product_order: 'Product Ordering',
  external_article: 'External Article',
  external_article_order: 'Article Ordering',
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  isPublished: 'Published',
  scheduledAt: 'Scheduled At',
  date: 'Date',
  productIds: 'Products',
  domainIds: 'Sections',
  tagIds: 'Tags',
  name: 'Name',
  status: 'Status',
  color: 'Colour',
  shortDescription: 'Short Description',
  description: 'Description',
  logoUrl: 'Logo URL',
  websiteUrl: 'Website URL',
  deckUrl: 'Deck URL',
  contactUsUrl: 'Contact URL',
  overviewContent: 'Overview',
  vision: 'Vision',
  mission: 'Mission',
  goals: 'Goals',
  authorName: 'Author',
  category: 'Category',
  publishedAt: 'Published At',
  featuredUntil: 'Featured Until',
  isHidden: 'Visibility',
  order: 'Display Order',
  uiScreenshot: 'Screenshot',
  useCases: 'Use Cases',
  productUpdates: 'Product Updates',
  highlightStats: 'Highlights',
  productManagers: 'Product Managers',
  developers: 'Developers',
  excerpt: 'Subtitle',
  coverImage: 'Cover Image',
  content: 'Content',
  tags: 'Tags',
  isFeatured: 'Featured',
  url: 'URL',
  progressUpdates: 'Key Milestones',
  nextSteps: 'Next Steps',
  learningPoints: 'Learning Points',
}

// ─── Snapshot preview components ─────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

type HighlightColor = 'rose' | 'emerald'

function hl(fields: string[], field: string, color: HighlightColor): string {
  if (!fields.includes(field)) return ''
  return color === 'rose'
    ? 'ring-2 ring-rose-300 bg-rose-50 rounded-lg'
    : 'ring-2 ring-emerald-300 bg-emerald-50 rounded-lg'
}

const PRODUCT_STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  live:        { label: 'LIVE',        dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  beta:        { label: 'BETA',        dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50' },
  coming_soon: { label: 'COMING SOON', dot: 'bg-slate-400',   text: 'text-slate-600',   bg: 'bg-slate-100' },
}

const BLOG_STATUS_CONFIG: Record<string, { label: string; text: string; bg: string }> = {
  draft:     { label: 'Draft',     text: 'text-slate-500', bg: 'bg-slate-100' },
  scheduled: { label: 'Scheduled', text: 'text-amber-700', bg: 'bg-amber-50' },
  published: { label: 'Published', text: 'text-green-700', bg: 'bg-green-50' },
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function ProductUseCasesSection({ snapshot, color, otherSnapshot }: { snapshot: Record<string, unknown>; color: HighlightColor; otherSnapshot?: Record<string, unknown> }) {
  const cases = Array.isArray(snapshot.useCases) ? (snapshot.useCases as Record<string, unknown>[]) : []
  const otherCases = otherSnapshot && Array.isArray(otherSnapshot.useCases)
    ? (otherSnapshot.useCases as Record<string, unknown>[])
    : []
  const otherCaseMap = new Map(otherCases.map((uc) => [String(uc.title ?? ''), uc]))

  const annotated = cases.map((uc) => {
    const otherUc = otherCaseMap.get(String(uc.title ?? ''))
    const isNew = !otherUc
    const isChanged = !!otherUc && JSON.stringify(uc) !== JSON.stringify(otherUc)
    return { uc, isNew, isChanged }
  })
  const filtered = otherSnapshot ? annotated.filter(({ isNew, isChanged }) => isNew || isChanged) : annotated

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Use Cases</p>
      {filtered.length === 0 ? (
        <p className="text-xs text-slate-300 italic">{cases.length === 0 ? 'No use cases.' : 'No changes.'}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(({ uc, isNew, isChanged }, i) => {
            const itemHl = (isNew || isChanged)
              ? color === 'rose' ? 'ring-2 ring-rose-200 bg-rose-50/50' : 'ring-2 ring-emerald-200 bg-emerald-50/50'
              : ''
            return (
              <div key={i} className={`bg-white border border-slate-100 rounded-lg p-2.5 space-y-1 ${itemHl}`}>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-semibold text-slate-800 leading-snug">{String(uc.title ?? '—')}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${uc.isDraft ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
                    {uc.isDraft ? 'Draft' : 'Published'}
                  </span>
                </div>
                {!!(uc.functionTag || uc.department) && (
                  <div className="flex gap-1 flex-wrap">
                    {!!uc.functionTag && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{String(uc.functionTag)}</span>}
                    {!!uc.department && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{String(uc.department)}</span>}
                  </div>
                )}
                {!!uc.content && (
                  <p className="text-xs text-slate-500 whitespace-pre-wrap leading-snug">{stripHtml(String(uc.content))}</p>
                )}
                {!!uc.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={String(uc.image)} alt="" className="w-full rounded object-cover max-h-20" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ProductUpdatesSection({ snapshot, color, productColor, otherSnapshot }: { snapshot: Record<string, unknown>; color: HighlightColor; productColor: string; otherSnapshot?: Record<string, unknown> }) {
  const updates = Array.isArray(snapshot.productUpdates) ? (snapshot.productUpdates as Record<string, unknown>[]) : []
  const otherUpdates = otherSnapshot && Array.isArray(otherSnapshot.productUpdates)
    ? (otherSnapshot.productUpdates as Record<string, unknown>[])
    : []
  const otherUpdateMap = new Map(otherUpdates.map((u) => [String(u.title ?? '') + String(u.date ?? ''), u]))

  const annotated = updates.map((upd) => {
    const key = String(upd.title ?? '') + String(upd.date ?? '')
    const otherUpd = otherUpdateMap.get(key)
    const isNew = !otherUpd
    const isChanged = !!otherUpd && JSON.stringify(upd) !== JSON.stringify(otherUpd)
    return { upd, isNew, isChanged }
  })
  const filtered = otherSnapshot ? annotated.filter(({ isNew, isChanged }) => isNew || isChanged) : annotated

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Product Updates</p>
      {filtered.length === 0 ? (
        <p className="text-xs text-slate-300 italic">{updates.length === 0 ? 'No product updates.' : 'No changes.'}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(({ upd, isNew, isChanged }, i) => {
            const itemHl = (isNew || isChanged)
              ? color === 'rose' ? 'ring-2 ring-rose-200 bg-rose-50/50 rounded-lg px-2 py-1' : 'ring-2 ring-emerald-200 bg-emerald-50/50 rounded-lg px-2 py-1'
              : ''
            const plainContent = upd.content ? stripHtml(String(upd.content)) : ''
            return (
              <div key={i} className={`flex gap-2.5 ${itemHl}`}>
                <div className="w-1.5 flex-shrink-0 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: productColor }} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  {!!upd.date && <p className="text-[10px] text-slate-400">{format(new Date(upd.date as string), 'MMM yyyy')}</p>}
                  <p className="text-xs font-semibold text-slate-800">{String(upd.title ?? '—')}</p>
                  {!!plainContent && (
                    <p className="text-xs text-slate-500 whitespace-pre-wrap leading-snug">{plainContent}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ProductSnapshotPreview({
  snapshot,
  changedFields,
  color,
  otherSnapshot,
}: {
  snapshot: Record<string, unknown>
  changedFields: string[]
  color: HighlightColor
  otherSnapshot?: Record<string, unknown> | null
}) {
  const status = PRODUCT_STATUS_CONFIG[snapshot.status as string] ?? PRODUCT_STATUS_CONFIG.live
  const productColor = (snapshot.color as string) || '#6366f1'

  const onlyUseCases    = changedFields.length > 0 && changedFields.every((f) => f === 'useCases')
  const onlyProductUpd  = changedFields.length > 0 && changedFields.every((f) => f === 'productUpdates')

  // Minimal header used in focused views
  const minimalHeader = (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <span className="font-bold text-base text-[#1C1512]">{String(snapshot.name || '—')}</span>
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.bg} ${status.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
        {status.label}
      </span>
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${hl(changedFields, 'isHidden', color)} ${snapshot.isHidden ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${snapshot.isHidden ? 'bg-slate-400' : 'bg-emerald-500'}`} />
        {snapshot.isHidden ? 'Hidden' : 'Visible'}
      </span>
    </div>
  )

  if (onlyUseCases) {
    return (
      <div className="space-y-3 text-sm">
        {minimalHeader}
        <ProductUseCasesSection snapshot={snapshot} color={color} otherSnapshot={otherSnapshot ?? undefined} />
      </div>
    )
  }

  if (onlyProductUpd) {
    return (
      <div className="space-y-3 text-sm">
        {minimalHeader}
        <ProductUpdatesSection snapshot={snapshot} color={color} productColor={productColor} otherSnapshot={otherSnapshot ?? undefined} />
      </div>
    )
  }

  return (
    <div className="space-y-4 text-sm">
      {/* Card: logo + colour swatch + name + status + shortDescription + links */}
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden ${hl(changedFields, 'logoUrl', color)}`}
            style={{ backgroundColor: snapshot.logoUrl ? undefined : productColor }}
          >
            {snapshot.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={snapshot.logoUrl as string} alt="" className="w-full h-full object-contain" />
            ) : (
              <span className="text-white text-sm font-bold">
                {String(snapshot.name || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div
            className={`w-5 h-5 rounded-full border-2 border-white shadow-sm flex-shrink-0 ${hl(changedFields, 'color', color)}`}
            style={{ backgroundColor: productColor }}
            title={productColor}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`font-bold text-base text-[#1C1512] ${hl(changedFields, 'name', color)}`}>
              {String(snapshot.name || '—')}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.bg} ${status.text} ${hl(changedFields, 'status', color)}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
          {!!snapshot.shortDescription && (
            <p className={`text-xs text-slate-500 leading-snug mb-2 ${hl(changedFields, 'shortDescription', color)}`}>
              {String(snapshot.shortDescription)}
            </p>
          )}
          {/* Action links — highlight wraps the button, not the <a> itself, to preserve button styling */}
          {!!(snapshot.websiteUrl || snapshot.deckUrl || snapshot.contactUsUrl) && (
            <div className="flex flex-wrap gap-1.5">
              {!!snapshot.websiteUrl && (
                <span className={hl(changedFields, 'websiteUrl', color)}>
                  <a
                    href={snapshot.websiteUrl as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#1C1512] bg-[#1C1512] text-white text-xs font-medium hover:opacity-80 transition-opacity"
                  >
                    <Globe className="w-3 h-3" /> Visit website
                  </a>
                </span>
              )}
              {!!snapshot.deckUrl && (
                <span className={hl(changedFields, 'deckUrl', color)}>
                  <a
                    href={snapshot.deckUrl as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
                  >
                    <FileText className="w-3 h-3" /> View deck
                  </a>
                </span>
              )}
              {!!snapshot.contactUsUrl && (
                <span className={hl(changedFields, 'contactUsUrl', color)}>
                  <a
                    href={snapshot.contactUsUrl as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
                  >
                    <Mail className="w-3 h-3" /> Contact us
                  </a>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Screenshot */}
      {!!snapshot.uiScreenshot && (
        <div className={`rounded-lg overflow-hidden aspect-[16/9] ${hl(changedFields, 'uiScreenshot', color)}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={snapshot.uiScreenshot as string} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Team */}
      {(() => {
        const pms = Array.isArray(snapshot.productManagers) ? (snapshot.productManagers as { name: string; email: string }[]) : []
        const devs = Array.isArray(snapshot.developers) ? (snapshot.developers as { name: string; email: string }[]) : []
        if (pms.length === 0 && devs.length === 0) return null
        return (
          <div className="border-t border-slate-100 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Team</p>
            <div className="flex gap-2">
              {pms.length > 0 && (
                <div className={`border border-slate-200 rounded-lg p-2.5 flex-1 ${hl(changedFields, 'productManagers', color)}`}>
                  <p className="text-[9px] font-semibold uppercase tracking-wider mb-2" style={{ color: productColor }}>Product Managers</p>
                  <div className="space-y-2">
                    {pms.map((m, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold flex-shrink-0 bg-blue-100 text-blue-700">
                          {getInitials(m.name)}
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-slate-800 leading-tight">{m.name}</p>
                          <p className="text-[9px] text-slate-400 leading-tight">{m.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {devs.length > 0 && (
                <div className={`border border-slate-200 rounded-lg p-2.5 flex-1 ${hl(changedFields, 'developers', color)}`}>
                  <p className="text-[9px] font-semibold uppercase tracking-wider mb-2" style={{ color: productColor }}>Developers</p>
                  <div className="space-y-2">
                    {devs.map((m, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold flex-shrink-0 bg-purple-100 text-purple-700">
                          {getInitials(m.name)}
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-slate-800 leading-tight">{m.name}</p>
                          <p className="text-[9px] text-slate-400 leading-tight">{m.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Highlights + Overview */}
      {(() => {
        const stats = Array.isArray(snapshot.highlightStats) ? (snapshot.highlightStats as { value: string; label: string }[]) : []
        return stats.length > 0 ? (
          <div className={`border border-slate-200 rounded-lg p-3 ${hl(changedFields, 'highlightStats', color)}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Highlights</p>
            <div className="space-y-2">
              {stats.map((s, i) => (
                <div key={i}>
                  <p className="text-base font-bold text-[#1C1512]">{s.value}</p>
                  <p className="text-[10px] text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null
      })()}

      {/* Overview content */}
      {!!snapshot.overviewContent && (
        <div className={`border-t border-slate-100 pt-3 ${hl(changedFields, 'overviewContent', color)}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Overview</p>
          <div
            className="prose prose-xs max-w-none text-slate-600 text-xs [&_p]:[line-height:1.5] [&_li]:[line-height:1.5]"
            dangerouslySetInnerHTML={{ __html: snapshot.overviewContent as string }}
          />
        </div>
      )}

      {/* Vision / Mission / Goals */}
      {(['vision', 'mission', 'goals'] as const).map((field) =>
        snapshot[field] ? (
          <div key={field} className={`border-t border-slate-100 pt-3 ${hl(changedFields, field, color)}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{FIELD_LABELS[field]}</p>
            <p className="text-xs text-slate-600 whitespace-pre-wrap line-clamp-4">{String(snapshot[field])}</p>
          </div>
        ) : null
      )}

      {/* Use Cases */}
      <div className="border-t border-slate-100 pt-3">
        <ProductUseCasesSection snapshot={snapshot} color={color} otherSnapshot={otherSnapshot ?? undefined} />
      </div>

      {/* Product Updates */}
      <div className="border-t border-slate-100 pt-3">
        <ProductUpdatesSection snapshot={snapshot} color={color} productColor={productColor} otherSnapshot={otherSnapshot ?? undefined} />
      </div>

      {/* Non-visual field chips */}
      <div className="flex flex-wrap gap-2 pt-1">
        {changedFields.includes('isHidden') && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${snapshot.isHidden ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
            {snapshot.isHidden ? 'Hidden' : 'Visible'}
          </span>
        )}
        {changedFields.includes('order') && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border border-slate-200 bg-white text-slate-600">
            Position {Number(snapshot.order ?? 0) + 1}
          </span>
        )}
      </div>
    </div>
  )
}

function UpdateSnapshotPreview({
  snapshot,
  changedFields,
  color,
}: {
  snapshot: Record<string, unknown>
  changedFields: string[]
  color: HighlightColor
}) {
  const date = snapshot.date ? format(new Date(snapshot.date as string), 'MMM yyyy') : '—'

  return (
    <div className="space-y-3 text-sm">
      {/* Date + status */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs text-slate-400 ${hl(changedFields, 'date', color)}`}>{date}</span>
        {snapshot.isPublished ? (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 ${hl(changedFields, 'isPublished', color)}`}>
            Published
          </span>
        ) : snapshot.scheduledAt ? (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 ${hl(changedFields, 'scheduledAt', color)}`}>
            Scheduled · {format(new Date(snapshot.scheduledAt as string), 'MMM d, h:mm a')}
          </span>
        ) : (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 ${hl(changedFields, 'isPublished', color)}`}>
            Draft
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className={`text-base font-bold text-slate-900 leading-snug ${hl(changedFields, 'title', color)}`}>
        {String(snapshot.title || '—')}
      </h3>

      {/* Summary */}
      {!!snapshot.summary && snapshot.summary !== '<p></p>' && (
        <div
          className="text-xs text-slate-500 prose prose-xs max-w-none [&_p]:[line-height:1.5]"
          dangerouslySetInnerHTML={{ __html: snapshot.summary as string }}
        />
      )}

      {/* Additional information (content) */}
      {!!snapshot.content && snapshot.content !== '<p></p>' && (
        <div className={`border-t border-slate-100 pt-3 ${hl(changedFields, 'content', color)}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Additional Information</p>
          <div
            className="prose prose-xs max-w-none text-slate-600 text-xs [&_p]:[line-height:1.5] [&_li]:[line-height:1.5]"
            dangerouslySetInnerHTML={{ __html: snapshot.content as string }}
          />
        </div>
      )}

      {/* Content sections */}
      {(['progressUpdates', 'nextSteps', 'learningPoints'] as const).map((key) => {
        const val = snapshot[key]
        if (!val) return null
        const labels: Record<string, string> = {
          progressUpdates: 'Key Milestones',
          nextSteps: 'Next Steps',
          learningPoints: 'Learning Points',
        }
        return (
          <div key={key} className={`p-3 bg-white rounded-xl border border-slate-200 ${hl(changedFields, key, color)}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{labels[key]}</p>
            <p className="text-xs text-slate-600 whitespace-pre-wrap">{String(val)}</p>
          </div>
        )
      })}
    </div>
  )
}

function BlogSnapshotPreview({
  snapshot,
  changedFields,
  color,
}: {
  snapshot: Record<string, unknown>
  changedFields: string[]
  color: HighlightColor
}) {
  const statusCfg = BLOG_STATUS_CONFIG[snapshot.status as string] ?? BLOG_STATUS_CONFIG.draft
  const date = snapshot.publishedAt ? format(new Date(snapshot.publishedAt as string), 'MMM d, yyyy') : '—'

  return (
    <div className="space-y-3 text-sm">
      {/* Category + status + isFeatured */}
      <div className="flex items-center gap-2 flex-wrap">
        {!!snapshot.category && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 ${hl(changedFields, 'category', color)}`}>
            {String(snapshot.category)}
          </span>
        )}
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusCfg.bg} ${statusCfg.text} ${hl(changedFields, 'status', color)}`}>
          {statusCfg.label}
        </span>
        {!!snapshot.isFeatured && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 ${hl(changedFields, 'isFeatured', color)}`}>
            ★ Featured
          </span>
        )}
      </div>

      {/* Cover image */}
      {!!snapshot.coverImage && (
        <div className={`rounded-lg overflow-hidden aspect-[16/6] ${hl(changedFields, 'coverImage', color)}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={snapshot.coverImage as string} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Title */}
      <h3 className={`text-base font-bold text-slate-900 leading-snug ${hl(changedFields, 'title', color)}`}>
        {String(snapshot.title || '—')}
      </h3>

      {/* Excerpt / subtitle */}
      {!!snapshot.excerpt && (
        <p className={`text-xs text-slate-500 ${hl(changedFields, 'excerpt', color)}`}>{String(snapshot.excerpt)}</p>
      )}

      {/* Tags */}
      {Array.isArray(snapshot.tags) && (snapshot.tags as string[]).length > 0 && (
        <div className={`flex flex-wrap gap-1 ${hl(changedFields, 'tags', color)}`}>
          {(snapshot.tags as string[]).map((tag, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">{tag}</span>
          ))}
        </div>
      )}

      {/* Author + date */}
      <div className="flex items-center gap-2 pt-1">
        {!!snapshot.authorName && (
          <div className={`flex items-center gap-1.5 ${hl(changedFields, 'authorName', color)}`}>
            <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
              {getInitials(String(snapshot.authorName))}
            </span>
            <span className="text-xs text-slate-600 font-medium">{String(snapshot.authorName)}</span>
          </div>
        )}
        <span className={`text-xs text-slate-400 ${hl(changedFields, 'publishedAt', color)}`}>{date}</span>
      </div>

      {/* Featured until */}
      {!!snapshot.featuredUntil && (
        <div className={`flex items-center gap-1.5 ${hl(changedFields, 'featuredUntil', color)}`}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Featured until</span>
          <span className="text-xs text-amber-600 font-medium">{format(new Date(snapshot.featuredUntil as string), 'MMM d, yyyy h:mm a')}</span>
        </div>
      )}

      {/* Content preview */}
      {!!snapshot.content && snapshot.content !== '<p></p>' && (
        <div className={`border-t border-slate-100 pt-3 ${hl(changedFields, 'content', color)}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Content</p>
          <div
            className="prose prose-xs max-w-none text-slate-600 text-xs [&_p]:[line-height:1.5] [&_li]:[line-height:1.5]"
            dangerouslySetInnerHTML={{ __html: snapshot.content as string }}
          />
        </div>
      )}
    </div>
  )
}

function ExternalArticleSnapshotPreview({
  snapshot,
  changedFields,
  color,
}: {
  snapshot: Record<string, unknown>
  changedFields: string[]
  color: HighlightColor
}) {
  return (
    <div className="space-y-3 text-sm">
      <p className={`font-bold text-base text-[#1C1512] ${hl(changedFields, 'title', color)}`}>
        {String(snapshot.title || '—')}
      </p>
      {!!snapshot.description && (
        <p className={`text-xs text-slate-500 leading-snug ${hl(changedFields, 'description', color)}`}>
          {String(snapshot.description)}
        </p>
      )}
      {!!snapshot.url && (
        <a
          href={snapshot.url as string}
          target="_blank"
          rel="noopener noreferrer"
          className={`pointer-events-auto inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline ${hl(changedFields, 'url', color)}`}
        >
          <Globe className="w-3 h-3" />
          {String(snapshot.url).replace(/^https?:\/\//, '').split('/')[0]}
        </a>
      )}
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${hl(changedFields, 'isHidden', color)} ${snapshot.isHidden ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${snapshot.isHidden ? 'bg-slate-400' : 'bg-emerald-500'}`} />
        {snapshot.isHidden ? 'Hidden' : 'Visible'}
      </span>
    </div>
  )
}

function ExternalArticleOrderSnapshotPreview({
  snapshot,
  otherSnapshot,
  color,
}: {
  snapshot: Record<string, unknown>
  otherSnapshot?: Record<string, unknown> | null
  color: HighlightColor
}) {
  const allArticles = Array.isArray(snapshot.articles)
    ? (snapshot.articles as { _id: string; title: string; order: number; isHidden?: boolean }[])
    : []
  const articles = allArticles.filter((a) => !a.isHidden)
  const otherArticles = otherSnapshot && Array.isArray(otherSnapshot.articles)
    ? (otherSnapshot.articles as { _id: string; title: string; order: number }[])
    : []

  const changedIds = new Set(
    articles
      .filter((a) => {
        const other = otherArticles.find((o) => o._id === a._id)
        return other && other.order !== a.order
      })
      .map((a) => a._id)
  )

  return (
    <div className="space-y-1.5 text-sm">
      {articles.map((a, i) => {
        const changed = changedIds.has(a._id)
        const hlClass = changed
          ? color === 'rose'
            ? 'ring-2 ring-rose-300 bg-rose-50 rounded-lg'
            : 'ring-2 ring-emerald-300 bg-emerald-50 rounded-lg'
          : ''
        return (
          <div key={a._id} className={`flex items-center gap-2.5 px-2 py-1.5 ${hlClass}`}>
            <span className="text-xs text-slate-400 w-5 text-right flex-shrink-0">{i + 1}</span>
            <span className="text-sm text-slate-800 font-medium">{a.title}</span>
          </div>
        )
      })}
    </div>
  )
}

function ProductOrderSnapshotPreview({
  snapshot,
  otherSnapshot,
  color,
}: {
  snapshot: Record<string, unknown>
  otherSnapshot?: Record<string, unknown> | null
  color: HighlightColor
}) {
  const allProducts = Array.isArray(snapshot.products)
    ? (snapshot.products as { _id: string; name: string; color: string; order: number; isHidden?: boolean }[])
    : []
  const products = allProducts.filter((p) => !p.isHidden)

  const otherProducts = otherSnapshot && Array.isArray(otherSnapshot.products)
    ? (otherSnapshot.products as { _id: string; name: string; color: string; order: number }[])
    : []

  // Build a set of IDs that changed order
  const changedIds = new Set(
    products
      .filter((p) => {
        const other = otherProducts.find((o) => o._id === p._id)
        return other && other.order !== p.order
      })
      .map((p) => p._id)
  )

  return (
    <div className="space-y-1.5 text-sm">
      {products.map((p, i) => {
        const changed = changedIds.has(p._id)
        const hlClass = changed
          ? color === 'rose'
            ? 'ring-2 ring-rose-300 bg-rose-50 rounded-lg'
            : 'ring-2 ring-emerald-300 bg-emerald-50 rounded-lg'
          : ''
        return (
          <div key={p._id} className={`flex items-center gap-2.5 px-2 py-1.5 ${hlClass}`}>
            <span className="text-xs text-slate-400 w-5 text-right flex-shrink-0">{i + 1}</span>
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-sm text-slate-800 font-medium">{p.name}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Legacy field-by-field diff (fallback for old logs without snapshots) ─────

const HTML_FIELDS = new Set(['overviewContent'])
const PROSE_FIELDS = new Set(['shortDescription', 'description', 'vision', 'mission', 'goals'])

function FieldPreview({
  field,
  value,
  entityType,
}: {
  field: string
  value: unknown
  entityType: LogEntry['entityType']
}) {
  if (value === null || value === undefined) {
    return <p className="text-sm text-slate-300 italic">Empty</p>
  }
  if (field === 'color' && typeof value === 'string') {
    return (
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg border border-black/10 flex-shrink-0" style={{ backgroundColor: value }} />
        <span className="text-sm font-mono text-slate-600">{value}</span>
      </div>
    )
  }
  if (field === 'status' && entityType === 'product') {
    const cfg = PRODUCT_STATUS_CONFIG[String(value)] ?? PRODUCT_STATUS_CONFIG.live
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
      </span>
    )
  }
  if (field === 'status' && entityType === 'blog') {
    const cfg = BLOG_STATUS_CONFIG[String(value)] ?? BLOG_STATUS_CONFIG.draft
    return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
  }
  if (field === 'isPublished') {
    const on = Boolean(value)
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${on ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
        {on ? 'Published' : 'Draft'}
      </span>
    )
  }
  if (field === 'isHidden') {
    const hidden = Boolean(value)
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${hidden ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${hidden ? 'bg-slate-400' : 'bg-emerald-500'}`} />
        {hidden ? 'Hidden' : 'Visible'}
      </span>
    )
  }
  if (field === 'order') return <span className="text-sm font-mono text-slate-700">Position {Number(value) + 1}</span>
  if (field === 'title') return <p className="text-base font-semibold text-slate-900 leading-snug">{String(value)}</p>
  if (field === 'name') return <p className="text-xl font-bold text-[#1C1512] leading-tight">{String(value)}</p>
  if (field === 'authorName') {
    return (
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
          {getInitials(String(value))}
        </span>
        <span className="text-sm font-semibold text-slate-900">{String(value)}</span>
      </div>
    )
  }
  if (PROSE_FIELDS.has(field) && typeof value === 'string') {
    return <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-wrap">{value}</p>
  }
  if (HTML_FIELDS.has(field) && typeof value === 'string') {
    return (
      <div
        className="prose prose-sm max-w-none text-slate-600 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:leading-relaxed [&_p]:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: value }}
      />
    )
  }
  if (['publishedAt', 'scheduledAt', 'date'].includes(field) && typeof value === 'string') {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-slate-800">{formatDateShort(value)}</span>
        <span className="text-xs text-slate-400">{formatRelativeDate(value)}</span>
      </div>
    )
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <p className="text-sm text-slate-400 italic">None</p>
    return (
      <div className="flex flex-wrap gap-1">
        {(value as unknown[]).map((v, i) => (
          <span key={i} className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">{String(v)}</span>
        ))}
      </div>
    )
  }
  return <span className="text-sm text-slate-700">{String(value)}</span>
}

// ─── DiffModal ────────────────────────────────────────────────────────────────

function PreviewColumn({
  label,
  dotColor,
  borderColor,
  bgColor,
  children,
}: {
  label: string
  dotColor: string
  borderColor: string
  bgColor: string
  children: React.ReactNode
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      </div>
      <div className={`rounded-2xl border-2 ${borderColor} ${bgColor} overflow-hidden`}>
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-center py-1.5 border-b border-slate-200/60 text-slate-400">
          Live Preview
        </p>
        <div className="p-4 overflow-y-auto max-h-[58vh]">
          {children}
        </div>
      </div>
    </div>
  )
}

function DiffModal({ log, onClose }: { log: LogEntry; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const isCreate = log.action === 'create'
  const isDelete = log.action === 'delete'
  const hasSnapshots = !!(log.beforeSnapshot || log.afterSnapshot)
  const changedFields = log.changes.map((c) => c.field)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge className={`text-xs capitalize border ${
                log.action === 'create' ? 'bg-green-50 text-green-700 border-green-100' :
                log.action === 'reorder' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                log.action === 'delete' ? 'bg-red-50 text-red-600 border-red-100' :
                'bg-blue-50 text-blue-700 border-blue-100'
              }`}>
                {log.action}
              </Badge>
              <span className="text-xs text-slate-400">{ENTITY_LABELS[log.entityType]}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">{log.entityTitle}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {log.userName} &middot; {formatDateShort(log.createdAt)} &middot; {formatRelativeDate(log.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Change summary strip */}
        {log.changes.length > 0 && (
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-start gap-2 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5 flex-shrink-0">Changed:</span>
              <div className="flex flex-wrap gap-1">
                {log.changes.map((c) => (
                  <span key={c.field} className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 font-medium">
                    {FIELD_LABELS[c.field] ?? c.field}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 flex-1">
          {hasSnapshots ? (
            <div className={`flex gap-4 ${(isCreate || isDelete) ? 'justify-center max-w-md mx-auto' : ''}`}>
              {!isCreate && log.beforeSnapshot && (
                <PreviewColumn label={isDelete ? 'Deleted' : 'Before'} dotColor="bg-rose-400" borderColor="border-rose-200" bgColor="bg-rose-50/20">
                  {log.entityType === 'product' && <ProductSnapshotPreview snapshot={log.beforeSnapshot} changedFields={changedFields} color="rose" otherSnapshot={log.afterSnapshot} />}
                  {log.entityType === 'update' && <UpdateSnapshotPreview snapshot={log.beforeSnapshot} changedFields={changedFields} color="rose" />}
                  {log.entityType === 'blog' && <BlogSnapshotPreview snapshot={log.beforeSnapshot} changedFields={changedFields} color="rose" />}
                  {log.entityType === 'product_order' && <ProductOrderSnapshotPreview snapshot={log.beforeSnapshot} otherSnapshot={log.afterSnapshot} color="rose" />}
                  {log.entityType === 'external_article' && <ExternalArticleSnapshotPreview snapshot={log.beforeSnapshot} changedFields={changedFields} color="rose" />}
                  {log.entityType === 'external_article_order' && <ExternalArticleOrderSnapshotPreview snapshot={log.beforeSnapshot} otherSnapshot={log.afterSnapshot} color="rose" />}
                </PreviewColumn>
              )}
              {log.afterSnapshot && (
                <PreviewColumn label={isCreate ? 'Created' : 'After'} dotColor="bg-emerald-400" borderColor="border-emerald-200" bgColor="bg-emerald-50/20">
                  {log.entityType === 'product' && <ProductSnapshotPreview snapshot={log.afterSnapshot} changedFields={changedFields} color="emerald" otherSnapshot={log.beforeSnapshot} />}
                  {log.entityType === 'update' && <UpdateSnapshotPreview snapshot={log.afterSnapshot} changedFields={changedFields} color="emerald" />}
                  {log.entityType === 'blog' && <BlogSnapshotPreview snapshot={log.afterSnapshot} changedFields={changedFields} color="emerald" />}
                  {log.entityType === 'product_order' && <ProductOrderSnapshotPreview snapshot={log.afterSnapshot} otherSnapshot={log.beforeSnapshot} color="emerald" />}
                  {log.entityType === 'external_article' && <ExternalArticleSnapshotPreview snapshot={log.afterSnapshot} changedFields={changedFields} color="emerald" />}
                  {log.entityType === 'external_article_order' && <ExternalArticleOrderSnapshotPreview snapshot={log.afterSnapshot} otherSnapshot={log.beforeSnapshot} color="emerald" />}
                </PreviewColumn>
              )}
            </div>
          ) : (
            /* Fallback for old logs without snapshot data */
            <div className="space-y-7">
              {log.changes.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No tracked fields changed.</p>
              ) : (
                log.changes.map((change) => (
                  <div key={change.field}>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                      {FIELD_LABELS[change.field] ?? change.field}
                    </p>
                    <div className="flex gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-2 h-2 rounded-full bg-rose-300 flex-shrink-0" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Before</span>
                        </div>
                        <div className="bg-white border rounded-xl p-4 border-t-2 border-rose-200">
                          <FieldPreview field={change.field} value={change.before} entityType={log.entityType} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">After</span>
                        </div>
                        <div className="bg-white border rounded-xl p-4 border-t-2 border-emerald-300">
                          <FieldPreview field={change.field} value={change.after} entityType={log.entityType} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

export function LogsTable({ initialLogs, initialTotal }: LogsTableProps) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs)
  const [totalCount, setTotalCount] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)

  const hasMore = page * PAGE_SIZE < totalCount

  const loadMore = useCallback(async () => {
    const nextPage = page + 1
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/logs?page=${nextPage}`)
      if (!res.ok) return
      const data = await res.json()
      setLogs((prev) => [...prev, ...data.logs])
      setTotalCount(data.totalCount)
      setPage(nextPage)
    } finally {
      setLoading(false)
    }
  }, [page])

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
        <p className="text-slate-400 text-sm">No activity logged yet.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Who</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">What</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Summary of changes</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">When</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => {
                const isLast = i === logs.length - 1
                return (
                  <tr
                    key={log._id}
                    className={`${!isLast ? 'border-b border-slate-100' : ''} hover:bg-slate-50/60 cursor-pointer transition-colors`}
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{log.userName}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-slate-800 truncate">{log.entityTitle}</span>
                        <span className="text-xs text-slate-400">{ENTITY_LABELS[log.entityType]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex items-center gap-1 flex-wrap">
                        {log.action === 'create' && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 border border-green-100 text-green-700 font-semibold flex-shrink-0">Created</span>
                        )}
                        {log.action === 'delete' && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 border border-red-100 text-red-600 font-semibold flex-shrink-0">Deleted</span>
                        )}
                        {log.action === 'reorder' && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 font-semibold flex-shrink-0">
                            Reordered {log.entityType === 'external_article_order' ? 'articles' : 'products'}
                          </span>
                        )}
                        {log.action === 'update' && log.changes.length === 0 && (
                          <span className="text-[11px] text-slate-400 italic">No tracked changes</span>
                        )}
                        {log.action === 'update' && log.changes.slice(0, 3).map((c) => (
                          <span key={c.field} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-medium">
                            {FIELD_LABELS[c.field] ?? c.field}
                          </span>
                        ))}
                        {log.action === 'update' && log.changes.length > 3 && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 font-medium">
                            +{log.changes.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs">{formatDateShort(log.createdAt)}</span>
                        <span className="text-xs text-slate-400">{formatRelativeDate(log.createdAt)}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {hasMore && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={loadMore} disabled={loading} className="text-slate-500 hover:text-slate-800">
              {loading ? 'Loading…' : `Load more (${totalCount - logs.length} remaining)`}
            </Button>
          </div>
        )}
      </div>

      {selectedLog && (
        <DiffModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </>
  )
}
