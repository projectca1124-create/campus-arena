'use client'

import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import AppShell from '@/components/Appshell'

function HomeLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [allowed, setAllowed] = useState(false)

  // The Chat page (/home) has a unique 3-column layout — bypasses AppShell
  const isChatPage = pathname === '/home' || pathname === '/home/'
  const isProfilePage = pathname?.startsWith('/home/profile')

  // ── Onboarding guard ──
  // If user hasn't completed onboarding, redirect them to profile
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        router.push('/auth')
        return
      }
      const user = JSON.parse(userStr)

      if (!user.onboardingComplete) {
        // Allow profile page (that's where they need to be)
        if (isProfilePage) {
          setAllowed(true)
          setChecked(true)
          return
        }
        // Redirect everything else to profile onboarding
        router.replace('/home/profile?onboarding=true')
        return
      }

      // Onboarding complete — allow all pages
      setAllowed(true)
      setChecked(true)
    } catch {
      router.push('/auth')
    }
  }, [pathname, router, isProfilePage])

  // Show spinner while checking
  if (!checked || !allowed) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (isChatPage) {
    return <>{children}</>
  }

  // Profile page in onboarding mode gets a custom title
  const isOnboarding = isProfilePage && searchParams?.get('onboarding') === 'true'
  const title = isOnboarding ? 'Complete Your Profile' : undefined

  return (
    <AppShell title={title}>
      {children}
    </AppShell>
  )
}

// Wrap in Suspense because useSearchParams requires it
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <HomeLayoutInner>{children}</HomeLayoutInner>
    </Suspense>
  )
}