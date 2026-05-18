'use client'

import { useState } from 'react'
import { UserTable } from './user-table'
import { AddUserForm } from './add-user-form'
import { DomainTable } from './domain-table'
import { AddDomainForm } from './add-domain-form'
import { TagTable } from './tag-table'
import { AddTagForm } from './add-tag-form'
import { BlogCategoryTable } from './blog-category-table'
import { AddBlogCategoryForm } from './add-blog-category-form'
import { LogsTable, LogEntry } from './logs-table'
import { PageSettingsTable, PageSettingRow, EntityBannerRow } from './page-settings-table'

type Tab = 'users' | 'domains' | 'tags' | 'blog-categories' | 'pages' | 'logs'

interface SerializedUser {
  _id: string
  email: string
  name: string
  role: 'public' | 'viewer' | 'admin'
  createdAt: string
}

interface SerializedProduct {
  _id: string
  name: string
  members: { _id: string; name: string }[]
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

interface SerializedBlogCategory {
  _id: string
  name: string
  slug: string
  purpose?: string
  color: string
}

interface AdminTabsProps {
  users: SerializedUser[]
  products: SerializedProduct[]
  domains: SerializedDomain[]
  tags: SerializedTag[]
  blogCategories: SerializedBlogCategory[]
  pageSettings: PageSettingRow[]
  productBanners: EntityBannerRow[]
  blogBanners: EntityBannerRow[]
  currentUserId: string
  initialLogs: LogEntry[]
  initialLogsTotal: number
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'users', label: 'Users' },
  { id: 'domains', label: 'Sections' },
  { id: 'tags', label: 'Update Tags' },
  { id: 'blog-categories', label: 'Blog Categories' },
  { id: 'pages', label: 'Pages' },
  { id: 'logs', label: 'Logs' },
]

export function AdminTabs({ users, products, domains, tags, blogCategories, pageSettings, productBanners, blogBanners, currentUserId, initialLogs, initialLogsTotal }: AdminTabsProps) {
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
          <UserTable users={users} products={products} domains={domains} currentUserId={currentUserId} />
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
              <h2 className="text-base font-semibold text-slate-900">Update Tags</h2>
              <p className="text-xs text-slate-400 mt-0.5">Labels for categorizing updates</p>
            </div>
            <AddTagForm />
          </div>
          <TagTable tags={tags} />
        </section>
      )}

      {tab === 'blog-categories' && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Blog Categories</h2>
              <p className="text-xs text-slate-400 mt-0.5">Categories for blog posts with display colour</p>
            </div>
            <AddBlogCategoryForm />
          </div>
          <BlogCategoryTable categories={blogCategories} />
        </section>
      )}

      {tab === 'pages' && (
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Pages</h2>
            <p className="text-xs text-slate-400 mt-0.5">Toggle nav visibility, reorder, and configure banners for each page</p>
          </div>
          <PageSettingsTable settings={pageSettings} productBanners={productBanners} blogBanners={blogBanners} />
        </section>
      )}

      {tab === 'logs' && (
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Activity Log</h2>
            <p className="text-xs text-slate-400 mt-0.5">All content changes made by admins — click a row to see the diff</p>
          </div>
          <LogsTable initialLogs={initialLogs} initialTotal={initialLogsTotal} />
        </section>
      )}
    </div>
  )
}
