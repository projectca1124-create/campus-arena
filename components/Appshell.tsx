'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { MessageSquare, Megaphone, LogOut, Lock, ArrowLeft, User } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import { usePushNotifications } from '@/lib/use-push-notifications'

interface ShellUser {
  id: string; email: string; firstName: string; lastName: string
  university?: string; major?: string; semester?: string; year?: string
  profileImage?: string; onboardingComplete?: boolean
}

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

// ─── Desktop sidebar nav item ────────────────────────────────────
function NavItem({ icon, label, active, onClick, locked }: {
  icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void; locked?: boolean
}) {
  return (
    <button
      onClick={locked ? undefined : onClick}
      disabled={locked}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
        locked ? 'text-gray-300 cursor-not-allowed'
        : active ? 'bg-indigo-50 text-indigo-600'
        : 'text-gray-600 hover:bg-gray-50'
      }`}
      style={{ minHeight: 44 }}
    >
      <span className="flex items-center justify-center w-5 h-5">{icon}</span>
      <span>{label}</span>
      {locked && <Lock className="w-3.5 h-3.5 ml-auto text-gray-300" />}
    </button>
  )
}

// ─── Mobile bottom nav item ──────────────────────────────────────
function BottomNavItem({ icon, label, active, onClick, locked }: {
  icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void; locked?: boolean
}) {
  return (
    <button
      onClick={locked ? undefined : onClick}
      disabled={locked}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all ${
        locked ? 'text-gray-300 cursor-not-allowed'
        : active ? 'text-indigo-600'
        : 'text-gray-400 active:text-gray-600'
      }`}
      style={{ minHeight: 56, WebkitTapHighlightColor: 'transparent' }}
    >
      <span className={`flex items-center justify-center transition-transform ${active ? 'scale-110' : ''}`}>
        {icon}
      </span>
      <span className="text-[10px] font-semibold tracking-wide leading-none">{label}</span>
    </button>
  )
}

interface AppShellProps {
  children: React.ReactNode
  title?: string
  showTopBar?: boolean
}

