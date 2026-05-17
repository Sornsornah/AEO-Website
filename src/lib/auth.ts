import { betterAuth } from 'better-auth'
import { mongodbAdapter } from 'better-auth/adapters/mongodb'
import { emailOTP } from 'better-auth/plugins/email-otp'
import { createAuthMiddleware, APIError } from 'better-auth/api'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { sendOTPEmail } from '@/lib/email'

// Proxy that forwards all property accesses to mongoose.connection.db.
// By the time better-auth calls .collection(), connectDB() has already been
// called by the route handler, so mongoose.connection.db is available.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lazyDb = new Proxy({} as any, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(_target: any, prop: string | symbol) {
    const db = mongoose.connection.db
    if (!db) throw new Error('MongoDB not connected. Call connectDB() before using auth.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (db as any)[prop]
    return typeof value === 'function' ? value.bind(db) : value
  },
})

export const auth = betterAuth({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  database: mongodbAdapter(lazyDb),
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'viewer',
        input: false,
      },
      isWhitelisted: {
        type: 'boolean',
        defaultValue: false,
        input: false,
      },
    },
  },
  plugins: [
    emailOTP({
      sendVerificationOTP: async ({ email, otp }) => {
        await sendOTPEmail(email, otp)
      },
      otpLength: 6,
      expiresIn: 600,
      // No disableSignUp — the before hook enforces whitelist; better-auth creates
      // its own user entry on first sign-in and databaseHooks syncs the role below.
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          await connectDB()
          const existing = await User.findOne({ email: user.email.toLowerCase() }).lean()
          if (existing) {
            const e = existing as { _id: { toString(): string }; name?: string; role?: string; isWhitelisted?: boolean }
            return {
              data: {
                ...user,
                // Reuse existing MongoDB _id so all historical data stays linked to this user.
                id: e._id.toString(),
                name: e.name ?? user.name,
                role: e.role ?? 'viewer',
                isWhitelisted: e.isWhitelisted ?? false,
              },
            }
          }
          return { data: user }
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/email-otp/send-verification-otp') {
        const email = (ctx.body as { email?: string } | undefined)?.email
        if (!email) return

        await connectDB()
        const user = await User.findOne({ email: email.toLowerCase() })

        if (!user?.isWhitelisted) {
          throw new APIError('UNAUTHORIZED', { message: 'Access denied.' })
        }
      }
    }),
  },
})

export type Session = typeof auth.$Infer.Session

export interface AuthSessionUser {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string | null
  createdAt: Date
  updatedAt: Date
  role: string
  isWhitelisted: boolean
}

export interface AuthSession {
  session: {
    id: string
    expiresAt: Date
    token: string
    createdAt: Date
    updatedAt: Date
    ipAddress?: string | null
    userAgent?: string | null
    userId: string
  }
  user: AuthSessionUser
}

function normalizeId(id: unknown): string {
  if (typeof id === 'string') return id
  if (id && typeof id === 'object') {
    const obj = id as Record<string, unknown>
    // BSON ObjectId instance
    if (typeof obj.toHexString === 'function') return (obj as { toHexString(): string }).toHexString()
    // Plain deserialized BSON object: { buffer: Uint8Array } or { id: Uint8Array }
    const buf = obj.buffer ?? obj.id
    if (buf instanceof Uint8Array) {
      return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
    }
  }
  return String(id)
}

export async function getSession(headers: Headers): Promise<AuthSession | null> {
  const session = await auth.api.getSession({ headers })
  if (!session) return null
  const s = session as unknown as AuthSession
  // mongodbAdapter may return _id as a BSON ObjectId object — normalize to plain hex string
  s.user.id = normalizeId(s.user.id)
  return s
}
