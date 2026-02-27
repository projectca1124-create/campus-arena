'use client'

import { useState } from 'react'
import { Lock, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react'

interface CreatePasswordStepProps {
  email: string
  onSuccess: (password: string) => void
}

export default function CreatePasswordStep({
  email,
  onSuccess,
}: CreatePasswordStepProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      // Create account with just email + password (no profile info yet)
      const res = await fetch('/api/auth/complete-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account')
      }

      // Store user in localStorage
      localStorage.setItem('user', JSON.stringify(data.user))

      // Pass to parent (triggers splash screen)
      onSuccess(password)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  // Password strength indicator
  const getStrength = () => {
    if (!password) return { level: 0, label: '', color: '' }
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    if (score <= 2) return { level: score, label: 'Weak', color: 'bg-red-400' }
    if (score <= 3) return { level: score, label: 'Fair', color: 'bg-yellow-400' }
    return { level: score, label: 'Strong', color: 'bg-green-400' }
  }

  const strength = getStrength()

  return (
    <div className="bg-white rounded-2xl p-8 shadow-lg">
      {/* Icon */}
      <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Lock className="w-8 h-8 text-indigo-600" />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
        Create your password
      </h2>
      <p className="text-gray-500 text-center mb-8">
        Make it strong and memorable
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Password Input */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Create Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder="••••••••"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
              }`}
              disabled={isLoading}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-500" tabIndex={-1}>
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {/* Strength bar */}
          {password && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength.level ? strength.color : 'bg-gray-200'}`} />
                ))}
              </div>
              <p className="text-xs text-gray-500">{strength.label} — at least 8 characters</p>
            </div>
          )}
          {!password && <p className="text-xs text-gray-500 mt-2">At least 8 characters</p>}
        </div>

        {/* Confirm Password Input */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
              placeholder="••••••••"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
              }`}
              disabled={isLoading}
            />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-3 text-gray-500" tabIndex={-1}>
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {confirmPassword && password && confirmPassword !== password && (
            <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
          )}
          {confirmPassword && password && confirmPassword === password && (
            <p className="text-xs text-green-500 mt-1">✓ Passwords match</p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Enter the Arena Button */}
        <button
          type="submit"
          disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-[15px]"
        >
          {isLoading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Creating account...</>
          ) : (
            <><Sparkles className="w-5 h-5" /> Enter the Arena</>
          )}
        </button>
      </form>
    </div>
  )
}