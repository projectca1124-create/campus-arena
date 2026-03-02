'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { MessageSquare, Megaphone, LogOut } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'

// ─── Shared User type ──────────────────────────────────────────
interface ShellUser {
  id: string
  email: string
  firstName: string
  lastName: string
  university?: string
  major?: string
  semester?: string
  year?: string
  profileImage?: string
}

// ─── Avatar (local to shell) ───────────────────────────────────
function ShellAvatar({ src, firstName, lastName, size = 36, className = '' }: {
  src?: string | null; firstName?: string; lastName?: string; size?: number; className?: string
}) {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`
  if (src) return <img src={src} alt={`${firstName} ${lastName}`} className={`rounded-full object-cover flex-shrink-0 ${className}`} style={{ width: size, height: size }} />
  return (
    <div className={`rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {initials}
    </div>
  )
}

// ─── Nav Item ──────────────────────────────────────────────────
function NavItem({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void
}) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}>
      <span className="flex items-center justify-center w-5 h-5">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

// ─── AppShell Props ────────────────────────────────────────────
interface AppShellProps {
  children: React.ReactNode
  /** Page title shown in top bar. If not provided, auto-detects from pathname */
  title?: string
  /** Whether to show the top bar. Defaults to true. Set false if page manages its own header. */
  showTopBar?: boolean
}

// ═══════════════════════════════════════════════════════════════
// AppShell — shared layout for all /home/* pages
// Provides: sidebar, top bar, logout modal, user context
// ═══════════════════════════════════════════════════════════════
export default function AppShell({ children, title, showTopBar = true }: AppShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<ShellUser | null>(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Load user from localStorage
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) { router.push('/auth'); return }
      setUser(JSON.parse(userStr))
    } catch {
      router.push('/auth')
    }
  }, [router])

  // Listen for user updates (e.g., profile edits)
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const userStr = localStorage.getItem('user')
        if (userStr) setUser(JSON.parse(userStr))
      } catch {}
    }
    window.addEventListener('storage', handleStorageChange)
    // Also listen for custom event for same-tab updates
    window.addEventListener('userUpdated', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('userUpdated', handleStorageChange)
    }
  }, [])

  const confirmLogout = () => {
    localStorage.removeItem('user')
    router.push('/auth')
  }

  // Auto-detect active nav and page title from pathname
  const isChat = pathname === '/home' || pathname === '/home/'
  const isCampusTalks = pathname?.startsWith('/home/campus-talks')
  const isProfile = pathname?.startsWith('/home/profile')
  const isExplore = pathname?.startsWith('/home/explore')

  const autoTitle = isCampusTalks ? 'Campus Talks'
    : isProfile ? 'Profile'
    : isExplore ? 'Explore Classmates'
    : 'Chat'

  const displayTitle = title ?? autoTitle

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ═══ LEFT SIDEBAR ═══ */}
      <aside className="w-[220px] flex flex-col flex-shrink-0 border-r" style={{ background: 'white', borderColor: '#e5e7eb' }}>
        {/* Logo */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xs">CA</span>
            </div>
            <span className="font-bold text-[15px] text-gray-900 tracking-tight">Campus Arena</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pt-2 space-y-1">
          <NavItem
            icon={<MessageSquare className="w-[18px] h-[18px]" />}
            label="Chat"
            active={isChat}
            onClick={() => router.push('/home')}
          />
          <NavItem
            icon={<Megaphone className="w-[18px] h-[18px]" />}
            label="Campus Talks"
            active={isCampusTalks}
            onClick={() => router.push('/home/campus-talks')}
          />
        </nav>

        {/* Logout */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid #e5e7eb' }}>
          <button onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all text-sm font-medium">
            <LogOut className="w-[18px] h-[18px]" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ═══ MAIN AREA ═══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ─── Top Bar ─── */}
        {showTopBar && (
          <div className="h-[56px] border-b px-6 flex items-center justify-between flex-shrink-0"
            style={{ background: 'white', borderColor: '#e5e7eb' }}>
            <h1 className="text-[15px] font-semibold text-gray-900">{displayTitle}</h1>
            {user && (
              <div className="flex items-center gap-3">
                <NotificationBell userId={user.id} />
                <button onClick={() => router.push('/home/profile')}>
                  <ShellAvatar
                    src={user.profileImage}
                    firstName={user.firstName}
                    lastName={user.lastName}
                    size={34}
                    className="border-2 border-gray-100 cursor-pointer hover:ring-2 hover:ring-indigo-200 transition-all"
                  />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Page Content ─── */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>

      {/* ═══ LOGOUT MODAL ═══ */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowLogoutModal(false)}>
          <div className="rounded-2xl shadow-2xl max-w-sm w-full p-6"
            style={{ background: 'white', border: '1px solid #e5e7eb' }}
            onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Leaving Campus Arena?</h2>
            <p className="text-sm text-gray-500 mb-6">You're about to log out. Are you sure?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50"
                style={{ border: '1px solid #d1d5db' }}>
                No, Stay Here
              </button>
              <button onClick={confirmLogout}
                className="flex-1 px-4 py-2.5 text-white rounded-xl font-semibold text-sm"
                style={{ background: '#4f46e5' }}>
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}