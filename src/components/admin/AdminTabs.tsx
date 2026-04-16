'use client'

import { useState } from 'react'
import { UserTable } from './UserTable'
import { AddUserForm } from './AddUserForm'
import { DomainTable } from './DomainTable'
import { AddDomainForm } from './AddDomainForm'
import { ProductTable } from './ProductTable'
import { AddProductForm } from './AddProductForm'
import { TagTable } from './TagTable'
import { AddTagForm } from './AddTagForm'

type Tab = 'users' | 'domains' | 'products' | 'tags'

interface SerializedUser {
  _id: string
  email: string
  name: string
  role: 'viewer' | 'admin'
  isWhitelisted: boolean
  createdAt: string
}

interface SerializedDomain {
  _id: string
  name: string
  slug: string
  description: string
  productCount: number
  members: { _id: string; name: string; email: string }[]
}

interface SerializedProduct {
  _id: string
  name: string
  slug: string
  description: string
  color: string
  domainId?: string
  domainName?: string
  updateCount: number
  websiteUrl?: string
  deckUrl?: string
  logoUrl?: string
  members: { _id: string; name: string; email: string }[]
}

interface SerializedTag {
  _id: string
  name: string
  slug: string
}

interface AdminTabsProps {
  users: SerializedUser[]
  domains: SerializedDomain[]
  products: SerializedProduct[]
  tags: SerializedTag[]
  currentUserId: string
}

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: 'users', label: 'Users', description: 'Manage access and roles' },
  { id: 'domains', label: 'Domains', description: 'Top-level groupings (e.g. Team 1)' },
  { id: 'products', label: 'Products', description: 'Products that updates are grouped under (e.g. API)' },
  { id: 'tags', label: 'Tags', description: 'Labels for categorizing updates' },
]

export function AdminTabs({ users, domains, products, tags, currentUserId }: AdminTabsProps) {
  const [tab, setTab] = useState<Tab>('users')

  const counts: Record<Tab, number> = {
    users: users.length,
    domains: domains.length,
    products: products.length,
    tags: tags.length,
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-slate-100 pb-0 mb-8">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
            <span className={`inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] text-[10px] font-semibold rounded-full px-1 ${
              tab === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {counts[id]}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'users' && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Users</h2>
              <p className="text-xs text-slate-400 mt-0.5">Manage access and roles</p>
            </div>
            <AddUserForm />
          </div>
          <UserTable users={users} currentUserId={currentUserId} />
        </section>
      )}

      {tab === 'domains' && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Domains</h2>
              <p className="text-xs text-slate-400 mt-0.5">Top-level groupings (e.g. Team 1)</p>
            </div>
            <AddDomainForm users={users} />
          </div>
          <DomainTable domains={domains} users={users} />
        </section>
      )}

      {tab === 'products' && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Products</h2>
              <p className="text-xs text-slate-400 mt-0.5">Products that updates are grouped under (e.g. API)</p>
            </div>
            <AddProductForm domains={domains} users={users} />
          </div>
          <ProductTable products={products} domains={domains} users={users} />
        </section>
      )}

      {tab === 'tags' && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Tags</h2>
              <p className="text-xs text-slate-400 mt-0.5">Labels for categorizing updates</p>
            </div>
            <AddTagForm />
          </div>
          <TagTable tags={tags} />
        </section>
      )}
    </div>
  )
}
