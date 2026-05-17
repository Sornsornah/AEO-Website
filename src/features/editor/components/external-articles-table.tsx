'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GripVertical, Pencil, Trash2, Check, X, Plus, ExternalLink, Eye, EyeOff } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface ArticleRow {
  _id: string
  title: string
  description: string
  url: string
  order: number
  isHidden: boolean
}

const emptyForm = { title: '', description: '', url: '' }

function isSnapshot(a: ArticleRow[], b: ArticleRow[]) {
  return a.length === b.length && a.every((item, i) => item._id === b[i]._id && item.isHidden === b[i].isHidden)
}

export function ExternalArticlesTable({ articles: initial }: { articles: ArticleRow[] }) {
  const router = useRouter()
  const [articles, setArticles] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(emptyForm)
  const [addSaving, setAddSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null)
  const [toast, setToast] = useState(false)

  const isDirty = !isSnapshot(articles, saved)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(false), 3000)
    return () => clearTimeout(t)
  }, [toast])

  async function handleSaveFormatting() {
    setSaving(true)
    try {
      await fetch('/api/blog/external-articles/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: articles.map((a) => a._id) }),
      })
      const visibilityChanges = articles.filter((a) => {
        const s = saved.find((x) => x._id === a._id)
        return s && s.isHidden !== a.isHidden
      })
      await Promise.all(
        visibilityChanges.map((a) =>
          fetch(`/api/blog/external-articles/${a._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isHidden: a.isHidden }),
          })
        )
      )
      setSaved([...articles])
      setToast(true)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleAdd() {
    if (!addForm.title || !addForm.description || !addForm.url) return
    setAddSaving(true)
    try {
      const res = await fetch('/api/blog/external-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, order: 0 }),
      })
      if (res.ok) {
        const { _id } = await res.json()
        const newArticle = { ...addForm, _id, order: 0, isHidden: false }
        // Prepend so the newest appears at the top
        setArticles((prev) => [newArticle, ...prev])
        setSaved((prev) => [newArticle, ...prev])
        setAddForm(emptyForm)
        setShowAdd(false)
        router.refresh()
      }
    } finally {
      setAddSaving(false)
    }
  }

  function startEdit(article: ArticleRow) {
    setEditingId(article._id)
    setEditForm({ title: article.title, description: article.description, url: article.url })
  }

  async function handleSaveEdit(id: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/blog/external-articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        setArticles((prev) => prev.map((a) => a._id === id ? { ...a, ...editForm } : a))
        setSaved((prev) => prev.map((a) => a._id === id ? { ...a, ...editForm } : a))
        setEditingId(null)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleteConfirm(null)
    const res = await fetch(`/api/blog/external-articles/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setArticles((prev) => prev.filter((a) => a._id !== id))
      setSaved((prev) => prev.filter((a) => a._id !== id))
      router.refresh()
    }
  }

  function handleToggleHidden(id: string, currentlyHidden: boolean) {
    setArticles((prev) => prev.map((a) => a._id === id ? { ...a, isHidden: !currentlyHidden } : a))
  }

  // Drag-to-reorder (same pattern as EditorProductsList)
  const listRef = useRef<HTMLDivElement>(null)
  const articlesRef = useRef(articles)
  articlesRef.current = articles

  const startDrag = useCallback((e: React.PointerEvent<HTMLButtonElement>, id: string) => {
    e.preventDefault()
    let order = [...articlesRef.current]
    let draggedIdx = order.findIndex((a) => a._id === id)
    setDraggingId(id)

    function indexAtY(y: number): number {
      const list = listRef.current
      if (!list) return draggedIdx
      const children = Array.from(list.children) as HTMLElement[]
      for (let i = 0; i < children.length; i++) {
        const rect = children[i].getBoundingClientRect()
        if (y < rect.top + rect.height / 2) return i
      }
      return children.length - 1
    }

    function onMove(ev: PointerEvent) {
      const targetIdx = indexAtY(ev.clientY)
      if (targetIdx === draggedIdx) return
      const next = [...order]
      const [item] = next.splice(draggedIdx, 1)
      next.splice(targetIdx, 0, item)
      order = next
      draggedIdx = targetIdx
      setArticles([...next])
    }

    function onUp() {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      setDraggingId(null)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-4">
        <button
          onClick={handleSaveFormatting}
          disabled={!isDirty || saving}
          className="text-sm font-medium h-9 px-4 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-slate-300 text-slate-700 hover:bg-slate-50 enabled:hover:border-slate-400"
        >
          {saving ? 'Saving…' : 'Save formatting'}
        </button>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null) }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium h-9 px-4 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Article
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 border border-blue-200 bg-blue-50/50 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">New External Article</p>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Title *</label>
            <input
              value={addForm.title}
              onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Article title"
              autoFocus
              className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Description *</label>
            <textarea
              value={addForm.description}
              onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short description shown in the sidebar"
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">URL *</label>
            <input
              value={addForm.url}
              onChange={(e) => setAddForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://..."
              className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={addSaving || !addForm.title || !addForm.description || !addForm.url}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              {addSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setAddForm(emptyForm) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-sm transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {articles.length === 0 && !showAdd ? (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl">
          <p className="text-slate-400 text-sm font-medium mb-1">No external articles yet</p>
          <p className="text-slate-300 text-xs">Add articles to feature them in the blog sidebar</p>
        </div>
      ) : (
        <div ref={listRef} className="space-y-2">
          {articles.map((article) => (
            <div
              key={article._id}
              className={`flex items-start gap-3 p-4 border rounded-xl select-none transition-opacity duration-100 bg-white ${
                draggingId === article._id ? 'opacity-40 border-blue-300' : article.isHidden ? 'opacity-50 border-slate-200' : 'border-slate-200'
              }`}
            >
              <button
                onPointerDown={(e) => startDrag(e, article._id)}
                className="touch-none cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors p-0.5 flex-shrink-0 mt-0.5"
                aria-label="Drag to reorder"
              >
                <GripVertical className="w-4 h-4" />
              </button>

              {editingId === article._id ? (
                /* Inline edit form */
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <input
                      value={editForm.title}
                      onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Title"
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Description"
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                  <input
                    value={editForm.url}
                    onChange={(e) => setEditForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(article._id)}
                      disabled={saving}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-xs transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Read view */
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 leading-snug mb-0.5">{article.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-1">{article.description}</p>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                    {article.url.replace(/^https?:\/\//, '').split('/')[0]}
                  </a>
                </div>
              )}

              {editingId !== article._id && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleHidden(article._id, article.isHidden)}
                    className={`p-1.5 rounded-lg transition-colors ${article.isHidden ? 'text-slate-300 hover:text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                    title={article.isHidden ? 'Show article' : 'Hide article'}
                  >
                    {article.isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => startEdit(article)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ id: article._id, title: article.title })}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete article?"
        message={deleteConfirm ? `"${deleteConfirm.title}" will be permanently removed from the sidebar.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Toast */}
      <div
        className={`fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg transition-all duration-300 ${
          toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        Formatting saved
      </div>
    </div>
  )
}
