import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: {},
  getSession: vi.fn(),
}))

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/models/User', () => ({
  User: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    create: vi.fn(),
  },
}))

const ADMIN_SESSION = {
  session: { id: 's1', token: 't', userId: 'u1', expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
  user: { id: 'u1', name: 'Admin', email: 'admin@test.com', emailVerified: true, role: 'admin', isWhitelisted: true, createdAt: new Date(), updatedAt: new Date() },
}

const VIEWER_SESSION = {
  session: { id: 's2', token: 't2', userId: 'u2', expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
  user: { id: 'u2', name: 'Viewer', email: 'viewer@test.com', emailVerified: true, role: 'viewer', isWhitelisted: true, createdAt: new Date(), updatedAt: new Date() },
}

describe('GET /api/admin/users', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/admin/users/route')
    const req = new Request('http://localhost/api/admin/users')
    const res = await GET(req as never)

    expect(res.status).toBe(401)
  })

  it('returns 403 when viewer tries to access admin users', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(VIEWER_SESSION as never)

    const { GET } = await import('@/app/api/admin/users/route')
    const req = new Request('http://localhost/api/admin/users')
    const res = await GET(req as never)

    expect(res.status).toBe(403)
  })

  it('returns 200 for admin', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION as never)

    const { GET } = await import('@/app/api/admin/users/route')
    const req = new Request('http://localhost/api/admin/users')
    const res = await GET(req as never)

    expect(res.status).toBe(200)
  })
})

describe('POST /api/admin/users', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when body is missing required fields', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION as never)

    const { POST } = await import('@/app/api/admin/users/route')
    const req = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req as never)

    expect(res.status).toBe(400)
  })
})
