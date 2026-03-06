'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import SignUpTab from './components/SignUpTab'
import LoginTab from './components/LoginTab'
import SplashScreen from './components/SplashScreen'

type SignUpStep = 1 | 2 | 3 | 4

export default function AuthPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('signup')
  const [signUpStep, setSignUpStep] = useState<SignUpStep>(1)
  const [showSplash, setShowSplash] = useState(false)
  const [signUpEmail, setSignUpEmail] = useState('')

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'login' || tab === 'signup') {
      setActiveTab(tab)
      if (tab === 'signup') setSignUpStep(1)
    }
  }, [searchParams])

  const handleTabChange = (tab: 'signup' | 'login') => {
    setActiveTab(tab)
    if (tab === 'signup') setSignUpStep(1)
    window.history.pushState(null, '', `?tab=${tab}`)
  }

  const handleSignUpStepChange = (step: SignUpStep) => {
    setSignUpStep(step)
  }

  const getProgressCircle = (step: SignUpStep) => {
    if (step < signUpStep) return 'filled'
    if (step === signUpStep) return 'active'
    return 'empty'
  }

  if (showSplash) {
    return <SplashScreen email={signUpEmail} />
  }

  return (
    <div style={{ colorScheme: 'light' }}>
      <style>{`
        .auth-root, .auth-root * { color-scheme: light !important; }
        .auth-root input,
        .auth-root textarea,
        .auth-root select {
          background-color: #ffffff !important;
          color: #111827 !important;
          border-color: #e5e7eb !important;
          -webkit-text-fill-color: #111827 !important;
          /* ✅ Prevent iOS from zooming in on input focus (font-size < 16px triggers zoom) */
          font-size: 16px !important;
        }
        .auth-root input::placeholder,
        .auth-root textarea::placeholder {
          color: #9ca3af !important;
          opacity: 1 !important;
          -webkit-text-fill-color: #9ca3af !important;
        }
        .auth-root input:-webkit-autofill,
        .auth-root input:-webkit-autofill:hover,
        .auth-root input:-webkit-autofill:focus,
        .auth-root input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0px 1000px #ffffff inset !important;
          box-shadow: 0 0 0px 1000px #ffffff inset !important;
          -webkit-text-fill-color: #111827 !important;
          caret-color: #111827 !important;
        }
        .auth-card { background-color: #ffffff !important; }
        .auth-bg {
          background: linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, #fdf2f8 100%) !important;
        }
        /* ✅ Ensure full height fills screen on iOS Safari */
        .auth-scroll {
          min-height: 100vh;
          min-height: -webkit-fill-available;
        }
        /* ✅ Tab buttons — minimum 44px tap target (Apple HIG) */
        .auth-tab-btn {
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      {/*
        ✅ MOBILE FIX: overflow-y-auto + min-h allows scrolling on short screens.
        justify-start on mobile (content starts top), justify-center on desktop.
        Safe area padding handles iPhone notch / home bar.
      */}
      <div className="auth-root auth-bg auth-scroll w-full overflow-y-auto flex flex-col items-center justify-start sm:justify-center"
        style={{ paddingTop: 'max(24px, env(safe-area-inset-top))', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>

        <div className="w-full max-w-md px-4 py-4 sm:py-8">

          {/* ── Logo ── */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '18px' }}>CA</span>
              </div>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                Campus Arena
              </span>
            </Link>
          </div>

          {/* ── Tab Navigation ── */}
          <div className="flex gap-3 mb-5 sm:mb-6">
            <button
              onClick={() => handleTabChange('signup')}
              className="auth-tab-btn flex-1 font-semibold rounded-full transition-all"
              style={{
                padding: '10px 0',
                fontSize: '15px',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'signup'
                  ? 'linear-gradient(to right, #2563eb, #7c3aed)'
                  : '#ffffff',
                color: activeTab === 'signup' ? '#ffffff' : '#4b5563',
                boxShadow: activeTab === 'signup'
                  ? '0 4px 14px rgba(99,102,241,0.35)'
                  : '0 0 0 1.5px #e5e7eb',
              }}
            >
              Sign Up
            </button>
            <button
              onClick={() => handleTabChange('login')}
              className="auth-tab-btn flex-1 font-semibold rounded-full transition-all"
              style={{
                padding: '10px 0',
                fontSize: '15px',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'login'
                  ? 'linear-gradient(to right, #2563eb, #7c3aed)'
                  : '#ffffff',
                color: activeTab === 'login' ? '#ffffff' : '#4b5563',
                boxShadow: activeTab === 'login'
                  ? '0 4px 14px rgba(99,102,241,0.35)'
                  : '0 0 0 1.5px #e5e7eb',
              }}
            >
              Log In
            </button>
          </div>

          {/* ── Progress dots (signup only) — compact on mobile ── */}
          {activeTab === 'signup' && (
            <div className="flex gap-2 justify-center mb-5 sm:mb-8">
              {[1, 2, 3].map((step) => {
                const state = getProgressCircle(step as SignUpStep)
                return (
                  <div
                    key={step}
                    style={{
                      width: state === 'active' ? '20px' : '8px',
                      height: '8px',
                      borderRadius: '999px',
                      background: state === 'empty' ? '#d1d5db' : '#4f46e5',
                      transition: 'all 0.3s ease',
                    }}
                  />
                )
              })}
            </div>
          )}

          {/* ── Card ── */}
          <div className="auth-card" style={{ borderRadius: '20px', overflow: 'hidden' }}>
            {activeTab === 'signup' ? (
              <SignUpTab
                onTabChange={handleTabChange}
                onStepChange={handleSignUpStepChange}
                onSignupComplete={(email: string) => {
                  setSignUpEmail(email)
                  setShowSplash(true)
                }}
              />
            ) : (
              <LoginTab onTabChange={handleTabChange} />
            )}
          </div>

          {/* ✅ Bottom safe area spacer for iPhone home bar */}
          <div style={{ height: 'env(safe-area-inset-bottom, 16px)' }} />
        </div>
      </div>
    </div>
  )
}