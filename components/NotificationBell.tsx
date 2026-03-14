// components/NotificationBell.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Bell, Trash2, MessageSquare, MessageCircle, Megaphone, Users } from 'lucide-react'
import { getAblyClient } from '@/lib/socket-client'

interface Notification {
  id: string; type: string; title: string; body: string
  read: boolean; link?: string; createdAt: string
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const m = Math.floor(seconds / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function getNotifIcon(type: string) {
  switch (type) {
    case 'message':     return <MessageSquare className="w-4 h-4 text-indigo-500" />
    case 'dm':          return <MessageCircle className="w-4 h-4 text-blue-500" />
    case 'campus_talk': return <Megaphone className="w-4 h-4 text-orange-500" />
    case 'group':       return <Users className="w-4 h-4 text-emerald-500" />
    default:            return <Bell className="w-4 h-4 text-gray-400" />
  }
}

export default function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false); setShowAll(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchNotifications = async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/notifications?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (err) { console.error('Notifications fetch error:', err) }
  }

  useEffect(() => { if (userId) fetchNotifications() }, [userId])

  useEffect(() => {
    if (!userId) return
    let channel: any = null
    let mounted = true
    const handler = (msg: any) => {
      if (!mounted) return
      const notif: Notification = msg.data
      setNotifications(prev => prev.some(n => n.id === notif.id) ? prev : [notif, ...prev])
      setUnreadCount(prev => prev + 1)
    }
    const setup = async () => {
      try {
        const ably = getAblyClient(userId)
        channel = ably.channels.get(`user-${userId}`)
        if (!mounted) return
        channel.subscribe('new-notification', handler)
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') return
        console.error('Ably notification subscription error:', err)
      }
    }
    setup()
    return () => {
      mounted = false
      try { if (channel) channel.unsubscribe('new-notification', handler) } catch {}
    }
  }, [userId])

  const handleOpen = async () => {
    const opening = !isOpen
    setIsOpen(opening)
    if (!opening) { setShowAll(false); return }
    if (unreadCount > 0) {
      try {
        await fetch('/api/notifications', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        })
        setUnreadCount(0)
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      } catch (err) { console.error('Error marking read:', err) }
    }
  }

  const handleNotificationClick = (n: Notification) => {
    setIsOpen(false); setShowAll(false)
    if (!n.link) {
      if (n.type === 'dm') router.push('/home?tab=dms')
      else if (n.type === 'campus_talk') router.push('/home/campus-talks')
      else router.push('/home')
      return
    }
    const linkUrl = new URL(n.link, window.location.origin)
    const isAlreadyOnHome = pathname === '/home'
    const isHomeLink = linkUrl.pathname === '/home'
    if (!isHomeLink) { router.push(n.link); return }
    if (isAlreadyOnHome) {
      const params = linkUrl.searchParams
      const openDMId = params.get('openDM')
      const groupId = params.get('groupId')
      if (openDMId) {
        window.dispatchEvent(new CustomEvent('notification-navigate', { detail: { type: 'dm', userId: openDMId, dmName: params.get('dmName') || '' } }))
        return
      }
      if (groupId) {
        window.dispatchEvent(new CustomEvent('notification-navigate', { detail: { type: 'group', groupId } }))
        return
      }
      if (n.type === 'dm') {
        window.dispatchEvent(new CustomEvent('notification-navigate', { detail: { type: 'tab', tab: 'dms' } }))
      }
      return
    }
    router.push(n.link)
  }

  const handleClearAll = async () => {
    setIsClearing(true)
    try {
      await fetch('/api/notifications', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      setNotifications([]); setUnreadCount(0)
    } catch (err) { console.error('Error clearing notifications:', err) }
    finally { setIsClearing(false) }
  }

  const displayedNotifications = showAll ? notifications : notifications.slice(0, 5)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button — 36x36 touch target */}
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-500 transition-all"
        style={{ width: 36, height: 36 }}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-[16px] bg-red-500 rounded-full border-2 border-white">
            <span className="text-[9px] font-bold text-white leading-none px-0.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
          style={{
            // ✅ KEY FIX: On mobile the dropdown must not overflow the left edge of the screen.
            // right: 0 anchors to the bell's right edge.
            // width is capped at (100vw - 16px) so it never bleeds off screen.
            // On desktop it's the normal 340px.
            right: 0,
            width: 'min(340px, calc(100vw - 16px))',
            boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">
              Notifications
              {notifications.length > 0 && (
                <span className="text-xs font-normal text-gray-400 ml-1.5">({notifications.length})</span>
              )}
            </h3>
            {notifications.length > 0 && (
              <button onClick={handleClearAll} disabled={isClearing}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                style={{ minHeight: 32, minWidth: 32 }}>
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearing ? 'Clearing...' : 'Clear all'}</span>
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: showAll ? 420 : 300, overflowY: 'auto' }}>
            {displayedNotifications.length > 0 ? (
              displayedNotifications.map(n => (
                <button key={n.id} onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-all flex items-start gap-3 ${!n.read ? 'bg-indigo-50/40' : ''}`}
                  style={{ minHeight: 60 }}>
                  <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                    {getNotifIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 leading-snug">{n.title}</p>
                    <p className="text-[12px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />}
                </button>
              ))
            ) : (
              <div className="px-4 py-10 text-center">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-2">
                  <Bell className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">No notifications yet</p>
                <p className="text-xs text-gray-300 mt-0.5">You're all caught up!</p>
              </div>
            )}
          </div>

          {/* Show more */}
          {notifications.length > 5 && (
            <div className="px-4 py-2.5 border-t border-gray-100 text-center">
              <button onClick={() => setShowAll(!showAll)}
                className="text-sm text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
                style={{ minHeight: 36 }}>
                {showAll ? 'Show less' : `View all (${notifications.length})`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}