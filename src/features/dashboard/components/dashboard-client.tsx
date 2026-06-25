'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { CalendarDays } from 'lucide-react'
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
import { ExportModal } from './export-modal'
import { ProductUsersModal, type ProductUserAction } from './product-users-modal'
import { DateRangePicker } from '@/components/ui/date-range-picker'
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
  uniqueVisitWebsiteClicks: number
  shares: number
  uniqueShares: number
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
  uniqueShares: number
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
  uniqueShares: number
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
    blogViewers: number
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
  // lighter shades used for the "unique" companion series on each chart
  blueLight: '#93c5fd',
  greenLight: '#86efac',
  amberLight: '#fcd34d',
}

export function DashboardClient() {
  const [tab, setTab] = useState<TabId>('general')
  const [exportOpen, setExportOpen] = useState(false)
  const [rangeMode, setRangeMode] = useState<string>('30') // preset value or 'custom'
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  // Custom range is only applied once both ends are valid and correctly ordered.
  const customValid = isValidDateRange(customFrom, customTo)
  const customActive = rangeMode === 'custom'
  const customComplete = Boolean(customFrom) && Boolean(customTo)
  // Both dates keyed in but the pair is invalid (bad calendar date or end before start).
  const customInvalid = customActive && customComplete && !customValid
  // Custom selected but only one end keyed in — nothing to apply yet.
  const customIncomplete = customActive && !customComplete

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

  // Human-readable summary of the range actually driving the metrics below —
  // reflects the real window shown, including the 30-day fallback for an
  // incomplete custom range.
  const activePreset = PRESETS.find((p) => p.value === rangeMode)
  const rangeLabel = `${format(new Date(range.from), 'd MMM yyyy')} – ${format(new Date(range.to), 'd MMM yyyy')}`

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
      {/* Active-range indicator (left) + Download CSV (right) — above the date range selector, on every tab */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <CalendarDays className="h-4 w-4 flex-shrink-0 text-stone-400" />
          <span>
            Showing metrics for{' '}
            <span className="font-semibold text-stone-900">{rangeLabel}</span>
            {activePreset && <span className="text-stone-400"> · last {activePreset.label}</span>}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExportOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1C1512] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#2c211b]"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M10 2.5a.75.75 0 01.75.75v7.19l2.22-2.22a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 111.06-1.06l2.22 2.22V3.25A.75.75 0 0110 2.5z" />
            <path d="M3.5 12.75a.75.75 0 01.75.75v1.25c0 .414.336.75.75.75h10a.75.75 0 00.75-.75V13.5a.75.75 0 011.5 0v1.25A2.25 2.25 0 0115 17H5a2.25 2.25 0 01-2.25-2.25V13.5a.75.75 0 01.75-.75z" />
          </svg>
          Download CSV
        </button>
      </div>

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
          <DateRangePicker
            from={customFrom}
            to={customTo}
            max={todayStr}
            active={rangeMode === 'custom'}
            invalid={customInvalid}
            onChange={(f, t) => {
              setCustomFrom(f)
              setCustomTo(t)
              setRangeMode('custom')
            }}
          />
        </div>
      </div>

      {customInvalid && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 text-red-700"
        >
          <svg className="mt-0.5 h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <div className="text-sm">
            <p className="font-semibold">Invalid date range</p>
            <p>The start date must be on or before the end date. Pick valid dates to continue.</p>
          </div>
        </div>
      )}
      {customIncomplete && (
        <p className="text-sm text-stone-400">
          Pick both a start and end date to apply a custom range — showing the last 30 days until then.
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
              {tab === 'products' && <ProductsTab data={data} range={range} />}
              {tab === 'blogs' && <BlogsTab data={data} />}
            </>
          )}
        </>
      )}

      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} />}
    </div>
  )
}

