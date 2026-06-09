'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatCard } from './stat-card'
import { BarMetricChart, LineMetricChart } from './metric-chart'
import { SortHead, useSort } from './sortable'
import { UserActivityTab } from './user-activity-tab'
import {
  isValidDateRange,
  dateInputToStartIso,
  dateInputToEndIso,
  todayDateInput,
} from '@/lib/date'

interface ProductRow {
  productId: string
  name: string
  views: number
  uniqueViewers: number
  visitWebsiteClicks: number
  shares: number
}

interface BlogPostRow {
  postId: string
  title: string
  author: string
  category: string
  views: number
  uniqueViewers: number
  likes: number
  comments: number
  shares: number
}

interface ContributorRow {
  authorId: string
  author: string
  posts: number
  views: number
  likes: number
  comments: number
  shares: number
}

interface BlogCategoryRow {
  category: string
  views: number
  uniqueViewers: number
  likes: number
  comments: number
  shares: number
}

interface MetricsResponse {
  range: { from: string; to: string }
  acquisition: {
    usersByRole: Record<string, number>
    totalUsers: number
    newUsersPerDay: { date: string; count: number }[]
    siteAccessPerDay: { date: string; count: number }[]
    uniqueActiveUsers: number
  }
  activation: {
    products: ProductRow[]
    blogPosts: BlogPostRow[]
    blogCategories: BlogCategoryRow[]
    topContributors: ContributorRow[]
  }
  retention: {
    uniqueBlogViewersLastMonth: number
    authorsInRange: number
    firstTimeAuthors: number
  }
}

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'products', label: 'Products' },
  { id: 'blogs', label: 'Blogs' },
  { id: 'user-activity', label: 'User Activity' },
] as const
type TabId = (typeof TABS)[number]['id']

