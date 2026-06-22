'use client'

import { useState } from 'react'
import { UserTable } from './user-table'
import { AddUserForm } from './add-user-form'
import { BlogCategoryTable } from './blog-category-table'
import { AddBlogCategoryForm } from './add-blog-category-form'
import { HomepageProductsTab } from './homepage-products-tab'

type Tab = 'users' | 'blog-categories' | 'homepage'

interface SerializedUser {
  _id: string
  email: string
  name?: string
  role: 'public' | 'viewer' | 'admin'
  createdAt: string
}

interface SerializedProduct {
  _id: string
  name: string
  slug: string
  logoUrl?: string
  color: string
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
  blogCategories: SerializedBlogCategory[]
  featuredProductIds: (string | null)[]
  currentUserId: string
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'homepage', label: 'Homepage' },
  { id: 'blog-categories', label: 'Blog Categories' },
  { id: 'users', label: 'Users' },
]

export function AdminTabs({ users, products, domains, blogCategories, featuredProductIds, currentUserId }: AdminTabsProps) {
  const [tab, setTab] = useState<Tab>('homepage')

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
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Role permissions</p>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 inline-flex justify-center w-28 px-2 py-0.5 rounded-full border text-xs font-medium bg-stone-50 text-stone-500 border-stone-200">CPF Officer</span>
                <span className="text-xs text-slate-600 leading-relaxed">Can view the homepage, about us, products, and blog pages.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 inline-flex justify-center w-28 px-2 py-0.5 rounded-full border text-xs font-medium bg-slate-50 text-slate-600 border-slate-200">Management</span>
                <span className="text-xs text-slate-600 leading-relaxed">Everything CPF officers can see, plus the internal updates page.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 inline-flex justify-center w-28 px-2 py-0.5 rounded-full border text-xs font-medium bg-purple-50 text-purple-700 border-purple-100">AEO</span>
                <span className="text-xs text-slate-600 leading-relaxed">Full access — all pages above, plus the editor, admin, and metrics tracking.</span>
              </li>
            </ul>
          </div>
          <UserTable users={users} products={products} domains={domains} currentUserId={currentUserId} />
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

      {tab === 'homepage' && (
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Homepage</h2>
            <p className="text-xs text-slate-400 mt-0.5">Curate the products shown in the homepage constellation</p>
          </div>
          <HomepageProductsTab products={products} featuredIds={featuredProductIds} />
        </section>
      )}
    </div>
  )
}
