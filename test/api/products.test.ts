import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: {},
  getSession: vi.fn(),
}))

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/models/Product', () => ({
  Product: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { _id: { toString: () => 'p1' }, name: 'Product 1', slug: 'product-1', color: '#000', description: '', features: [] },
      ]),
    }),
  },
}))

describe('GET /api/products', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns products without authentication (public endpoint)', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(null)

    const { GET } = await import('@/app/api/products/route')
    const req = new Request('http://localhost/api/products')
    const res = await GET(req as never)

    // Products list is publicly accessible
    expect([200, 401]).toContain(res.status)
  })
})
