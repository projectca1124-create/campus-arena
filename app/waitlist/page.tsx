'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'

export default function Waitlist() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  })
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = () => {
    const newErrors: { name?: string; email?: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error for this field when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      setSubmitted(true)
      setIsLoading(false)
      // Reset form after showing success message
      setTimeout(() => {
        setFormData({ name: '', email: '' })
        setSubmitted(false)
      }, 3000)
    }, 1000)
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-400/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Back Button */}
      <Link
        href="#hero"
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors z-10"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="font-medium">Back</span>
      </Link>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md px-4 sm:px-6">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 sm:p-10">
          {!submitted ? (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                  Launching March 1st
                </h1>
                <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
                  Be Part of Your Campus Community
                </p>
              </div>

              {/* Description */}
              <p className="text-gray-600 text-center mb-8 leading-relaxed">
                Whether you're a freshman looking for answers or an upperclassman ready to guide others, Campus Arena is where your campus connects.
              </p>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your name"
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all focus:outline-none ${
                      errors.name
                        ? 'border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    }`}
                  />
                  {errors.name && (
                    <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {errors.name}
                    </div>
                  )}
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all focus:outline-none ${
                      errors.email
                        ? 'border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    }`}
                  />
                  {errors.email && (
                    <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {errors.email}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-lg rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Getting Early Access...' : 'Get Early Access'}
                </button>
              </form>

              {/* Footer Note */}
              <p className="text-center text-gray-500 text-sm mt-6">
                We'll send you early access updates and a special invite when we launch.
              </p>
            </>
          ) : (
            // Success Message
            <div className="text-center py-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center animate-pulse">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                You're on the Waitlist!
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Thanks for joining {formData.name}! We'll send early access details to <span className="font-semibold text-gray-900">{formData.email}</span>
              </p>
              <p className="text-sm text-gray-500">
                Redirecting in a moment...
              </p>
            </div>
          )}
        </div>

        {/* Decorative Elements */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>
            Already a member?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
