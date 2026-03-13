'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { MessageSquare, Megaphone, LogOut, Lock, Gamepad2, ArrowLeft } from 'lucide-react'
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

function NavItem({ icon, label, active, onClick, locked }: {
  icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void; locked?: boolean
}) {
  return (
    <button
      onClick={locked ? undefined : onClick}
      disabled={locked}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
        active ? 'bg-indigo-50 text-indigo-600' : locked ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
      style={{ border: 'none', textAlign: 'left', fontWeight: active ? 600 : 500 }}
    >
      <span className="flex items-center justify-center w-[18px] h-[18px] flex-shrink-0">{icon}</span>
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
      {locked && <Lock style={{ width: 12, height: 12, flexShrink: 0 }} />}
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

  const isChat        = pathname === '/home' || pathname === '/home/'
  const isCampusTalks = pathname?.startsWith('/home/campus-talks')
  const isProfile     = pathname?.startsWith('/home/profile')
  const isExplore     = pathname?.startsWith('/home/explore')
  const isGames       = pathname?.startsWith('/home/campus-games')
  const isOnboarding  = !user?.onboardingComplete

  const showBack = isProfile || isExplore

  const autoTitle = isCampusTalks ? 'Campus Talks'
    : isProfile  ? 'Profile'
    : isExplore  ? 'Explore Classmates'
    : isGames    ? 'Campus Games'
    : 'Chat'
  const displayTitle = title ?? autoTitle

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f9fafb' }}>

      {/* ═══════════════════════════════════════
          SIDEBAR
      ═══════════════════════════════════════ */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'white',
        borderRight: '1px solid #e5e7eb',
        height: '100vh',
      }}>

        {/* Logo — matches Chat page px-5 py-5 */}
        <div style={{ padding: '20px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: 'white', fontWeight: 800, fontSize: 12, letterSpacing: '-0.02em' }}>CA</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Campus Arena</div>
              {user?.university && (
                <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.university.includes('.') ? user.university.split('.')[0].toUpperCase() : user.university}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#f3f4f6', margin: '0 16px 8px' }} />

        {/* Nav items — matches Chat page px-3 space-y-1 */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <NavItem
            icon={<MessageSquare style={{ width: 18, height: 18 }} />}
            label="Chat"
            active={isChat && !isOnboarding}
            onClick={() => router.push('/home')}
            locked={isOnboarding}
          />
          <NavItem
            icon={<Megaphone style={{ width: 18, height: 18 }} />}
            label="Campus Talks"
            active={isCampusTalks && !isOnboarding}
            onClick={() => router.push('/home/campus-talks')}
            locked={isOnboarding}
          />
          <NavItem
            icon={<Gamepad2 style={{ width: 18, height: 18 }} />}
            label="Campus Games"
            active={isGames && !isOnboarding}
            onClick={() => router.push('/home/campus-games')}
            locked={isOnboarding}
          />
        </nav>

        {isOnboarding && (
          <div style={{ margin: '0 10px 10px', padding: '10px 12px', background: '#eff6ff', borderRadius: 10, border: '1px solid #dbeafe' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', marginBottom: 3 }}>Complete your profile</div>
            <div style={{ fontSize: 10, color: '#60a5fa', lineHeight: 1.5 }}>Fill in your details to unlock all features</div>
          </div>
        )}

        {/* Logout — matches Chat page px-3 py-4 text-sm */}
        <div style={{ borderTop: '1px solid #e5e7eb', padding: '12px 12px' }}>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all text-sm font-medium"
            style={{ border: 'none', background: 'none', cursor: 'pointer' }}
          >
            <LogOut style={{ width: 18, height: 18, flexShrink: 0 }} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════
          MAIN AREA
      ═══════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {showTopBar && (
          <div style={{
            flexShrink: 0,
            height: 54,
            background: 'white',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            gap: 12,
          }}>
            {showBack && !isGames && (
              <button
                onClick={() => router.back()}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', flexShrink: 0 }}
              >
                <ArrowLeft style={{ width: 16, height: 16, color: '#6b7280' }} />
              </button>
            )}
            {!isGames && (
              <h1 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827', flex: 1 }}>{displayTitle}</h1>
            )}
            {isGames && <div style={{ flex: 1 }} />}
            {user && !isOnboarding && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <NotificationBell userId={user.id} />
                <button
                  onClick={() => router.push('/home/profile')}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ShellAvatar src={user.profileImage} firstName={user.firstName} lastName={user.lastName} size={32} className="border-2 border-gray-100 hover:ring-2 hover:ring-indigo-200 transition-all cursor-pointer" />
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {children}
        </div>
      </div>

      {/* LOGOUT MODAL */}
      {showLogoutModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            style={{ background: 'white', borderRadius: 20, padding: 28, maxWidth: 360, width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#111827' }}>Leaving Campus Arena?</h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280' }}>You're about to log out. Are you sure?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowLogoutModal(false)}
                style={{ flex: 1, height: 44, borderRadius: 12, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Stay
              </button>
              <button
                onClick={confirmLogout}
                style={{ flex: 1, height: 44, borderRadius: 12, border: 'none', background: '#4f46e5', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}