import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PATHS = ['/updates', '/editor', '/admin', '/saved', '/dashboard']

function hasGatewayHeaders(request: NextRequest): boolean {
  if (request.headers.get('x-auth-user-id') && request.headers.get('x-auth-user-email')) {
    return true
  }
  // Dev fallback — honoured outside production, or on a production build that
  // explicitly opts in via ALLOW_DEV_AUTH (e.g. staging without a gateway).
  // NODE_ENV is inlined at build time, so non-prod deploys must use the flag.
  if (
    (process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_AUTH === 'true') &&
    process.env.DEV_USER_EMAIL
  ) {
    return true
  }
  return false
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  if (!isProtected) return NextResponse.next()

  if (!hasGatewayHeaders(request)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/updates/:path*', '/editor/:path*', '/admin/:path*', '/saved/:path*', '/dashboard/:path*'],
}
