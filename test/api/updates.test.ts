import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock better-auth getSession
vi.mock('@/lib/auth', () => ({
  auth: {},
  getSession: vi.fn(),
}))

// Mock MongoDB
vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}))

// Mock Update model
vi.mock('@/models/Update', () => ({
  Update: {
    find: vi.fn().mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
    create: vi.fn(),
  },
}))

vi.mock('@/models/Product', () => ({ Product: { find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) } }))
vi.mock('@/models/Domain', () => ({ Domain: { find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) } }))
vi.mock('@/models/Tag', () => ({ Tag: { find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) } }))
vi.mock('@/lib/activityLog', () => ({ writeLog: vi.fn(), computeDiff: vi.fn(), serializeUpdateSnapshot: vi.fn() }))

const ADMIN_SESSION = {
  session: { id: 's1', token: 't', userId: 'u1', expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
  user: { id: 'u1', name: 'Admin', email: 'admin@test.com', emailVerified: true, role: 'admin', isWhitelisted: true, createdAt: new Date(), updatedAt: new Date() },
}

describe('GET /api/updates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/updates/route')
    const req = new Request('http://localhost/api/updates')
    const res = await GET(req as never)

    expect(res.status).toBe(401)
  })

  it('returns 200 with empty list when authenticated', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION as never)

    const { GET } = await import('@/app/api/updates/route')
    const req = new Request('http://localhost/api/updates')
    const res = await GET(req as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.updates)).toBe(true)
  })
})

describe('POST /api/updates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when body is invalid', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION as never)

    const { POST } = await import('@/app/api/updates/route')
    const req = new Request('http://localhost/api/updates', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req as never)

    expect(res.status).toBe(400)
  })
})
