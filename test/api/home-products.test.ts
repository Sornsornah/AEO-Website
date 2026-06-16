import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: {},
  getSession: vi.fn(),
}))

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}))

const updateOne = vi.fn().mockResolvedValue({ acknowledged: true })
vi.mock('@/models/HomeConfig', () => ({
  HomeConfig: { updateOne: (...args: unknown[]) => updateOne(...args) },
}))

const ADMIN_SESSION = {
  session: {},
  user: { id: 'u1', name: 'Admin', email: 'admin@test.com', role: 'admin' },
}

const VIEWER_SESSION = {
  session: {},
  user: { id: 'u2', name: 'Viewer', email: 'viewer@test.com', role: 'viewer' },
}

function put(body: unknown) {
  return new Request('http://localhost/api/admin/home-products', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

describe('PUT /api/admin/home-products', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(null)

    const { PUT } = await import('@/app/api/admin/home-products/route')
    const res = await PUT(put({ productIds: [] }) as never)

    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admins', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(VIEWER_SESSION as never)

    const { PUT } = await import('@/app/api/admin/home-products/route')
    const res = await PUT(put({ productIds: [] }) as never)

    expect(res.status).toBe(403)
  })

  it('rejects a non-array productIds', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION as never)

    const { PUT } = await import('@/app/api/admin/home-products/route')
    const res = await PUT(put({ productIds: 'nope' }) as never)

    expect(res.status).toBe(400)
    expect(updateOne).not.toHaveBeenCalled()
  })

  it('rejects entries that are neither string nor null', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION as never)

    const { PUT } = await import('@/app/api/admin/home-products/route')
    const res = await PUT(put({ productIds: ['a', 42, null] }) as never)

    expect(res.status).toBe(400)
    expect(updateOne).not.toHaveBeenCalled()
  })

  it('rejects a product featured in two slots', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION as never)

    const { PUT } = await import('@/app/api/admin/home-products/route')
    const res = await PUT(put({ productIds: ['a', null, 'a'] }) as never)

    expect(res.status).toBe(400)
    expect(updateOne).not.toHaveBeenCalled()
  })

  it('preserves interior gaps and trims trailing empty slots', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION as never)

    const { PUT } = await import('@/app/api/admin/home-products/route')
    const res = await PUT(put({ productIds: ['a', null, 'c', null, null] }) as never)

    expect(res.status).toBe(200)
    expect(updateOne).toHaveBeenCalledTimes(1)
    const [, update] = updateOne.mock.calls[0]
    expect(update.$set.featuredProductIds).toEqual(['a', null, 'c'])
  })

  it('caps the array at 8 slots', async () => {
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(ADMIN_SESSION as never)

    const { PUT } = await import('@/app/api/admin/home-products/route')
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
    const res = await PUT(put({ productIds: ids }) as never)

    expect(res.status).toBe(200)
    const [, update] = updateOne.mock.calls[0]
    expect(update.$set.featuredProductIds).toHaveLength(8)
  })
})
