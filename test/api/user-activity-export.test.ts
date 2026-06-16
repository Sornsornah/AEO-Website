import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: {},
  getSession: vi.fn(),
}))

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}))

const USER_ID = '507f1f77bcf86cd799439011'
const BLOG_ID = '507f1f77bcf86cd799439022'

vi.mock('@/models/User', () => ({
  User: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { _id: USER_ID, name: 'Ada Lovelace', email: 'ada@test.com' },
      ]),
    }),
  },
}))

vi.mock('@/models/AnalyticsEvent', () => ({
  ANALYTICS_EVENT_TYPES: [],
  AnalyticsEvent: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          _id: 'e1',
          userId: USER_ID,
          type: 'page_view',
          path: '/products',
          createdAt: new Date('2026-06-01T08:00:00.000Z'),
        },
        {
          _id: 'e2',
          userId: USER_ID,
          type: 'blog_view',
          entityType: 'blog',
          entityId: BLOG_ID,
          createdAt: new Date('2026-06-01T09:00:00.000Z'),
        },
      ]),
    }),
  },
}))

vi.mock('@/models/BlogPost', () => ({
  BlogPost: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { _id: BLOG_ID, title: 'Hello, World', slug: 'hello-world' },
      ]),
    }),
  },
}))

vi.mock('@/models/Product', () => ({
  Product: {
    find: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) }),
  },
}))

vi.mock('@/models/Update', () => ({
  Update: {
    find: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) }),
  },
}))

const ADMIN_SESSION = {
  session: { id: 's1', token: 't', userId: 'admin1', expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
  user: { id: 'admin1', name: 'Admin', email: 'admin@test.com', emailVerified: true, role: 'admin', isWhitelisted: true, createdAt: new Date(), updatedAt: new Date() },
}

describe('GET /api/dashboard/user-activity/export', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 403 for non-admins', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue({ ...ADMIN_SESSION, user: { ...ADMIN_SESSION.user, role: 'viewer' } } as never)

    const { GET } = await import('@/app/api/dashboard/user-activity/export/route')
    const req = new Request(`http://localhost/api/dashboard/user-activity/export?userIds=${USER_ID}`)
    const res = await GET(req as never)

    expect(res.status).toBe(403)
  })

  it('returns 400 when no valid userIds are supplied', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION as never)

    const { GET } = await import('@/app/api/dashboard/user-activity/export/route')
    const req = new Request('http://localhost/api/dashboard/user-activity/export?userIds=not-an-id')
    const res = await GET(req as never)

    expect(res.status).toBe(400)
  })

  it('returns a CSV with a header and one row per event, quote-escaping commas', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION as never)

    const { GET } = await import('@/app/api/dashboard/user-activity/export/route')
    const req = new Request(
      `http://localhost/api/dashboard/user-activity/export?userIds=${USER_ID}&from=2026-06-01T00:00:00.000Z&to=2026-06-02T00:00:00.000Z`
    )
    const res = await GET(req as never)

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
    expect(res.headers.get('content-disposition')).toContain('attachment; filename="user-activity_2026-06-01_to_2026-06-02.csv"')

    const text = await res.text()
    const lines = text.replace(/^﻿/, '').trim().split('\r\n')

    expect(lines[0]).toBe('User,Email,Timestamp,Action,Page,Type')
    expect(lines).toHaveLength(3) // header + 2 events

    // page_view → "Visited" the path
    expect(lines[1]).toBe('Ada Lovelace,ada@test.com,2026-06-01T08:00:00.000Z,Visited,/products,Page view')
    // blog_view → entity title with a comma must be quote-wrapped
    expect(lines[2]).toBe('Ada Lovelace,ada@test.com,2026-06-01T09:00:00.000Z,Viewed blog post,"Hello, World",Blog view')
  })
})
