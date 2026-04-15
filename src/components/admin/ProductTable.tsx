'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EditProductModal } from './EditProductModal'

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
  domainName?: string
  updateCount: number
}

export function ProductTable({ products, domains }: { products: ProductRow[]; domains: Domain[] }) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null)

  async function handleDelete(product: ProductRow) {
    if (product.updateCount > 0) {
      alert(`Cannot delete "${product.name}" — it has ${product.updateCount} update(s). Remove or reassign them first.`)
      return
    }
    if (!confirm(`Delete product "${product.name}"? This cannot be undone.`)) return

    setDeletingId(product._id)
    try {
      const res = await fetch(`/api/products/${product._id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to delete product')
        return
      }
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
        <p className="text-slate-400 text-sm">No products yet.</p>
      </div>
    )
  }

  return (
    <>
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Domain</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-24 text-right">Updates</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product._id} className="hover:bg-slate-50/50">
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: product.color }} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{product.name}</p>
                      {product.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{product.description}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-slate-500">
                    {product.domainName || <span className="text-slate-300">—</span>}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-slate-500 text-right">
                  {product.updateCount}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingProduct(product)}
                      className="h-7 px-2 text-xs text-slate-400 hover:text-slate-700"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(product)}
                      disabled={deletingId === product._id}
                      className="h-7 px-2 text-xs text-slate-400 hover:text-red-600 disabled:opacity-40"
                    >
                      {deletingId === product._id ? '...' : 'Delete'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          domains={domains}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </>
  )
}
