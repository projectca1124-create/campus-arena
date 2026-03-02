'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import AppShell from '@/components/Appshell'

function HomeLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // The Chat page (/home) has a unique 3-column layout and manages its own
  // sidebar + top bar internally — it bypasses AppShell entirely.
  const isChatPage = pathname === '/home' || pathname === '/home/'

  if (isChatPage) {
    return <>{children}</>
  }

  // Profile page in onboarding mode gets a custom title
  const isOnboarding = pathname?.startsWith('/home/profile') && searchParams?.get('onboarding') === 'true'
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