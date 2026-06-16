import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/email', () => ({ sendCommentNotificationEmail: vi.fn() }))

vi.mock('@/models/Comment', () => ({ Comment: { create: vi.fn(), findOne: vi.fn() } }))
vi.mock('@/models/Update', () => ({ Update: { findById: vi.fn(), updateOne: vi.fn().mockResolvedValue({}) } }))
vi.mock('@/models/Domain', () => ({ Domain: { find: vi.fn() } }))
vi.mock('@/models/Product', () => ({ Product: { find: vi.fn() } }))
vi.mock('@/models/User', () => ({ User: { find: vi.fn() } }))

// Valid 24-hex ObjectId strings (Types.ObjectId.isValid must pass).
const AUTHOR = '000000000000000000000001'
const MENTIONED = '000000000000000000000002'
const REPLY_TARGET = '000000000000000000000003'
const MEMBER_ONLY = '000000000000000000000004'
const PARENT_ID = '0000000000000000000000aa'
const UPDATE_ID = '0000000000000000000000bb'

const EMAILS: Record<string, string> = {
  [MENTIONED]: 'mentioned@test.com',
  [REPLY_TARGET]: 'reply@test.com',
  [MEMBER_ONLY]: 'member@test.com',
}

const SESSION = { user: { id: AUTHOR, name: 'Author', email: 'author@test.com', role: 'admin' } }

const leanOf = (value: unknown) => ({ select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(value) })

function makeRequest(body: unknown) {
  return new Request(`http://localhost/api/updates/${UPDATE_ID}/comments`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const params = { params: Promise.resolve({ id: UPDATE_ID }) }

describe('POST /api/updates/[id]/comments — notification dedup', () => {
  beforeEach(() => vi.clearAllMocks())

  it('emails each unique recipient once across mention + reply + membership', async () => {
    const { getSession } = await import('@/lib/auth')
    const { Comment } = await import('@/models/Comment')
    const { Update } = await import('@/models/Update')
    const { Domain } = await import('@/models/Domain')
    const { Product } = await import('@/models/Product')
    const { User } = await import('@/models/User')
    const { sendCommentNotificationEmail } = await import('@/lib/email')

    vi.mocked(getSession).mockResolvedValue(SESSION as never)
    vi.mocked(Comment.create).mockResolvedValue({
      _id: 'c1', userName: 'Author', text: 'x', attachments: [], mentions: [MENTIONED], parentId: PARENT_ID, createdAt: new Date(),
    } as never)
    // Parent comment authored by REPLY_TARGET
    vi.mocked(Comment.findOne).mockReturnValue(leanOf({ _id: PARENT_ID, userId: REPLY_TARGET }) as never)
    vi.mocked(Update.findById).mockReturnValue(
      leanOf({ title: 'T', domainIds: ['00000000000000000000d001'], productIds: ['00000000000000000000d002'] }) as never
    )
    // Overlap everywhere: domain has MENTIONED + MEMBER_ONLY, product has REPLY_TARGET + MENTIONED
    vi.mocked(Domain.find).mockReturnValue(leanOf([{ members: [MENTIONED, MEMBER_ONLY] }]) as never)
    vi.mocked(Product.find).mockReturnValue(leanOf([{ members: [REPLY_TARGET, MENTIONED] }]) as never)

    vi.mocked(User.find).mockImplementation((filter: never) => {
      const f = filter as { role?: unknown; _id?: { $in?: unknown[] } }
      if (f.role) return leanOf([{ _id: MENTIONED }]) as never // mention validation
      const ids = (f._id?.$in ?? []).map((x) => String(x))
      return leanOf(ids.map((id) => ({ email: EMAILS[id] }))) as never // recipient emails
    })

    const { POST } = await import('@/app/api/updates/[id]/comments/route')
    const text = `<p>hi <span data-type="mention" data-id="${MENTIONED}">@Bob</span></p>`
    const res = await POST(makeRequest({ text, parentId: PARENT_ID }) as never, params as never)

    expect(res.status).toBe(200)
    const recipients = vi.mocked(sendCommentNotificationEmail).mock.calls.map((c) => c[0]).sort()
    expect(recipients).toEqual(['member@test.com', 'mentioned@test.com', 'reply@test.com'])
    // The author is never emailed.
    expect(recipients).not.toContain('author@test.com')
  })

  it('does not email the author for self-mention or replying to own comment', async () => {
    const { getSession } = await import('@/lib/auth')
    const { Comment } = await import('@/models/Comment')
    const { Update } = await import('@/models/Update')
    const { Domain } = await import('@/models/Domain')
    const { Product } = await import('@/models/Product')
    const { User } = await import('@/models/User')
    const { sendCommentNotificationEmail } = await import('@/lib/email')

    vi.mocked(getSession).mockResolvedValue(SESSION as never)
    vi.mocked(Comment.create).mockResolvedValue({
      _id: 'c1', userName: 'Author', text: 'x', attachments: [], mentions: [AUTHOR], parentId: PARENT_ID, createdAt: new Date(),
    } as never)
    vi.mocked(Comment.findOne).mockReturnValue(leanOf({ _id: PARENT_ID, userId: AUTHOR }) as never)
    vi.mocked(Update.findById).mockReturnValue(leanOf({ title: 'T', domainIds: [], productIds: [] }) as never)
    vi.mocked(Domain.find).mockReturnValue(leanOf([]) as never)
    vi.mocked(Product.find).mockReturnValue(leanOf([]) as never)
    vi.mocked(User.find).mockImplementation((filter: never) => {
      const f = filter as { role?: unknown }
      if (f.role) return leanOf([{ _id: AUTHOR }]) as never
      return leanOf([]) as never
    })

    const { POST } = await import('@/app/api/updates/[id]/comments/route')
    const text = `<p>note to self <span data-type="mention" data-id="${AUTHOR}">@Me</span></p>`
    const res = await POST(makeRequest({ text, parentId: PARENT_ID }) as never, params as never)

    expect(res.status).toBe(200)
    expect(vi.mocked(sendCommentNotificationEmail)).not.toHaveBeenCalled()
  })
})