function GeneralTab({ data }: { data: MetricsResponse }) {
  const a = data.acquisition
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total users" value={a.totalUsers} hint="visited at least once" />
        <StatCard label="Active users" value={a.uniqueActiveUsers} hint="unique visitors in range" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New users over time</CardTitle>
            <CardDescription>New users (first visit) accessing the site per day</CardDescription>
          </CardHeader>
          <CardContent>
            <BarMetricChart
              data={a.newUsersPerDay}
              xKey="date"
              series={[{ key: 'count', name: 'New users', color: COLORS.green }]}
            />
          </CardContent>
        </Card>
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
      </div>
    </section>
  )
}

function ProductsTab({ data, range }: { data: MetricsResponse; range: { from: string; to: string } }) {
  const { sorted, sort, toggle } = useSort<ProductRow, keyof ProductRow & string>(
    data.activation.products,
    { key: 'views', dir: 'desc' }
  )
  // Drill-down modal state for a clicked unique metric.
  const [drill, setDrill] = useState<
    { productId: string; productName: string; action: ProductUserAction; actionLabel: string } | null
  >(null)

  // A unique-count cell that opens the per-user drill-down when clicked.
  function UniqueCell({ value, product, action, actionLabel }: {
    value: number
    product: ProductRow
    action: ProductUserAction
    actionLabel: string
  }) {
    return (
      <TableCell className="text-right">
        <button
          type="button"
          onClick={() => setDrill({ productId: product.productId, productName: product.name, action, actionLabel })}
          className="font-medium text-blue-600 underline-offset-2 hover:underline disabled:cursor-default disabled:text-slate-400 disabled:no-underline"
          disabled={value === 0}
          title={value > 0 ? 'View users' : undefined}
        >
          {value}
        </button>
      </TableCell>
    )
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Product engagement</CardTitle>
          <CardDescription>
            <span className="block">Views: Number of times the product detail page has been accessed</span>
            <span className="block">Unique Views: Number of unique users who visited the product detail page</span>
            <span className="block">Visit Clicks: Number of times users click on &ldquo;Visit Website&rdquo;</span>
            <span className="block">Unique Visit Clicks: Number of unique users that click on &ldquo;Visit Website&rdquo;</span>
            <span className="block">Shares: Number of times users click on &ldquo;Share&rdquo;</span>
            <span className="block">Unique Shares: Number of unique users that click on &ldquo;Share&rdquo;</span>
            <span className="mt-2 block text-stone-400">Click a unique value to see the users who performed that action.</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BarMetricChart
            data={sorted}
            xKey="name"
            scrollX
            series={[
              { key: 'uniqueViewers', name: 'Unique views', color: COLORS.blue },
              { key: 'uniqueVisitWebsiteClicks', name: 'Unique visit clicks', color: COLORS.green },
              { key: 'uniqueShares', name: 'Unique shares', color: COLORS.amber },
            ]}
          />
          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-stone-100">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <SortHead label="Product" sortKey="name" sort={sort} onToggle={toggle} align="left" defaultDir="asc" />
                  <SortHead label="Views" sortKey="views" sort={sort} onToggle={toggle} />
                  <SortHead label="Unique views" sortKey="uniqueViewers" sort={sort} onToggle={toggle} />
                  <SortHead label="Visit clicks" sortKey="visitWebsiteClicks" sort={sort} onToggle={toggle} />
                  <SortHead label="Unique visit clicks" sortKey="uniqueVisitWebsiteClicks" sort={sort} onToggle={toggle} />
                  <SortHead label="Shares" sortKey="shares" sort={sort} onToggle={toggle} />
                  <SortHead label="Unique shares" sortKey="uniqueShares" sort={sort} onToggle={toggle} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-slate-400">No product activity yet.</TableCell></TableRow>
                )}
                {sorted.map((p) => (
                  <TableRow key={p.productId}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.views}</TableCell>
                    <UniqueCell value={p.uniqueViewers} product={p} action="product_view" actionLabel="Unique views" />
                    <TableCell className="text-right">{p.visitWebsiteClicks}</TableCell>
                    <UniqueCell value={p.uniqueVisitWebsiteClicks} product={p} action="product_visit_website" actionLabel="Unique visit clicks" />
                    <TableCell className="text-right">{p.shares}</TableCell>
                    <UniqueCell value={p.uniqueShares} product={p} action="product_share" actionLabel="Unique shares" />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {drill && (
        <ProductUsersModal
          productId={drill.productId}
          productName={drill.productName}
          action={drill.action}
          actionLabel={drill.actionLabel}
          range={range}
          onClose={() => setDrill(null)}
        />
      )}
    </section>
  )
}

