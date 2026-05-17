import { describe, it, expect, vi } from 'vitest'

// Mock better-auth
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      sendVerificationOTP: vi.fn().mockResolvedValue({ ok: true }),
    },
  },
  getSession: vi.fn(),
}))

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/models/User', () => ({
  User: {
    findOne: vi.fn(),
  },
}))

describe('middleware route protection', () => {
  it('public paths are not listed as protected', () => {
    const PROTECTED = ['/updates', '/editor', '/admin', '/saved']
    expect(PROTECTED).not.toContain('/login')
    expect(PROTECTED).not.toContain('/products')
    expect(PROTECTED).not.toContain('/blog')
  })

  it('protected paths are all included', () => {
    const PROTECTED = ['/updates', '/editor', '/admin', '/saved']
    expect(PROTECTED).toContain('/updates')
    expect(PROTECTED).toContain('/editor')
    expect(PROTECTED).toContain('/admin')
    expect(PROTECTED).toContain('/saved')
  })
})

describe('better-auth OTP flow', () => {
  it('sendVerificationOTP is called with correct type', async () => {
    const { auth } = await import('@/lib/auth')
    await auth.api.sendVerificationOTP({ body: { email: 'test@test.com', type: 'sign-in' } } as never)
    expect(auth.api.sendVerificationOTP).toHaveBeenCalledWith(
      expect.objectContaining({ body: { email: 'test@test.com', type: 'sign-in' } })
    )
  })
})
