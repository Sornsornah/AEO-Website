'use client'

import { useState, useRef, useCallback, type ReactNode } from 'react'
import { GripVertical } from 'lucide-react'

export interface PageSettingRow {
  pageKey: string
  label: string
  href: string
  navEnabled: boolean
  order: number
  bannerEnabled: boolean
  bannerText: string
  bannerStyle: 'info' | 'warning' | 'success' | 'neutral'
  adminOnly: boolean
}

export interface EntityBannerRow {
  _id: string
  name: string
  slug: string
  bannerEnabled: boolean
  bannerText: string
  bannerStyle: 'info' | 'warning' | 'success' | 'neutral'
  followParentBanner: boolean
}

const BANNER_STYLES: { value: PageSettingRow['bannerStyle']; label: string }[] = [
  { value: 'warning', label: 'Warning (amber)' },
  { value: 'info', label: 'Info (blue)' },
  { value: 'success', label: 'Success (green)' },
  { value: 'neutral', label: 'Neutral (grey)' },
]

// ─── Static pages section ─────────────────────────────────────────────────────

function StaticPagesSection({ settings: initial }: { settings: PageSettingRow[] }) {
  const [settings, setSettings] = useState(initial)
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const savedRef = useRef(initial)
  const listRef = useRef<HTMLTableSectionElement>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedRef.current)

  const startDrag = useCallback((e: React.PointerEvent<HTMLButtonElement>, key: string) => {
    e.preventDefault()
    let order = [...settingsRef.current]
    let draggedIdx = order.findIndex((s) => s.pageKey === key)
    setDraggingKey(key)

    function indexAtY(y: number): number {
      const list = listRef.current
      if (!list) return draggedIdx
      const rows = Array.from(list.children) as HTMLElement[]
      for (let i = 0; i < rows.length; i++) {
        const rect = rows[i].getBoundingClientRect()
        if (y < rect.top + rect.height / 2) return i
      }
      return rows.length - 1
    }

    function onMove(ev: PointerEvent) {
      const targetIdx = indexAtY(ev.clientY)
      if (targetIdx === draggedIdx) return
      const next = [...order]
      const [item] = next.splice(draggedIdx, 1)
      next.splice(targetIdx, 0, item)
      order = next
      draggedIdx = targetIdx
      setSettings([...next])
    }

    function onUp() {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      setDraggingKey(null)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [])

  function handleToggle(pageKey: string, field: 'navEnabled' | 'bannerEnabled', value: boolean) {
    setSettings((prev) => prev.map((s) => s.pageKey === pageKey ? { ...s, [field]: value } : s))
    setSaved(false)
  }

  function handleStyleChange(pageKey: string, bannerStyle: PageSettingRow['bannerStyle']) {
    setSettings((prev) => prev.map((s) => s.pageKey === pageKey ? { ...s, bannerStyle } : s))
    setSaved(false)
  }

  function handleTextChange(pageKey: string, value: string) {
    setSettings((prev) => prev.map((s) => s.pageKey === pageKey ? { ...s, bannerText: value } : s))
    setSaved(false)
  }

  function handleLabelChange(pageKey: string, value: string) {
    setSettings((prev) => prev.map((s) => s.pageKey === pageKey ? { ...s, label: value } : s))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    const current = settingsRef.current
    const prev = savedRef.current
    const orderChanged = current.map((s) => s.pageKey).join() !== prev.map((s) => s.pageKey).join()

    try {
      await Promise.all([
        ...current.map(async (s) => {
          const old = prev.find((p) => p.pageKey === s.pageKey)
          if (!old) return
          const update: Partial<PageSettingRow> = {}
          if (s.label !== old.label) update.label = s.label
          if (s.navEnabled !== old.navEnabled) update.navEnabled = s.navEnabled
          if (s.bannerEnabled !== old.bannerEnabled) update.bannerEnabled = s.bannerEnabled
          if (s.bannerText !== old.bannerText) update.bannerText = s.bannerText
          if (s.bannerStyle !== old.bannerStyle) update.bannerStyle = s.bannerStyle
          if (Object.keys(update).length === 0) return
          const res = await fetch(`/api/admin/page-settings/${s.pageKey}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(update),
          })
          if (!res.ok) throw new Error(`Failed to save "${s.label}": ${res.status} ${res.statusText}`)
        }),
        orderChanged
          ? (async () => {
              const res = await fetch('/api/admin/page-settings/reorder', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: current.map((s) => s.pageKey) }),
              })
              if (!res.ok) throw new Error(`Failed to reorder pages: ${res.status} ${res.statusText}`)
            })()
          : Promise.resolve(),
      ])

      savedRef.current = current
      setSaved(true)
      window.location.reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-3">
        {saved && !isDirty && (
          <span className="text-xs text-emerald-600">Saved</span>
        )}
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-3 py-2.5 w-8" />
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Page</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Nav Label</th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">In Nav</th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Banner</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Banner Style</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Banner Text</th>
            </tr>
          </thead>
          <tbody ref={listRef}>
            {settings.map((s, i) => {
              const isDragging = draggingKey === s.pageKey
              return (
                <tr
                  key={s.pageKey}
                  className={`${i < settings.length - 1 ? 'border-b border-slate-100' : ''} ${isDragging ? 'opacity-50 bg-slate-50' : 'hover:bg-slate-50/50'} transition-opacity`}
                >
                  <td className="px-3 py-3">
                    <button
                      onPointerDown={(e) => startDrag(e, s.pageKey)}
                      className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 touch-none"
                    >
                      <GripVertical size={14} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-500">{s.href}</span>
                    {s.adminOnly && (
                      <span className="ml-1.5 text-[10px] font-medium bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">admin</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={s.label}
                      onChange={(e) => handleLabelChange(s.pageKey, e.target.value)}
                      className="text-sm text-slate-800 border border-transparent hover:border-slate-200 focus:border-slate-300 focus:outline-none rounded px-2 py-1 w-full bg-transparent focus:bg-white transition-colors"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(s.pageKey, 'navEnabled', !s.navEnabled)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${s.navEnabled ? 'bg-slate-900' : 'bg-slate-200'}`}
                      role="switch"
                      aria-checked={s.navEnabled}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${s.navEnabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(s.pageKey, 'bannerEnabled', !s.bannerEnabled)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${s.bannerEnabled ? 'bg-slate-900' : 'bg-slate-200'}`}
                      role="switch"
                      aria-checked={s.bannerEnabled}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${s.bannerEnabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={s.bannerStyle}
                      onChange={(e) => handleStyleChange(s.pageKey, e.target.value as PageSettingRow['bannerStyle'])}
                      disabled={!s.bannerEnabled}
                      className="text-xs border border-slate-200 rounded px-2 py-1.5 text-slate-700 bg-white disabled:opacity-40 focus:outline-none focus:border-slate-400"
                    >
                      {BANNER_STYLES.map((bs) => (
                        <option key={bs.value} value={bs.value}>{bs.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 min-w-[260px]">
                    <textarea
                      value={s.bannerText}
                      onChange={(e) => handleTextChange(s.pageKey, e.target.value)}
                      disabled={!s.bannerEnabled}
                      maxLength={280}
                      rows={2}
                      placeholder="Banner message…"
                      className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 text-slate-700 bg-white disabled:opacity-40 focus:outline-none focus:border-slate-400 resize-none"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Entity banner section (products or blog posts) ───────────────────────────

function EntityBannerSection({
  entities: initial,
  apiBasePath,
  parentLabel,
}: {
  entities: EntityBannerRow[]
  apiBasePath: string
  parentLabel: string
}) {
  const [entities, setEntities] = useState(initial)
  const [saving, setSaving] = useState(false)

  const savedRef = useRef(initial)
  const entitiesRef = useRef(entities)
  entitiesRef.current = entities

  const isDirty = JSON.stringify(entities) !== JSON.stringify(savedRef.current)

  function handleFollowParent(id: string, value: boolean) {
    setEntities((prev) => prev.map((e) => e._id === id ? { ...e, followParentBanner: value } : e))
  }

  function handleToggle(id: string, value: boolean) {
    setEntities((prev) => prev.map((e) => e._id === id ? { ...e, bannerEnabled: value } : e))
  }

  function handleStyleChange(id: string, bannerStyle: EntityBannerRow['bannerStyle']) {
    setEntities((prev) => prev.map((e) => e._id === id ? { ...e, bannerStyle } : e))
  }

  function handleTextChange(id: string, value: string) {
    setEntities((prev) => prev.map((e) => e._id === id ? { ...e, bannerText: value } : e))
  }

  async function handleSave() {
    setSaving(true)
    const current = entitiesRef.current
    const prev = savedRef.current

    try {
      const results = await Promise.all(
        current.map(async (e) => {
          const old = prev.find((p) => p._id === e._id)
          if (!old) return
          const update: Partial<EntityBannerRow> = {}
          if (e.followParentBanner !== old.followParentBanner) update.followParentBanner = e.followParentBanner
          if (e.bannerEnabled !== old.bannerEnabled) update.bannerEnabled = e.bannerEnabled
          if (e.bannerText !== old.bannerText) update.bannerText = e.bannerText
          if (e.bannerStyle !== old.bannerStyle) update.bannerStyle = e.bannerStyle
          if (Object.keys(update).length === 0) return
          const res = await fetch(`${apiBasePath}/${e._id}/banner`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(update),
          })
          if (!res.ok) throw new Error(`Failed to save "${e.name}": ${res.status} ${res.statusText}`)
        })
      )
      void results
      savedRef.current = current
      window.location.reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (entities.length === 0) {
    return <p className="text-xs text-slate-400 py-4">No entries yet.</p>
  }

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-3">
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Page</th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Follow {parentLabel}</th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Own Banner</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Banner Style</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Banner Text</th>
            </tr>
          </thead>
          <tbody>
            {entities.map((e, i) => {
              const overridden = e.followParentBanner
              return (
                <tr
                  key={e._id}
                  className={`${i < entities.length - 1 ? 'border-b border-slate-100' : ''} hover:bg-slate-50/50`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800 text-xs">{e.name}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleFollowParent(e._id, !e.followParentBanner)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${overridden ? 'bg-slate-900' : 'bg-slate-200'}`}
                      role="switch"
                      aria-checked={overridden}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${overridden ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(e._id, !e.bannerEnabled)}
                      disabled={overridden}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 ${e.bannerEnabled ? 'bg-slate-900' : 'bg-slate-200'}`}
                      role="switch"
                      aria-checked={e.bannerEnabled}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${e.bannerEnabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={e.bannerStyle}
                      onChange={(ev) => handleStyleChange(e._id, ev.target.value as EntityBannerRow['bannerStyle'])}
                      disabled={overridden || !e.bannerEnabled}
                      className="text-xs border border-slate-200 rounded px-2 py-1.5 text-slate-700 bg-white disabled:opacity-40 focus:outline-none focus:border-slate-400"
                    >
                      {BANNER_STYLES.map((bs) => (
                        <option key={bs.value} value={bs.value}>{bs.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 min-w-[260px]">
                    <textarea
                      value={e.bannerText}
                      onChange={(ev) => handleTextChange(e._id, ev.target.value)}
                      disabled={overridden || !e.bannerEnabled}
                      maxLength={280}
                      rows={2}
                      placeholder="Banner message…"
                      className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 text-slate-700 bg-white disabled:opacity-40 focus:outline-none focus:border-slate-400 resize-none"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Top-level export ─────────────────────────────────────────────────────────

type SubTab = 'static' | 'products' | 'blog'

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'static', label: 'Static pages' },
  { id: 'products', label: 'Product detail pages' },
  { id: 'blog', label: 'Blog article pages' },
]

function SubTabBar({ active, onChange }: { active: SubTab; onChange: (t: SubTab) => void }) {
  return (
    <div className="flex items-center gap-1 border-b border-slate-100 mb-6">
      {SUB_TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
            active === id
              ? 'border-slate-700 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function PageSettingsTable({
  settings,
  productBanners,
  blogBanners,
}: {
  settings: PageSettingRow[]
  productBanners: EntityBannerRow[]
  blogBanners: EntityBannerRow[]
}) {
  const [subTab, setSubTab] = useState<SubTab>('static')

  const panels: Record<SubTab, ReactNode> = {
    static: <StaticPagesSection settings={settings} />,
    products: (
      <EntityBannerSection
        key="products"
        entities={productBanners}
        apiBasePath="/api/admin/products"
        parentLabel="Products page"
      />
    ),
    blog: (
      <EntityBannerSection
        key="blog"
        entities={blogBanners}
        apiBasePath="/api/admin/blog"
        parentLabel="Blog page"
      />
    ),
  }

  return (
    <div>
      <SubTabBar active={subTab} onChange={setSubTab} />
      {panels[subTab]}
    </div>
  )
}