const SORT_HINT = 'Click a column header to sort by ascending or descending order.'
const CONTRIBUTORS_PER_PAGE = 10

function BlogsTab({ data }: { data: MetricsResponse }) {
  const { blogPosts, blogCategories, topContributors } = data.activation
  const r = data.retention
  const posts = useSort<BlogPostRow, keyof BlogPostRow & string>(blogPosts, { key: 'views', dir: 'desc' })
  const cats = useSort<BlogCategoryRow, keyof BlogCategoryRow & string>(blogCategories, { key: 'views', dir: 'desc' })
  const contributors = useSort<ContributorRow, keyof ContributorRow & string>(topContributors, { key: 'views', dir: 'desc' })

  // Top contributors: paginate 10 per page; reset to first page whenever the sort changes.
  const [contribPage, setContribPage] = useState(0)
  useEffect(() => {
    setContribPage(0)
  }, [contributors.sort])
  const contribPageCount = Math.max(1, Math.ceil(contributors.sorted.length / CONTRIBUTORS_PER_PAGE))
  const contribStart = contribPage * CONTRIBUTORS_PER_PAGE
  const contribRows = contributors.sorted.slice(contribStart, contribStart + CONTRIBUTORS_PER_PAGE)

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Blog viewers" value={r.blogViewers} hint="viewed a blog in range" />
        <StatCard label="Active authors" value={r.authorsInRange} hint="posted in range" />
        <StatCard label="First-time authors" value={r.firstTimeAuthors} hint="first post in range" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top contributors</CardTitle>
          <CardDescription>Posts and engagement aggregated per author. {SORT_HINT}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-stone-100">
            <Table>
              <TableHeader className="bg-card">
                <TableRow>
                  <TableHead className="w-12 text-right">#</TableHead>
                  <SortHead label="Author" sortKey="author" sort={contributors.sort} onToggle={contributors.toggle} align="left" defaultDir="asc" />
                  <SortHead label="Posts" sortKey="posts" sort={contributors.sort} onToggle={contributors.toggle} />
                  <SortHead label="Views" sortKey="views" sort={contributors.sort} onToggle={contributors.toggle} />
                  <SortHead label="Likes" sortKey="likes" sort={contributors.sort} onToggle={contributors.toggle} />
                  <SortHead label="Comments" sortKey="comments" sort={contributors.sort} onToggle={contributors.toggle} />
                  <SortHead label="Shares" sortKey="shares" sort={contributors.sort} onToggle={contributors.toggle} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {contribRows.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-slate-400">No contributors yet.</TableCell></TableRow>
                )}
                {contribRows.map((c, i) => (
                  <TableRow key={c.authorId}>
                    <TableCell className="text-right text-slate-400 tabular-nums">{contribStart + i + 1}</TableCell>
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
          {contributors.sorted.length > CONTRIBUTORS_PER_PAGE && (
            <div className="mt-3 flex items-center justify-end gap-3 text-sm text-stone-500">
              <button
                type="button"
                onClick={() => setContribPage((p) => Math.max(0, p - 1))}
                disabled={contribPage === 0}
                className="rounded-md border border-stone-200 px-2.5 py-1 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Previous
              </button>
              <span className="tabular-nums">Page {contribPage + 1} of {contribPageCount}</span>
              <button
                type="button"
                onClick={() => setContribPage((p) => Math.min(contribPageCount - 1, p + 1))}
                disabled={contribPage >= contribPageCount - 1}
                className="rounded-md border border-stone-200 px-2.5 py-1 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Next
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Blog engagement by category</CardTitle>
          <CardDescription>Views, likes, comments and shares aggregated per category. {SORT_HINT}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BarMetricChart
            data={cats.sorted}
            xKey="category"
            scrollX
            series={[
              { key: 'uniqueViewers', name: 'Unique views', color: COLORS.blue },
              { key: 'likes', name: 'Likes', color: COLORS.rose },
              { key: 'comments', name: 'Comments', color: COLORS.violet },
              { key: 'shares', name: 'Shares', color: COLORS.amber },
              { key: 'uniqueShares', name: 'Unique shares', color: COLORS.amberLight },
            ]}
          />
          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-stone-100">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <SortHead label="Category" sortKey="category" sort={cats.sort} onToggle={cats.toggle} align="left" defaultDir="asc" />
                  <SortHead label="Views" sortKey="views" sort={cats.sort} onToggle={cats.toggle} />
                  <SortHead label="Unique views" sortKey="uniqueViewers" sort={cats.sort} onToggle={cats.toggle} />
                  <SortHead label="Likes" sortKey="likes" sort={cats.sort} onToggle={cats.toggle} />
                  <SortHead label="Comments" sortKey="comments" sort={cats.sort} onToggle={cats.toggle} />
                  <SortHead label="Shares" sortKey="shares" sort={cats.sort} onToggle={cats.toggle} />
                  <SortHead label="Unique shares" sortKey="uniqueShares" sort={cats.sort} onToggle={cats.toggle} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cats.sorted.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-slate-400">No blog activity yet.</TableCell></TableRow>
                )}
                {cats.sorted.map((c) => (
                  <TableRow key={c.category}>
                    <TableCell className="font-medium">{c.category}</TableCell>
                    <TableCell className="text-right">{c.views}</TableCell>
                    <TableCell className="text-right">{c.uniqueViewers}</TableCell>
                    <TableCell className="text-right">{c.likes}</TableCell>
                    <TableCell className="text-right">{c.comments}</TableCell>
                    <TableCell className="text-right">{c.shares}</TableCell>
                    <TableCell className="text-right">{c.uniqueShares}</TableCell>
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
          <CardDescription>Views, unique views, likes, comments, shares and unique shares per article. {SORT_HINT}</CardDescription>
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
                  <SortHead label="Unique views" sortKey="uniqueViewers" sort={posts.sort} onToggle={posts.toggle} />
                  <SortHead label="Likes" sortKey="likes" sort={posts.sort} onToggle={posts.toggle} />
                  <SortHead label="Comments" sortKey="comments" sort={posts.sort} onToggle={posts.toggle} />
                  <SortHead label="Shares" sortKey="shares" sort={posts.sort} onToggle={posts.toggle} />
                  <SortHead label="Unique shares" sortKey="uniqueShares" sort={posts.sort} onToggle={posts.toggle} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.sorted.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-slate-400">No blog activity yet.</TableCell></TableRow>
                )}
                {posts.sorted.map((p) => (
                  <TableRow key={p.postId}>
                    <TableCell className="font-medium max-w-[260px] truncate">{p.title}</TableCell>
                    <TableCell className="text-slate-500 max-w-[160px] truncate">{p.author}</TableCell>
                    <TableCell className="text-slate-500">{p.category}</TableCell>
                    <TableCell className="text-right">{p.views}</TableCell>
                    <TableCell className="text-right">{p.uniqueViewers}</TableCell>
                    <TableCell className="text-right">{p.likes}</TableCell>
                    <TableCell className="text-right">{p.comments}</TableCell>
                    <TableCell className="text-right">{p.shares}</TableCell>
                    <TableCell className="text-right">{p.uniqueShares}</TableCell>
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
