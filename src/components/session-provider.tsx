'use client'

import { createContext } from 'react'
import type { AuthSession } from '@/lib/auth'

export const SessionContext = createContext<AuthSession | null>(null)

export function SessionProvider({
  session,
  children,
}: {
  session: AuthSession | null
  children: React.ReactNode
}) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}
