'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
]

interface Domain {
  _id: string
  name: string
}

interface ProductRow {
  _id: string
  name: string
  description?: string
  color: string
  domainId?: string
}

interface EditProductModalProps {
  product: ProductRow
  domains: Domain[]
  onClose: () => void
}

export function EditProductModal({ product, domains, onClose }: EditProductModalProps) {
  const router = useRouter()
  const [name, setName] = useState(product.name)
  const [description, setDescription] = useState(product.description || '')
  const [color, setColor] = useState(product.color)
  const [domainId, setDomainId] = useState(product.domainId || 'none')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/products/${product._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          color,
          domainId: domainId === 'none' ? null : domainId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to update product')
        return
      }
      router.refresh()
      onClose()
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Edit Product</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Product Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-sm"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Domain</Label>
            <Select value={domainId} onValueChange={setDomainId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="No domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No domain</SelectItem>
                {domains.map((d) => (
                  <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Color</Label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none"
                  style={{
                    backgroundColor: c,
                    boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined,
                  }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                title="Custom color"
              />
              <span className="text-xs text-slate-400 font-mono">{color}</span>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-4 text-sm"
            >
              {loading ? 'Saving...' : 'Save Changes'}
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
        </form>
      </div>
    </div>
  )
}
