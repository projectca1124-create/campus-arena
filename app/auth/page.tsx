'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import SignUpTab from './components/SignUpTab'
import LoginTab from './components/LoginTab'

type SignUpStep = 1 | 2 | 3 | 4

export default function AuthPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('signup')
  const [signUpStep, setSignUpStep] = useState<SignUpStep>(1)

  // Set active tab from URL parameter
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'login' || tab === 'signup') {
      setActiveTab(tab)
      // Reset signup step when switching tabs
      if (tab === 'signup') {
        setSignUpStep(1)
      }
    }
  }, [searchParams])

  const handleTabChange = (tab: 'signup' | 'login') => {
    setActiveTab(tab)
    // Reset signup step when switching to signup
    if (tab === 'signup') {
      setSignUpStep(1)
    }
    // Update URL without navigation
    window.history.pushState(null, '', `?tab=${tab}`)
  }

  // Function to update signup step (called from SignUpTab)
  const handleSignUpStepChange = (step: SignUpStep) => {
    setSignUpStep(step)
  }

  // Helper function to get progress circle state
  const getProgressCircle = (step: SignUpStep) => {
    if (step < signUpStep) {
      return 'filled' // Completed step
    } else if (step === signUpStep) {
      return 'active' // Current step
    } else {
      return 'empty' // Future step
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center space-x-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">CA</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Campus Arena</span>
          </Link>

          {/* Tab Navigation */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={() => handleTabChange('signup')}
              className={`flex-1 py-2.5 font-semibold rounded-full transition-all ${
                activeTab === 'signup'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => handleTabChange('login')}
              className={`flex-1 py-2.5 font-semibold rounded-full transition-all ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              Log In
            </button>
          </div>

          {/* Progress indicators - DYNAMIC FOR SIGNUP */}
          {activeTab === 'signup' && (
            <div className="flex gap-2 justify-center mb-12">
              {[1, 2, 3, 4].map((step) => {
                const state = getProgressCircle(step as SignUpStep)
                return (
                  <div
                    key={step}
                    className={`rounded-full transition-all ${
                      state === 'filled'
                        ? 'w-2 h-2 bg-blue-600'
                        : state === 'active'
                        ? 'w-2 h-2 bg-blue-600'
                        : 'w-2 h-2 bg-gray-300'
                    }`}
                  ></div>
                )
              })}
            </div>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'signup' ? (
          <SignUpTab 
            onTabChange={handleTabChange}
            onStepChange={handleSignUpStepChange}
          />
        ) : (
          <LoginTab onTabChange={handleTabChange} />
        )}
      </div>
    </div>
  )
}