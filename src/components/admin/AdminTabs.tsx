'use client'

import { useState } from 'react'
import { UserTable } from './UserTable'
import { AddUserForm } from './AddUserForm'
import { DomainTable } from './DomainTable'
import { AddDomainForm } from './AddDomainForm'
import { TagTable } from './TagTable'
import { AddTagForm } from './AddTagForm'

type Tab = 'users' | 'domains' | 'tags'

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

interface SerializedTag {
  _id: string
  name: string
  slug: string
}

interface AdminTabsProps {
  users: SerializedUser[]
  domains: SerializedDomain[]
  tags: SerializedTag[]
  currentUserId: string
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'users', label: 'Users' },
  { id: 'domains', label: 'Sections' },
  { id: 'tags', label: 'Tags' },
]

export function AdminTabs({ users, domains, tags, currentUserId }: AdminTabsProps) {
  const [tab, setTab] = useState<Tab>('users')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-slate-100 pb-0 mb-8">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
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
              <h2 className="text-base font-semibold text-slate-900">Sections</h2>
              <p className="text-xs text-slate-400 mt-0.5">Top-level groupings (e.g. Team 1)</p>
            </div>
            <AddDomainForm users={users} />
          </div>
          <DomainTable domains={domains} users={users} />
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
