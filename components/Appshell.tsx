'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { MessageSquare, Megaphone, LogOut, Lock, ArrowLeft } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'

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
  onboardingComplete?: boolean
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
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
        locked
          ? 'text-gray-300 cursor-not-allowed'
          : active
            ? 'bg-indigo-50 text-indigo-600'
            : 'text-gray-600 hover:bg-gray-50'
      }`}
      disabled={locked}
    >
      <span className="flex items-center justify-center w-5 h-5">{icon}</span>
      <span>{label}</span>
      {locked && <Lock className="w-3.5 h-3.5 ml-auto text-gray-300" />}
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

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) { router.push('/auth'); return }
      setUser(JSON.parse(userStr))
    } catch {
      router.push('/auth')
    }
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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ═══ LEFT SIDEBAR ═══ */}
      <aside className="w-[220px] flex flex-col flex-shrink-0 border-r" style={{ background: 'white', borderColor: '#e5e7eb' }}>

        {/* Logo + University */}
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

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pt-2 space-y-1">
          <NavItem
            icon={<MessageSquare className="w-[18px] h-[18px]" />}
            label="Chat"
            active={isChat && !isOnboarding}
            onClick={() => router.push('/home')}
            locked={isOnboarding}
          />
          <NavItem
            icon={<Megaphone className="w-[18px] h-[18px]" />}
            label="Campus Talks"
            active={isCampusTalks && !isOnboarding}
            onClick={() => router.push('/home/campus-talks')}
            locked={isOnboarding}
          />
        </nav>

        {/* Onboarding hint */}
        {isOnboarding && (
          <div className="mx-3 mb-3 px-3 py-3 rounded-xl bg-indigo-50 border border-indigo-100">
            <p className="text-xs text-indigo-600 font-semibold mb-1">Complete your profile</p>
            <p className="text-[11px] text-indigo-400 leading-relaxed">Fill in your details to unlock Chat and Campus Talks</p>
          </div>
        )}

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

        {/* Top Bar */}
        {showTopBar && (
          <div className="h-[56px] border-b px-6 flex items-center justify-between flex-shrink-0"
            style={{ background: 'white', borderColor: '#e5e7eb' }}>
            <div className="flex items-center gap-2">
              {(isCampusTalks || isProfile || isExplore) && (
                <button
                  onClick={() => router.push('/home')}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all -ml-1.5"
                >
                  <ArrowLeft className="w-[18px] h-[18px]" />
                </button>
              )}
              <h1 className="text-[15px] font-semibold text-gray-900">{displayTitle}</h1>
            </div>
            {user && (
              <div className="flex items-center gap-3">
                {!isOnboarding && <NotificationBell userId={user.id} />}
                <button onClick={() => router.push('/home/profile')} disabled={isOnboarding && isOnProfilePage}>
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

        {/* Page Content */}
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
            <p className="text-sm text-gray-500 mb-6">You&apos;re about to log out. Are you sure?</p>
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