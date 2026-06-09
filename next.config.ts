import type { NextConfig } from 'next'

// Dev-only allowance so impeccable live mode can load. Guarded by NODE_ENV.
const __impeccableLiveDev =
  process.env.NODE_ENV === 'development' ? ' http://localhost:8400' : ''

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'${__impeccableLiveDev}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'${__impeccableLiveDev}; frame-ancestors 'none';`,
          },
        ],
      },
    ]
  },
}

export default nextConfig
