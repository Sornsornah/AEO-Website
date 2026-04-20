'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { NotificationBell } from './NotificationBell'

const navLinks = [
  { href: '/updates', label: 'Pipeline Updates' },
  { href: '/products', label: 'Products' },
]

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = session?.user?.name ? getInitials(session.user.name) : '?'

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="w-full px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/updates" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="font-semibold text-slate-900 text-sm">AEO: AI Enablement Office</span>
          </Link>

          <nav className="flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-full transition-colors',
                    isActive
                      ? 'bg-slate-900 text-white font-medium'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {session?.user && (
            <>
              <NotificationBell />

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold flex items-center justify-center hover:bg-orange-200 transition-colors"
                  aria-label="User menu"
                >
                  {initials}
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-900 truncate">{session.user.name}</p>
                      <p className="text-xs text-slate-400 capitalize mt-0.5">{session.user.role}</p>
                    </div>

                    {session.user.role === 'admin' && (
                      <>
                        <Link
                          href="/editor"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          Editor
                        </Link>
                        <Link
                          href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          Admin
                        </Link>
                      </>
                    )}

                    <div className="border-t border-slate-100">
                      <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
