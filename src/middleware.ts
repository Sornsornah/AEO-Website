import { NextRequest, NextResponse } from 'next/server'
import type { AuthSession } from '@/lib/auth'

const PROTECTED_PATHS = ['/updates', '/editor', '/admin', '/saved']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))

  if (!isProtected) return NextResponse.next()

  const res = await fetch(new URL('/api/auth/get-session', request.url), {
    headers: { cookie: request.headers.get('cookie') ?? '' },
  })

  let session: AuthSession | null = null
  if (res.ok) {
    try {
      session = await res.json()
    } catch {
      session = null
    }
  }

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/updates/:path*', '/editor/:path*', '/admin/:path*', '/saved/:path*'],
}
