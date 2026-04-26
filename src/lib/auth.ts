import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

const isProd = process.env.NODE_ENV === 'production'
const prefix = isProd ? '__Secure-' : ''

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null

        await connectDB()

        const user = await User.findOne({ email: credentials.email.toLowerCase() })
        if (!user || !user.isWhitelisted) return null

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id
      session.user.role = token.role
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  useSecureCookies: isProd,
  // Explicitly configure cookies to use __Secure- prefix instead of __Host-.
  // __Host- cookies require no Domain attribute; Airbase's reverse proxy can
  // interfere with that requirement, causing CSRF verification to return 403.
  cookies: {
    sessionToken: {
      name: `${prefix}next-auth.session-token`,
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: isProd },
    },
    csrfToken: {
      name: `${prefix}next-auth.csrf-token`,
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: isProd },
    },
    callbackUrl: {
      name: `${prefix}next-auth.callback-url`,
      options: { sameSite: 'lax', path: '/', secure: isProd },
    },
    pkceCodeVerifier: {
      name: `${prefix}next-auth.pkce.code_verifier`,
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: isProd },
    },
    state: {
      name: `${prefix}next-auth.state`,
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: isProd },
    },
    nonce: {
      name: `${prefix}next-auth.nonce`,
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: isProd },
    },
  },
}
