export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/updates/:path*', '/editor/:path*', '/admin/:path*', '/saved/:path*'],
}
