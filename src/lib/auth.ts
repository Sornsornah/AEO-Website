import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

export type UserRole = 'public' | 'viewer' | 'admin'

export interface AuthSessionUser {
  id: string
  name: string
  email: string
  image: string | null
  role: UserRole
}

export interface AuthSession {
  user: AuthSessionUser
}

function readGatewayHeaders(headers: Headers) {
  const gatewayId = headers.get('x-auth-user-id')
  const email = headers.get('x-auth-user-email')
  const name = headers.get('x-auth-user-name')
  const image = headers.get('x-auth-user-image')
  if (gatewayId && email) {
    return { gatewayId, email: email.toLowerCase(), name: name ?? email.split('@')[0], image: image || null }
  }
  // Dev fallback — only honoured outside production.
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_USER_EMAIL) {
    return {
      gatewayId: process.env.DEV_USER_ID ?? 'dev-user',
      email: process.env.DEV_USER_EMAIL.toLowerCase(),
      name: process.env.DEV_USER_NAME ?? process.env.DEV_USER_EMAIL!.split('@')[0],
      image: null,
    }
  }
  return null
}

export async function getSession(headers: Headers): Promise<AuthSession | null> {
  const gw = readGatewayHeaders(headers)
  if (!gw) return null

  await connectDB()
  // Match by email — preserves all existing createdBy/authorId/saved/likes references.
  const user = await User.findOneAndUpdate(
    { email: gw.email },
    {
      $setOnInsert: { email: gw.email, role: 'public' },
      $set: { name: gw.name },
    },
    { returnDocument: 'after', upsert: true }
  ).lean<{ _id: { toString(): string }; email: string; name: string; role: UserRole }>()

  if (!user) return null

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: gw.image,
      role: user.role,
    },
  }
}
