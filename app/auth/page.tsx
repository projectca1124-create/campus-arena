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
    /*
      Force light color-scheme on the entire auth page.
      This prevents iOS/Android dark mode from:
        - inverting input backgrounds to black
        - turning placeholder text invisible
        - flipping border colors
      "color-scheme: light" tells the browser to render
      all system UI (inputs, selects, scrollbars) in light mode.
    */
    <div
      style={{ colorScheme: 'light' }}
      className="min-h-screen flex items-center justify-center px-4 py-12"
    >
      {/*
        Inline background so it's not affected by dark mode class overrides.
        Tailwind's bg-* classes can be overridden by prefers-color-scheme;
        inline style is not.
      */}
      <style>{`
        /* Scope everything inside the auth page to light mode */
        .auth-root, .auth-root * {
          color-scheme: light !important;
        }
        /* Force input/textarea/select to always render light */
        .auth-root input,
        .auth-root textarea,
        .auth-root select {
          background-color: #ffffff !important;
          color: #111827 !important;
          border-color: #e5e7eb !important;
          -webkit-text-fill-color: #111827 !important;
        }
        /* Placeholder always visible */
        .auth-root input::placeholder,
        .auth-root textarea::placeholder {
          color: #9ca3af !important;
          opacity: 1 !important;
          -webkit-text-fill-color: #9ca3af !important;
        }
        /* Autofill — browsers override bg on autofill, this forces it back */
        .auth-root input:-webkit-autofill,
        .auth-root input:-webkit-autofill:hover,
        .auth-root input:-webkit-autofill:focus,
        .auth-root input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0px 1000px #ffffff inset !important;
          box-shadow: 0 0 0px 1000px #ffffff inset !important;
          -webkit-text-fill-color: #111827 !important;
          caret-color: #111827 !important;
        }
        /* Card background */
        .auth-card {
          background-color: #ffffff !important;
        }
        /* Page background gradient */
        .auth-bg {
          background: linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, #fdf2f8 100%) !important;
        }
      `}</style>

      <div className="auth-root auth-bg w-full min-h-screen absolute inset-0 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md relative z-10">

          {/* Header */}
          <div className="text-center mb-12">
            <Link href="/" className="inline-flex items-center space-x-2 mb-8">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '18px' }}>CA</span>
              </div>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                Campus Arena
              </span>
            </Link>

            {/* Tab Navigation */}
            <div className="flex gap-3 mb-8">
              <button
                onClick={() => handleTabChange('signup')}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  fontWeight: 600,
                  borderRadius: '9999px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '15px',
                  transition: 'all 0.2s',
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
                style={{
                  flex: 1,
                  padding: '10px 0',
                  fontWeight: 600,
                  borderRadius: '9999px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '15px',
                  transition: 'all 0.2s',
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

            {/* Progress dots */}
            {activeTab === 'signup' && (
              <div className="flex gap-2 justify-center mb-12">
                {[1, 2, 3].map((step) => {
                  const state = getProgressCircle(step as SignUpStep)
                  return (
                    <div
                      key={step}
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: state === 'empty' ? '#d1d5db' : '#4f46e5',
                        transition: 'all 0.3s',
                      }}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Tab Content — wrapped in auth-card for forced white bg */}
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

        </div>
      </div>
    </div>
  )
}