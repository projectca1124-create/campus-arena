'use client'

import { useState } from 'react'
import { Mail, ArrowLeft } from 'lucide-react'

// Step components
import VerifyOTPStep from './VerifyOTPStep'
import CreatePasswordStep from './CreatePasswordStep'
import ProfileInfoStep from './ProfileInfoStep'

interface SignUpTabProps {
  onTabChange: (tab: 'signup' | 'login') => void
  onStepChange?: (step: 1 | 2 | 3 | 4) => void
}

type SignUpStep = 1 | 2 | 3 | 4

interface SignUpData {
  email: string
  password: string
  firstName: string
  lastName: string
  major: string
  semester: string
  year: string
  funFact: string
  profileImage?: string
}

export default function SignUpTab({ onTabChange, onStepChange }: SignUpTabProps) {
  const [currentStep, setCurrentStep] = useState<SignUpStep>(1)
  const [signUpData, setSignUpData] = useState<Partial<SignUpData>>({})
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Helper to update step and notify parent
  const updateStep = (step: SignUpStep) => {
    setCurrentStep(step)
    onStepChange?.(step)
  }

  // Step 1: Email Entry & OTP Generation
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const email = signUpData.email || ''
    const trimmedEmail = email.trim().toLowerCase()

    // Validate email format
    const eduEmailRegex = /^[^\s@]+@([^\s@]+\.)*[^\s@]+\.edu$/
    if (!eduEmailRegex.test(trimmedEmail)) {
      setError('Please use your university email (must end in .edu)')
      return
    }

    setIsLoading(true)

    try {
      // FIRST:Check if
      console.log('🔍 Checking if account exists for:', trimmedEmail)
      const checkResponse = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: trimmedEmail }),
      })

      const checkData = await checkResponse.json()

      // If account exists, show error
      if (checkData.exists) {
        console.log('❌ Account already exists')
        setError('An account with this email already exists. Please log in instead.')
        setIsLoading(false)
        return
      }

      console.log('✅ Account does not exist, sending OTP...')

      // SECOND: Send OTP if account doesn't exist
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          authType: 'signup',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP')
      }

      console.log('📧 OTP sent successfully')

      // OTP sent successfully, move to step 2
      setSignUpData({ ...signUpData, email: trimmedEmail })
      updateStep(2)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      console.error('❌ Error:', message)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: OTP Verification - move to step 3
  const handleOTPVerifySuccess = () => {
    updateStep(3)
    setError('')
  }

  // Step 2: Change Email - go back to step 1
  const handleChangeEmail = () => {
    updateStep(1)
    setError('')
  }

  // Step 3: Password Creation - move to step 4
  const handlePasswordSuccess = (password: string) => {
    setSignUpData({ ...signUpData, password })
    updateStep(4)
    setError('')
  }

  // Step 4: Profile Info - Account creation complete
  const handleProfileSuccess = (profileData: any) => {
    // All data collected, account created
    console.log('✅ Account created:', { ...signUpData, ...profileData })
    // Redirect to dashboard or home
    window.location.href = '/home'
  }

  // Render Step 1: Email Entry
  if (currentStep === 1) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        {/* Icon */}
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-blue-600" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Enter your university email
        </h2>
        <p className="text-gray-600 text-center mb-8">
          We'll send you a verification code
        </p>

        {/* Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              University Email
            </label>
            <input
              type="email"
              value={signUpData.email || ''}
              onChange={(e) => {
                setSignUpData({ ...signUpData, email: e.target.value })
                setError('')
              }}
              placeholder="example@university.edu"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                error
                  ? 'border-red-500 focus:ring-red-500 bg-red-50'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
              disabled={isLoading}
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              ✓ Must be your official .edu email address
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !signUpData.email}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Checking email...' : 'Generate OTP'}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
        </div>

        {/* Toggle Link */}
        <p className="text-center text-gray-600">
          Already have an account?{' '}
          <button
            onClick={() => onTabChange('login')}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Log in
          </button>
        </p>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-gray-600 hover:text-gray-900 font-medium inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </a>
        </div>
      </div>
    )
  }

  // Render Step 2: OTP Verification
  if (currentStep === 2) {
    return (
      <VerifyOTPStep
        email={signUpData.email || ''}
        onSuccess={handleOTPVerifySuccess}
        onChangeEmail={handleChangeEmail}
      />
    )
  }

  // Render Step 3: Create Password
  if (currentStep === 3) {
    return (
      <CreatePasswordStep
        email={signUpData.email || ''}
        onSuccess={handlePasswordSuccess}
      />
    )
  }

  // Render Step 4: Profile Information
  if (currentStep === 4) {
    return (
      <ProfileInfoStep
        email={signUpData.email || ''}
        password={signUpData.password || ''}
        onSuccess={handleProfileSuccess}
        onTabChange={onTabChange}
      />
    )
  }

  return null
}