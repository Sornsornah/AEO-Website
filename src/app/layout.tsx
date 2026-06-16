import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'sonner'
import { getSession } from '@/lib/auth'
import { SessionProvider } from '@/components/session-provider'
import { ImageLightbox } from '@/components/image-lightbox'

export const metadata: Metadata = {
  title: 'AEO Happenings',
  description: 'Product updates for your organization',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getSession(await headers())

  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider session={session}>
          <Providers>{children}</Providers>
        </SessionProvider>
        <Toaster richColors position="top-right" />
        <ImageLightbox />
      </body>
    </html>
  )
}
