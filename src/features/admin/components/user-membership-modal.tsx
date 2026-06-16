'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface DomainRow {
  _id: string
  name: string
  members: { _id: string }[]
}

interface ProductRow {
  _id: string
  name: string
  members: { _id: string }[]
}

interface UserMembershipModalProps {
  user: { _id: string; name?: string }
  domains: DomainRow[]
  products: ProductRow[]
  onClose: () => void
}

export function UserMembershipModal({ user, domains, products, onClose }: UserMembershipModalProps) {
  const router = useRouter()

  const [selectedDomainIds, setSelectedDomainIds] = useState<Set<string>>(
    new Set(domains.filter((d) => d.members.some((m) => m._id === user._id)).map((d) => d._id))
  )
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(products.filter((p) => p.members.some((m) => m._id === user._id)).map((p) => p._id))
  )

  const [domainQuery, setDomainQuery] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const filteredDomains = domainQuery.trim()
    ? domains.filter((d) => d.name.toLowerCase().includes(domainQuery.toLowerCase()))
    : domains

  const filteredProducts = productQuery.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(productQuery.toLowerCase()))
    : products

  const allDomainsSelected = filteredDomains.length > 0 && filteredDomains.every((d) => selectedDomainIds.has(d._id))
  const someDomainsSelected = !allDomainsSelected && filteredDomains.some((d) => selectedDomainIds.has(d._id))
  const allProductsSelected = filteredProducts.length > 0 && filteredProducts.every((p) => selectedProductIds.has(p._id))
  const someProductsSelected = !allProductsSelected && filteredProducts.some((p) => selectedProductIds.has(p._id))

  const domainSelectAllRef = useRef<HTMLInputElement>(null)
  const productSelectAllRef = useRef<HTMLInputElement>(null)

  if (domainSelectAllRef.current) domainSelectAllRef.current.indeterminate = someDomainsSelected
  if (productSelectAllRef.current) productSelectAllRef.current.indeterminate = someProductsSelected

  function toggleDomain(id: string) {
    setSelectedDomainIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleProduct(id: string) {
    setSelectedProductIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllDomains() {
    setSelectedDomainIds((prev) => {
      const next = new Set(prev)
      if (allDomainsSelected) {
        filteredDomains.forEach((d) => next.delete(d._id))
      } else {
        filteredDomains.forEach((d) => next.add(d._id))
      }
      return next
    })
  }

  function toggleAllProducts() {
    setSelectedProductIds((prev) => {
      const next = new Set(prev)
      if (allProductsSelected) {
        filteredProducts.forEach((p) => next.delete(p._id))
      } else {
        filteredProducts.forEach((p) => next.add(p._id))
      }
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/users/${user._id}/memberships`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainIds: Array.from(selectedDomainIds),
          productIds: Array.from(selectedProductIds),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save memberships')
        return
      }
      router.refresh()
      onClose()
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Memberships</h3>
            <p className="text-xs text-slate-400 mt-0.5">{user.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Sections column */}
          <div className="flex-1 flex flex-col min-h-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex-shrink-0">Sections</p>
            {domains.length > 6 && (
              <input
                type="text"
                value={domainQuery}
                onChange={(e) => setDomainQuery(e.target.value)}
                placeholder="Filter sections…"
                className="w-full h-8 px-3 text-xs border border-slate-200 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-slate-300 flex-shrink-0"
              />
            )}
            {filteredDomains.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No sections found.</p>
            ) : (
              <div className="flex flex-col min-h-0">
                {/* Select all */}
                <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer border-b border-slate-100 mb-1 flex-shrink-0">
                  <input
                    ref={domainSelectAllRef}
                    type="checkbox"
                    checked={allDomainsSelected}
                    onChange={toggleAllDomains}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-500">Select all</span>
                </label>
                <div className="overflow-y-auto max-h-64 space-y-0.5">
                  {filteredDomains.map((d) => (
                    <label key={d._id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDomainIds.has(d._id)}
                        onChange={() => toggleDomain(d._id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">{d.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-px bg-slate-100 flex-shrink-0" />

          {/* Products column */}
          <div className="flex-1 flex flex-col min-h-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex-shrink-0">Products</p>
            {products.length > 6 && (
              <input
                type="text"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Filter products…"
                className="w-full h-8 px-3 text-xs border border-slate-200 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-slate-300 flex-shrink-0"
              />
            )}
            {filteredProducts.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No products found.</p>
            ) : (
              <div className="flex flex-col min-h-0">
                {/* Select all */}
                <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer border-b border-slate-100 mb-1 flex-shrink-0">
                  <input
                    ref={productSelectAllRef}
                    type="checkbox"
                    checked={allProductsSelected}
                    onChange={toggleAllProducts}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-500">Select all</span>
                </label>
                <div className="overflow-y-auto max-h-64 space-y-0.5">
                  {filteredProducts.map((p) => (
                    <label key={p._id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.has(p._id)}
                        onChange={() => toggleProduct(p._id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4 flex-shrink-0">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-5 flex-shrink-0">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-4 text-sm"
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="h-8 px-3 text-sm text-slate-500"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
