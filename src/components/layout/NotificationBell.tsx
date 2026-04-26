'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  _id: string
  type: 'mention' | 'team_mention' | 'product_team'
  fromUserName: string
  updateId: string
  updateTitle: string
  read: boolean
  createdAt: string
}

function NotificationItem({
  notification,
  onClose,
}: {
  notification: Notification
  onClose: () => void
}) {
  const router = useRouter()

  function handleClick() {
    router.push(`/updates/${notification.updateId}`)
    onClose()
  }

  const message =
    notification.type === 'mention'
      ? `${notification.fromUserName} mentioned you in "${notification.updateTitle}"`
      : notification.type === 'team_mention'
      ? `${notification.fromUserName} mentioned @team in "${notification.updateTitle}"`
      : `${notification.fromUserName} commented on "${notification.updateTitle}"`

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 ${
        !notification.read ? 'bg-blue-50 hover:bg-blue-50/80' : ''
      }`}
    >
      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 text-xs font-semibold flex items-center justify-center text-slate-600 mt-0.5">
        {notification.fromUserName[0]?.toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-700 leading-snug">{message}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
      {!notification.read && (
        <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
      )}
    </button>
  )
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(Array.isArray(data) ? data : [])
      }
    } catch {
      // silent
    }
  }, [])

  // Initial fetch + poll every 30s
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  async function handleBellClick() {
    const wasOpen = open
    setOpen(!wasOpen)
    if (!wasOpen) {
      // Mark all as read optimistically
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      try {
        await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      } catch {
        // silent
      }
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="w-4 h-4 text-slate-500" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">Notifications</span>
            {notifications.length > 0 && (
              <span className="text-xs text-slate-400">{notifications.length} total</span>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n._id}
                  notification={n}
                  onClose={() => setOpen(false)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
