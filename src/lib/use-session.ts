'use client'

import { useContext } from 'react'
import { SessionContext } from '@/components/session-provider'
import type { AuthSession } from '@/lib/auth'

export function useSession(): AuthSession | null {
  return useContext(SessionContext)
}
