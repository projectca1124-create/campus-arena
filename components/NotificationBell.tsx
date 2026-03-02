// components/NotificationBell.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Trash2, Check, MessageSquare, MessageCircle, Megaphone, Users } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  link?: string
  createdAt: string
}

function timeAgo(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

function getNotifIcon(type: string) {
  switch (type) {
    case 'message': return <MessageSquare className="w-4 h-4 text-indigo-500" />
    case 'dm': return <MessageCircle className="w-4 h-4 text-blue-500" />
    case 'campus_talk': return <Megaphone className="w-4 h-4 text-orange-500" />
    case 'group': return <Users className="w-4 h-4 text-emerald-500" />
    default: return <Bell className="w-4 h-4 text-gray-400" />
  }
}

export default function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setShowAll(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (err) { console.error('Error fetching notifications:', err) }
  }

  useEffect(() => {
    if (!userId) return
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [userId])

  const handleOpen = async () => {
    const opening = !isOpen
    setIsOpen(opening)
    if (!opening) { setShowAll(false); return }
    if (unreadCount > 0) {
      try {
        await fetch('/api/notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        })
        setUnreadCount(0)
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      } catch (err) { console.error('Error marking read:', err) }
    }
  }

  const handleNotificationClick = (n: Notification) => {
    setIsOpen(false)
    setShowAll(false)

    // Navigate based on link or type
    if (n.link) {
      router.push(n.link)
      return
    }

    // Fallback: infer destination from notification type/body
    if (n.type === 'dm' || n.body.includes('sent you a message')) {
      router.push('/home')
    } else if (n.type === 'message' || n.body.includes('sent a message in')) {
      router.push('/home')
    } else if (n.type === 'campus_talk' || n.body.includes('Campus Talk')) {
      router.push('/home/campus-talks')
    } else {
      router.push('/home')
    }
  }

  const handleClearAll = async () => {
    setIsClearing(true)
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      setNotifications([])
      setUnreadCount(0)
    } catch (err) { console.error('Error clearing notifications:', err) }
    finally { setIsClearing(false) }
  }

  const displayedNotifications = showAll ? notifications : notifications.slice(0, 5)
  const hasMore = !showAll && notifications.length > 5

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={handleOpen} className="relative p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-all">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
          style={{
            width: showAll ? 380 : 340,
            boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
            transition: 'width 0.2s ease',
          }}>

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
                title="Clear all notifications">
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearing ? 'Clearing...' : 'Clear all'}</span>
              </button>
            )}
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: showAll ? 420 : 300, overflowY: 'auto', transition: 'max-height 0.3s ease' }}>
            {displayedNotifications.length > 0 ? (
              displayedNotifications.map((n) => (
                <button key={n.id} onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-all flex items-start gap-3 cursor-pointer ${!n.read ? 'bg-indigo-50/30' : ''}`}>
                  <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                    {getNotifIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 leading-snug">{n.body}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
                  )}
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

          {/* Footer — View all / Collapse */}
          {notifications.length > 5 && (
            <div className="px-4 py-2.5 border-t border-gray-100 text-center">
              <button onClick={() => setShowAll(!showAll)}
                className="text-sm text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
                {showAll ? 'Show less' : `View all notifications (${notifications.length})`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}