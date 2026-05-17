'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface Tag {
  _id: string
  name: string
  slug: string
}

export function TagTable({ tags }: { tags: Tag[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Delete this tag? Updates using it will lose this tag.')) return
    setDeleting(id)
    try {
      await fetch(`/api/admin/tags/${id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setDeleting(null)
    }
  }

  if (tags.length === 0) {
    return <p className="text-sm text-slate-400 py-4">No tags yet.</p>
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {tags.map((tag, i) => (
            <tr key={tag._id} className={i < tags.length - 1 ? 'border-b border-slate-100' : ''}>
              <td className="px-4 py-3 font-medium text-slate-800">{tag.name}</td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(tag._id)}
                  disabled={deleting === tag._id}
                >
                  {deleting === tag._id ? '…' : <Trash2 size={14} />}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
