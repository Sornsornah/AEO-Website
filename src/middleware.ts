export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/updates/:path*', '/whats-new/:path*', '/editor/:path*', '/admin/:path*', '/saved/:path*', '/products/:path*'],
}