const PRESETS = [
  { label: '24 hours', value: '1' },
  { label: '7 days', value: '7' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
] as const

const COLORS = {
  blue: '#2563eb',
  green: '#16a34a',
  amber: '#d97706',
  violet: '#7c3aed',
  rose: '#e11d48',
  slate: '#64748b',
}

export function DashboardClient() {
  const [tab, setTab] = useState<TabId>('general')
  const [rangeMode, setRangeMode] = useState<string>('30') // preset value or 'custom'
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  // Custom range is only applied once both ends are valid and correctly ordered.
  const customValid = isValidDateRange(customFrom, customTo)
  const customInvalid = rangeMode === 'custom' && Boolean(customFrom) && Boolean(customTo) && !customValid

  const range = useMemo(() => {
    const to = new Date()
    if (rangeMode === 'custom' && customValid) {
      const from = dateInputToStartIso(customFrom)
      const toIso = dateInputToEndIso(customTo)
      if (from && toIso) return { from, to: toIso }
    }
    const days = Number(rangeMode) || 30
    return { from: new Date(to.getTime() - days * 24 * 60 * 60 * 1000).toISOString(), to: to.toISOString() }
  }, [rangeMode, customFrom, customTo, customValid])

  const todayStr = todayDateInput()

  const { data, isLoading, isError } = useQuery<MetricsResponse>({
    queryKey: ['dashboard-metrics', range.from, range.to],
    queryFn: () =>
      fetch(`/api/dashboard/metrics?from=${range.from}&to=${range.to}`).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      }),
  })

  return (
    <div className="space-y-8">
      {/* Tabs (left) + date filter (right) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                tab === t.id ? 'bg-[#1C1512] text-white font-medium' : 'text-stone-500 hover:bg-stone-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setRangeMode(p.value)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                rangeMode === p.value ? 'bg-[#1C1512] text-white font-medium' : 'text-stone-500 hover:bg-stone-100'
              }`}
            >
              {p.label}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-stone-200" />
          <input
            type="date"
            value={customFrom}
            max={customTo || todayStr}
            onChange={(e) => {
              setCustomFrom(e.target.value)
              setRangeMode('custom')
            }}
            className={`rounded-lg border px-2 py-1 text-sm text-stone-600 ${
              customInvalid ? 'border-red-400' : rangeMode === 'custom' ? 'border-[#1C1512]' : 'border-stone-200'
            }`}
          />
          <span className="text-stone-400">–</span>
          <input
            type="date"
            value={customTo}
            min={customFrom || undefined}
            max={todayStr}
            onChange={(e) => {
              setCustomTo(e.target.value)
              setRangeMode('custom')
            }}
            className={`rounded-lg border px-2 py-1 text-sm text-stone-600 ${
              customInvalid ? 'border-red-400' : rangeMode === 'custom' ? 'border-[#1C1512]' : 'border-stone-200'
            }`}
          />
        </div>
      </div>

      {customInvalid && (
        <p className="text-sm text-red-500">
          Select a valid date range — the start date must be on or before the end date.
        </p>
      )}

      {tab === 'user-activity' ? (
        <UserActivityTab range={range} />
      ) : (
        <>
          {isLoading && <p className="text-sm text-slate-400">Loading metrics…</p>}
          {isError && <p className="text-sm text-red-500">Failed to load metrics. Try again.</p>}
          {data && (
            <>
              {tab === 'general' && <GeneralTab data={data} />}
              {tab === 'products' && <ProductsTab data={data} />}
              {tab === 'blogs' && <BlogsTab data={data} />}
            </>
          )}
        </>
      )}
    </div>
  )
}

function GeneralTab({ data }: { data: MetricsResponse }) {
  const a = data.acquisition
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total users" value={a.totalUsers} />
        <StatCard label="Active users" value={a.uniqueActiveUsers} hint="unique site visits in range" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Site access over time</CardTitle>
            <CardDescription>Unique users accessing the site per day</CardDescription>
          </CardHeader>
          <CardContent>
            <LineMetricChart
              data={a.siteAccessPerDay}
              xKey="date"
              series={[{ key: 'count', name: 'Active users', color: COLORS.blue }]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>New users over time</CardTitle>
            <CardDescription>New accounts logged in</CardDescription>
          </CardHeader>
          <CardContent>
            <BarMetricChart
              data={a.newUsersPerDay}
              xKey="date"
              series={[{ key: 'count', name: 'New users', color: COLORS.green }]}
            />
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function ProductsTab({ data }: { data: MetricsResponse }) {
  const { sorted, sort, toggle } = useSort<ProductRow, keyof ProductRow & string>(
    data.activation.products,
    { key: 'views', dir: 'desc' }
  )
  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Product engagement</CardTitle>
          <CardDescription>Views, &ldquo;Visit website&rdquo; clicks and shares per product</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BarMetricChart
            data={data.activation.products.slice(0, 15)}
            xKey="name"
            series={[
              { key: 'views', name: 'Views', color: COLORS.blue },
              { key: 'visitWebsiteClicks', name: 'Visit website', color: COLORS.green },
              { key: 'shares', name: 'Shares', color: COLORS.amber },
            ]}
          />
          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-stone-100">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <SortHead label="Product" sortKey="name" sort={sort} onToggle={toggle} align="left" defaultDir="asc" />
                  <SortHead label="Views" sortKey="views" sort={sort} onToggle={toggle} />
                  <SortHead label="Unique users" sortKey="uniqueViewers" sort={sort} onToggle={toggle} />
                  <SortHead label="Visit clicks" sortKey="visitWebsiteClicks" sort={sort} onToggle={toggle} />
                  <SortHead label="Shares" sortKey="shares" sort={sort} onToggle={toggle} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-slate-400">No product activity yet.</TableCell></TableRow>
                )}
                {sorted.map((p) => (
                  <TableRow key={p.productId}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.views}</TableCell>
                    <TableCell className="text-right">{p.uniqueViewers}</TableCell>
                    <TableCell className="text-right">{p.visitWebsiteClicks}</TableCell>
                    <TableCell className="text-right">{p.shares}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

function BlogsTab({ data }: { data: MetricsResponse }) {
  const { blogPosts, blogCategories, topContributors } = data.activation
  const r = data.retention
  const posts = useSort<BlogPostRow, keyof BlogPostRow & string>(blogPosts, { key: 'views', dir: 'desc' })
  const cats = useSort<BlogCategoryRow, keyof BlogCategoryRow & string>(blogCategories, { key: 'views', dir: 'desc' })
  const contributors = useSort<ContributorRow, keyof ContributorRow & string>(topContributors, { key: 'views', dir: 'desc' })

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Blog viewers" value={r.uniqueBlogViewersLastMonth} hint="unique viewers" />
        <StatCard label="Active authors" value={r.authorsInRange} hint="posted in range" />
        <StatCard label="First-time authors" value={r.firstTimeAuthors} hint="first post in range" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top contributors</CardTitle>
          <CardDescription>Posts and engagement aggregated per author</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-stone-100">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <SortHead label="Author" sortKey="author" sort={contributors.sort} onToggle={contributors.toggle} align="left" defaultDir="asc" />
                  <SortHead label="Posts" sortKey="posts" sort={contributors.sort} onToggle={contributors.toggle} />
                  <SortHead label="Views" sortKey="views" sort={contributors.sort} onToggle={contributors.toggle} />
                  <SortHead label="Likes" sortKey="likes" sort={contributors.sort} onToggle={contributors.toggle} />
                  <SortHead label="Comments" sortKey="comments" sort={contributors.sort} onToggle={contributors.toggle} />
                  <SortHead label="Shares" sortKey="shares" sort={contributors.sort} onToggle={contributors.toggle} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributors.sorted.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-slate-400">No contributors yet.</TableCell></TableRow>
                )}
                {contributors.sorted.map((c) => (
                  <TableRow key={c.authorId}>
                    <TableCell className="font-medium max-w-[220px] truncate">{c.author}</TableCell>
                    <TableCell className="text-right">{c.posts}</TableCell>
                    <TableCell className="text-right">{c.views}</TableCell>
                    <TableCell className="text-right">{c.likes}</TableCell>
                    <TableCell className="text-right">{c.comments}</TableCell>
                    <TableCell className="text-right">{c.shares}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Blog engagement by category</CardTitle>
          <CardDescription>Views, likes, comments and shares aggregated per category</CardDescription>
        </CardHeader>
        <CardContent>
          <BarMetricChart
            data={blogCategories}
            xKey="category"
            series={[
              { key: 'views', name: 'Views', color: COLORS.blue },
              { key: 'likes', name: 'Likes', color: COLORS.rose },
              { key: 'comments', name: 'Comments', color: COLORS.violet },
              { key: 'shares', name: 'Shares', color: COLORS.amber },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category breakdown</CardTitle>
          <CardDescription>Views, likes, comments and shares per category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-stone-100">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <SortHead label="Category" sortKey="category" sort={cats.sort} onToggle={cats.toggle} align="left" defaultDir="asc" />
                  <SortHead label="Views" sortKey="views" sort={cats.sort} onToggle={cats.toggle} />
                  <SortHead label="Likes" sortKey="likes" sort={cats.sort} onToggle={cats.toggle} />
                  <SortHead label="Comments" sortKey="comments" sort={cats.sort} onToggle={cats.toggle} />
                  <SortHead label="Shares" sortKey="shares" sort={cats.sort} onToggle={cats.toggle} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cats.sorted.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-slate-400">No blog activity yet.</TableCell></TableRow>
                )}
                {cats.sorted.map((c) => (
                  <TableRow key={c.category}>
                    <TableCell className="font-medium">{c.category}</TableCell>
                    <TableCell className="text-right">{c.views}</TableCell>
                    <TableCell className="text-right">{c.likes}</TableCell>
                    <TableCell className="text-right">{c.comments}</TableCell>
                    <TableCell className="text-right">{c.shares}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top blog posts</CardTitle>
          <CardDescription>Views, likes, comments and shares per article</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-stone-100">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <SortHead label="Post" sortKey="title" sort={posts.sort} onToggle={posts.toggle} align="left" defaultDir="asc" />
                  <SortHead label="Author" sortKey="author" sort={posts.sort} onToggle={posts.toggle} align="left" defaultDir="asc" />
                  <TableHead>Category</TableHead>
                  <SortHead label="Views" sortKey="views" sort={posts.sort} onToggle={posts.toggle} />
                  <SortHead label="Likes" sortKey="likes" sort={posts.sort} onToggle={posts.toggle} />
                  <SortHead label="Comments" sortKey="comments" sort={posts.sort} onToggle={posts.toggle} />
                  <SortHead label="Shares" sortKey="shares" sort={posts.sort} onToggle={posts.toggle} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.sorted.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-slate-400">No blog activity yet.</TableCell></TableRow>
                )}
                {posts.sorted.map((p) => (
                  <TableRow key={p.postId}>
                    <TableCell className="font-medium max-w-[260px] truncate">{p.title}</TableCell>
                    <TableCell className="text-slate-500 max-w-[160px] truncate">{p.author}</TableCell>
                    <TableCell className="text-slate-500">{p.category}</TableCell>
                    <TableCell className="text-right">{p.views}</TableCell>
                    <TableCell className="text-right">{p.likes}</TableCell>
                    <TableCell className="text-right">{p.comments}</TableCell>
                    <TableCell className="text-right">{p.shares}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
