'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from '@/lib/use-session'
import { cn } from '@/lib/utils'
import { Lock } from 'lucide-react'

interface NavLink {
  href: string
  label: string
  adminOnly: boolean
}

const roleLabels: Record<string, string> = {
  admin: 'AEO',
  viewer: 'Management',
  public: 'CPF officers',
}

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
  const session = useSession()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [navLinks, setNavLinks] = useState<NavLink[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/page-settings')
      .then((r) => r.json())
      .then((data: { href: string; label: string; navEnabled: boolean; adminOnly: boolean }[]) => {
        setNavLinks(
          data
            .filter((s) => s.navEnabled && !s.href.includes('['))
            .map((s) => ({ href: s.href, label: s.label, adminOnly: s.adminOnly }))
        )
      })
      .catch(() => {})
  }, [])

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

  // `adminOnly` nav links are internal pages (e.g. /updates), not public. Both
  // admin (AEO) and viewer (Management) are authorised internal roles, so both
  // see the link; the pages themselves redirect non-internal (public) users.
  const visibleLinks = navLinks.filter(
    (link) => !link.adminOnly || session?.user?.role === 'admin' || session?.user?.role === 'viewer'
  )

  return (
    <header className="sticky top-0 z-[60] w-full border-b border-[#E8E0D6] bg-[#FDFCFB]/95 backdrop-blur supports-[backdrop-filter]:bg-[#FDFCFB]/80">
      <div className="w-full px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-semibold text-[#1C1512] text-sm tracking-tight">AEO: AI Enablement Office</span>
          </Link>

          <nav className="flex items-center gap-1">
            {visibleLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-colors',
                    isActive
                      ? 'bg-[#1C1512] text-white font-medium'
                      : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                  )}
                >
                  {link.label}
                  {link.href === '/updates' && (
                    <span className={cn(
                      'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-[#F4F4F6] text-[#64748B] border border-[#E2E8F0]'
                    )}>
                      <Lock className="w-2.5 h-2.5" />
                      Restricted
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {session?.user && (
            <>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold flex items-center justify-center hover:bg-orange-200 transition-colors"
                  aria-label="User menu"
                >
                  {initials}
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-[#E8E0D6] rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-stone-100">
                      <p className="text-sm font-medium text-stone-900 truncate">{session.user.name}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{roleLabels[session.user.role] ?? session.user.role}</p>
                    </div>

                    {session.user.role === 'admin' && (
                      <>
                        <Link
                          href="/editor"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                        >
                          Editor
                        </Link>
                        <Link
                          href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                        >
                          Admin
                        </Link>
                        <Link
                          href="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                        >
                          Metrics Tracking
                        </Link>
                      </>
                    )}
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