export default function AppShell({ children, title, showTopBar = true }: AppShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<ShellUser | null>(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  usePushNotifications(user?.id)

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) { router.push('/auth'); return }
      setUser(JSON.parse(userStr))
    } catch { router.push('/auth') }
  }, [router])

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const userStr = localStorage.getItem('user')
        if (userStr) setUser(JSON.parse(userStr))
      } catch {}
    }
    window.addEventListener('storage', handleStorageChange)
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

  const isChat = pathname === '/home' || pathname === '/home/'
  const isCampusTalks = pathname?.startsWith('/home/campus-talks')
  const isProfile = pathname?.startsWith('/home/profile')
  const isExplore = pathname?.startsWith('/home/explore')
  const isOnboarding = !user?.onboardingComplete
  const isOnProfilePage = isProfile

  const autoTitle = isCampusTalks ? 'Campus Talks'
    : isProfile ? 'Profile'
    : isExplore ? 'Explore Classmates'
    : 'Chat'
  const displayTitle = title ?? autoTitle

  // ── Show back arrow on sub-pages ──
  const showBack = isCampusTalks || isProfile || isExplore

  return (
    // ✅ h-[100dvh] — uses dynamic viewport height on mobile (excludes browser chrome)
    // Fallback to h-screen for browsers without dvh support
    <div className="flex overflow-hidden bg-gray-50" style={{ height: '100dvh', minHeight: '-webkit-fill-available' }}>

      {/* ═══════════════════════════════════════
          DESKTOP SIDEBAR — hidden on mobile
          ═══════════════════════════════════════ */}
      <aside className="hidden lg:flex w-[220px] flex-col flex-shrink-0 border-r bg-white border-gray-200">

        {/* Logo */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">CA</span>
            </div>
            <div className="min-w-0">
              <span className="font-bold text-[15px] text-gray-900 tracking-tight block leading-tight">Campus Arena</span>
              {user?.university && (
                <span className="text-[11px] text-indigo-500 font-semibold truncate block leading-tight mt-0.5">
                  {user.university.split('.')[0].toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pt-2 space-y-1">
          <NavItem icon={<MessageSquare className="w-[18px] h-[18px]" />} label="Chat"
            active={isChat && !isOnboarding} onClick={() => router.push('/home')} locked={isOnboarding} />
          <NavItem icon={<Megaphone className="w-[18px] h-[18px]" />} label="Campus Talks"
            active={isCampusTalks && !isOnboarding} onClick={() => router.push('/home/campus-talks')} locked={isOnboarding} />
        </nav>

        {isOnboarding && (
          <div className="mx-3 mb-3 px-3 py-3 rounded-xl bg-indigo-50 border border-indigo-100">
            <p className="text-xs text-indigo-600 font-semibold mb-1">Complete your profile</p>
            <p className="text-[11px] text-indigo-400 leading-relaxed">Fill in your details to unlock Chat and Campus Talks</p>
          </div>
        )}

        <div className="px-3 py-4 border-t border-gray-200">
          <button onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all text-sm font-medium"
            style={{ minHeight: 40 }}>
            <LogOut className="w-[18px] h-[18px]" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════
          MAIN AREA
          ═══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        {showTopBar && (
          <div className="flex-shrink-0 border-b bg-white border-gray-200"
            style={{
              height: 56,
              paddingLeft: 'max(16px, env(safe-area-inset-left))',
              paddingRight: 'max(16px, env(safe-area-inset-right))',
            }}>
            <div className="h-full flex items-center justify-between px-2 sm:px-4">
              <div className="flex items-center gap-1.5 min-w-0">
                {showBack && (
                  <button onClick={() => router.push('/home')}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all flex-shrink-0"
                    style={{ minWidth: 36, minHeight: 36 }}>
                    <ArrowLeft className="w-[18px] h-[18px]" />
                  </button>
                )}
                <h1 className="text-[15px] font-semibold text-gray-900 truncate">{displayTitle}</h1>
              </div>

              {user && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isOnboarding && <NotificationBell userId={user.id} />}
                  <button
                    onClick={() => router.push('/home/profile')}
                    disabled={isOnboarding && isOnProfilePage}
                    style={{ minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ShellAvatar src={user.profileImage} firstName={user.firstName} lastName={user.lastName}
                      size={32} className="border-2 border-gray-100 cursor-pointer hover:ring-2 hover:ring-indigo-200 transition-all" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Page content
            ✅ pb accounts for mobile bottom nav height + safe area */}
        <div className="flex-1 overflow-y-auto lg:pb-0"
          style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}
          // ↑ Only applied implicitly — the actual bottom nav sits outside this div
          // We override with a class approach below
        >
          {/* Remove inline paddingBottom — handled via bottom nav spacer */}
          {children}
        </div>

        {/* ════════════════════════════════════════
            MOBILE BOTTOM NAV — visible only on mobile (lg:hidden)
            ════════════════════════════════════════ */}
        {/* ✅ Hide bottom nav on sub-pages — they have a back button instead */}
        <nav
          className={`lg:hidden flex-shrink-0 bg-white border-t border-gray-200 flex items-stretch ${showBack ? 'hidden' : ''}`}
          style={{
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            // Safe area handles iPhone home bar
          }}
        >
          <BottomNavItem
            icon={<MessageSquare className="w-5 h-5" />}
            label="Chat"
            active={isChat && !isOnboarding}
            onClick={() => router.push('/home')}
            locked={isOnboarding}
          />
          <BottomNavItem
            icon={<Megaphone className="w-5 h-5" />}
            label="Talks"
            active={isCampusTalks && !isOnboarding}
            onClick={() => router.push('/home/campus-talks')}
            locked={isOnboarding}
          />
          <BottomNavItem
            icon={user?.profileImage
              ? <img src={user.profileImage} className="w-5 h-5 rounded-full object-cover" alt="" />
              : <User className="w-5 h-5" />
            }
            label="Profile"
            active={isProfile}
            onClick={() => router.push('/home/profile')}
          />
          <BottomNavItem
            icon={<LogOut className="w-5 h-5" />}
            label="Logout"
            onClick={() => setShowLogoutModal(true)}
          />
        </nav>
      </div>

      {/* ═══ LOGOUT MODAL ═══ */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowLogoutModal(false)}>
          <div className="rounded-2xl shadow-2xl max-w-sm w-full p-6 bg-white border border-gray-200"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Leaving Campus Arena?</h2>
            <p className="text-sm text-gray-500 mb-6">You&apos;re about to log out. Are you sure?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50"
                style={{ height: 48 }}>
                No, Stay
              </button>
              <button onClick={confirmLogout}
                className="flex-1 px-4 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700"
                style={{ height: 48 }}>
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}