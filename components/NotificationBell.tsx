// components/NotificationBell.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'

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

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }

  // Initial fetch + poll every 30s
  useEffect(() => {
    if (!userId) return
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [userId])

  // Mark all as read when opening
  const handleOpen = async () => {
    setIsOpen(!isOpen)
    if (!isOpen && unreadCount > 0) {
      try {
        await fetch('/api/notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        })
        setUnreadCount(0)
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      } catch (err) {
        console.error('Error marking notifications read:', err)
      }
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={handleOpen} className="relative p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-all">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[320px] bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.slice(0, 10).map((n) => (
                <div key={n.id} className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-all ${!n.read ? 'bg-indigo-50/40' : ''}`}>
                  <p className="text-sm text-gray-900 leading-snug">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 text-center">
              <button className="text-sm text-indigo-600 font-semibold hover:text-indigo-700">View all notifications</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}