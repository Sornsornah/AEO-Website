'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/layout/theme-provider'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { track } from '@/lib/track'

function SiteAccessTracker() {
  useEffect(() => {
    track('site_access')
  }, [])
  return null
}

// Admin-only routes — excluded from page_view tracking (the gateway/role-gated
// admin surface isn't part of the public/gated activity timeline).
const ADMIN_PATH_PREFIXES = ['/admin', '/editor', '/dashboard']

function PageViewTracker() {
  const pathname = usePathname()
  useEffect(() => {
    if (!pathname) return
    if (ADMIN_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return
    track('page_view', { path: pathname })
  }, [pathname])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SiteAccessTracker />
        <PageViewTracker />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
