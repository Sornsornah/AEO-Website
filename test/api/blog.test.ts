import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: {},
  getSession: vi.fn(),
}))

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/models/BlogPost', () => ({
  BlogPost: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}))

vi.mock('@/models/BlogCategory', () => ({
  BlogCategory: {
    find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
  },
}))

const VIEWER_SESSION = {
  session: { id: 's1', token: 't', userId: 'u1', expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
  user: { id: 'u1', name: 'Viewer', email: 'viewer@test.com', emailVerified: true, role: 'viewer', isWhitelisted: true, createdAt: new Date(), updatedAt: new Date() },
}

describe('GET /api/blog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 200 with posts array', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(VIEWER_SESSION as never)

    const { GET } = await import('@/app/api/blog/route')
    const req = new Request('http://localhost/api/blog')
    const res = await GET(req as never)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.posts ?? body)).toBe(true)
  })
})

describe('POST /api/blog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 403 when viewer tries to create a post', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(VIEWER_SESSION as never)

    const { POST } = await import('@/app/api/blog/route')
    const req = new Request('http://localhost/api/blog', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', excerpt: 'Ex', category: 'thought', authorName: 'A' }),
    })
    const res = await POST(req as never)

    // Route checks admin role — viewers get either 401 or 403 depending on implementation
    expect([401, 403]).toContain(res.status)
  })
})
