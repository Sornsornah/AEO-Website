import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { OTP } from '@/models/OTP'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        otp: { label: 'Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) return null

        await connectDB()

        const user = await User.findOne({ email: credentials.email.toLowerCase() })
        if (!user || !user.isWhitelisted) return null

        const record = await OTP.findOne({
          email: credentials.email.toLowerCase(),
          used: false,
          expiresAt: { $gt: new Date() },
        }).sort({ createdAt: -1 })

        if (!record) return null

        const valid = await bcrypt.compare(credentials.otp, record.code)
        if (!valid) return null

        record.used = true
        await record.save()

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
}
