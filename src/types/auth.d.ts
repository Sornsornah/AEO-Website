import type { auth } from '@/lib/auth'

export type Session = typeof auth.$Infer.Session
export type User = Session['user']

export type UserRole = 'viewer' | 'admin'
