'use client'

import { useState, useRef } from 'react'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

interface VerifyOTPStepProps {
  email: string
  onSuccess: () => void
  onChangeEmail: () => void
}

export default function VerifyOTPStep({
  email,
  onSuccess,
  onChangeEmail,
}: VerifyOTPStepProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Handle individual box input
  const handleInputChange = (index: number, value: string) => {
    // Only allow single digit
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value

    setOtp(newOtp)
    setError('')

    // Move to next box if digit entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Handle paste - distribute digits across boxes
  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    const digits = pastedText.replace(/\D/g, '').split('') // Extract only digits

    if (digits.length === 0) return

    const newOtp = [...otp]
    let currentIndex = index

    // Fill boxes starting from current index
    for (let i = 0; i < digits.length && currentIndex < 6; i++) {
      newOtp[currentIndex] = digits[i]
      currentIndex++
    }

    setOtp(newOtp)
    setError('')

    // Focus the last filled box or next empty box
    const nextIndex = Math.min(currentIndex - 1, 5)
    setTimeout(() => {
      inputRefs.current[nextIndex]?.focus()
    }, 0)
  }

  // Handle OTP verification
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const otpCode = otp.join('')

    if (otpCode.length < 6) {
      setError('Please enter a valid 6-digit OTP')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code: otpCode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify OTP')
      }

      // OTP verified successfully
      onSuccess()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  // Resend OTP
  const handleResendOTP = async () => {
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          authType: 'signup',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend OTP')
      }

      // Reset OTP
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend OTP'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-8 shadow-lg">
      {/* Icon */}
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <ShieldAlert className="w-8 h-8 text-blue-600" />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
        Verify your email
      </h2>
      <p className="text-gray-600 text-center mb-8">
        We sent a verification code to <br />
        <span className="font-semibold text-gray-900">{email}</span>
      </p>

      {/* Form */}
      <form onSubmit={handleVerifyOTP} className="space-y-6">
        {/* OTP Boxes */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-4">
            Verification Code
          </label>
          <div className="flex justify-center gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                type="text"
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={(e) => handlePaste(index, e)}
                maxLength={1}
                placeholder="-"
                className={`w-12 h-14 border-2 rounded-lg text-center text-2xl font-semibold focus:outline-none transition-all ${
                  error
                    ? 'border-red-500 focus:border-red-500 bg-red-50'
                    : 'border-gray-300 focus:border-blue-500 bg-gray-50'
                }`}
                disabled={isLoading}
              />
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 flex items-center gap-2">
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
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || otp.join('').length < 6}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Verifying...' : 'Verify Code'}
        </button>
      </form>

      {/* Divider */}
      <div className="my-6 relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
      </div>

      {/* Resend & Change Email */}
      <div className="space-y-3">
        {/* Resend OTP Button */}
        <button
          onClick={handleResendOTP}
          disabled={isLoading}
          className="w-full py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Resending...' : 'Resend Code'}
        </button>

        {/* Change Email Link */}
        <button
          onClick={onChangeEmail}
          disabled={isLoading}
          className="w-full py-2 text-gray-600 hover:text-gray-900 font-medium inline-flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Change email
        </button>
      </div>
    </div>
  )
}