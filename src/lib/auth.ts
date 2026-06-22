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

// Emails listed in ADMIN_EMAILS (comma-separated) are always granted the
// `admin` role on every session — no manual promotion needed, and re-applied
// even if the user was previously created/demoted with a lower role.
function getAdminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  )
}

function readGatewayHeaders(headers: Headers) {
  const gatewayId = headers.get('x-auth-user-id')
  const email = headers.get('x-auth-user-email')
  const name = headers.get('x-auth-user-name')
  const image = headers.get('x-auth-user-image')
  if (gatewayId && email) {
    return { gatewayId, email: email.toLowerCase(), name: name ?? email.split('@')[0], image: image || null }
  }
  // Dev fallback — honoured outside production, or on a production build that
  // explicitly opts in via ALLOW_DEV_AUTH (e.g. staging without a gateway).
  // NODE_ENV is inlined at build time, so non-prod deploys must use the flag.
  if (
    (process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_AUTH === 'true') &&
    process.env.DEV_USER_EMAIL
  ) {
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
  // Emails in ADMIN_EMAILS are forced to `admin` on every login ("no matter
  // what"); a field can't appear in both $set and $setOnInsert, so branch.
  const isForcedAdmin = getAdminEmails().has(gw.email)
  const update = isForcedAdmin
    ? { $setOnInsert: { email: gw.email }, $set: { name: gw.name, role: 'admin' as UserRole } }
    : { $setOnInsert: { email: gw.email, role: 'public' }, $set: { name: gw.name } }
  // Match by email — preserves all existing createdBy/authorId/saved/likes references.
  const user = await User.findOneAndUpdate(
    { email: gw.email },
    update,
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
