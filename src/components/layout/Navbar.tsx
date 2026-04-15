'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/updates', label: 'Pipeline Updates' },
  { href: '/products', label: 'Products' },
]

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/updates" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">U</span>
            </div>
            <span className="font-semibold text-slate-900 text-sm">UpdateCentral</span>
          </Link>

          <nav className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-colors',
                  pathname === link.href || pathname.startsWith(link.href + '/')
                    ? 'bg-slate-100 text-slate-900 font-medium'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                {link.label}
              </Link>
            ))}
            {(session?.user?.role === 'editor' || session?.user?.role === 'admin') && (
              <Link
                href="/editor"
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-colors',
                  pathname.startsWith('/editor')
                    ? 'bg-slate-100 text-slate-900 font-medium'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                Editor
              </Link>
            )}
            {session?.user?.role === 'admin' && (
              <Link
                href="/admin"
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-colors',
                  pathname.startsWith('/admin')
                    ? 'bg-slate-100 text-slate-900 font-medium'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {session?.user && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">{session.user.name}</span>
                <Badge
                  variant="secondary"
                  className="text-xs capitalize"
                >
                  {session.user.role}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-slate-500 hover:text-slate-900 text-sm"
              >
                Sign out
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
