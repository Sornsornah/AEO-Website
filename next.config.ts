import type { NextConfig } from 'next'

// Dev-only allowance so impeccable live mode can load. Guarded by NODE_ENV.
const __impeccableLiveDev =
  process.env.NODE_ENV === 'development' ? ' http://localhost:8400' : ''

const nextConfig: NextConfig = {
  output: 'standalone',
  // jsdom (pulled in by isomorphic-dompurify for server-side HTML sanitisation)
  // has dynamic requires that must not go through the bundler.
  serverExternalPackages: ['isomorphic-dompurify'],
  images: {
    // The deploy target (airbase) runs on a read-only root filesystem, so the
    // on-demand image optimizer cannot write its cache to /app/.next/cache/images
    // (EACCES). Serving images unoptimized avoids any disk write entirely.
    unoptimized: true,
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
