'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Options {
  when: () => boolean
  onBlock: (continueNav: () => void) => void
}

export function useNavigationGuard({ when, onBlock }: Options) {
  const router = useRouter()
  const pendingPopRef = useRef(false)

  useEffect(() => {
    // Push an extra history entry so the first back press triggers popstate
    history.pushState(null, '', location.href)

    function handlePopState() {
      if (pendingPopRef.current) {
        pendingPopRef.current = false
        return
      }
      if (when()) {
        // Restore the extra entry so back doesn't navigate away immediately
        history.pushState(null, '', location.href)
        onBlock(() => {
          pendingPopRef.current = true
          // Go back two entries: one for the extra entry we just re-pushed and
          // one for the mount-time guard entry, so the user actually leaves the
          // page instead of landing back on this same URL.
          history.go(-2)
        })
      }
    }

    function handleClick(e: MouseEvent) {
      if (!when()) return
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      if (!anchor) return
      if (anchor.target === '_blank') return
      const href = anchor.getAttribute('href')
      if (!href) return
      // Only intercept same-origin navigations
      if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return
      e.preventDefault()
      e.stopPropagation()
      onBlock(() => router.push(href))
    }

    window.addEventListener('popstate', handlePopState)
    document.addEventListener('click', handleClick, true)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('click', handleClick, true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
