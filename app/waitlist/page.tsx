'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, AlertCircle, Zap, Users, Shield } from 'lucide-react'

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

    setTimeout(() => {
      setSubmitted(true)
      setIsLoading(false)
      setTimeout(() => {
        setFormData({ name: '', email: '' })
        setSubmitted(false)
      }, 4000)
    }, 1000)
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center overflow-hidden py-12 md:py-20">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 right-1/3 w-80 h-80 bg-pink-400/15 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Back Button */}
      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-all duration-300 z-10 group"
      >
        <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back Home</span>
      </Link>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        {!submitted ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left Section - Info */}
            <div className="space-y-8 lg:pr-8">
              {/* Header */}
              <div>
                <div className="inline-block mb-6">
                  <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                    ✨ Coming Soon
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4">
                  Launching Soon <br />
              
                </h1>
                
              </div>

              {/* Description */}
              <p className="text-lg text-gray-600 leading-relaxed">
                Whether you're a freshman looking for answers or an upperclassman ready to guide others, Campus Arena is where your campus connects.
              </p>

              {/* Benefits */}
              <div className="space-y-5 pt-4">
                <div className="flex items-start gap-4 group cursor-pointer">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2 text-lg">Verified Students Only</h3>
                    <p className="text-gray-600">Every member verified with college email</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 group cursor-pointer">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2 text-lg">Connect Early</h3>
                    <p className="text-gray-600">Meet classmates who share your interests</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 group cursor-pointer">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2 text-lg">Ask Seniors Anything</h3>
                    <p className="text-gray-600">Get real answers about campus life</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Form */}
            <div className="lg:pl-8">
              <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-10 md:p-12 border border-white/50 hover:shadow-xl transition-shadow duration-300">
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Join the Waitlist</h2>
                <p className="text-gray-600 mb-10 text-base">Get early access and exclusive updates</p>

                <form onSubmit={handleSubmit} className="space-y-7">
                  {/* Name Field */}
                  <div className="group">
                    <label htmlFor="name" className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className={`w-full px-6 py-4 rounded-xl border-2 transition-all duration-300 focus:outline-none text-gray-900 placeholder-gray-400 font-medium ${
                        errors.name
                          ? 'border-red-500 bg-red-50/50 focus:border-red-600 focus:ring-2 focus:ring-red-200'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      }`}
                    />
                    {errors.name && (
                      <div className="flex items-center gap-2 mt-3 text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium">{errors.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Email Field */}
                  <div className="group">
                    <label htmlFor="email" className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@college.edu"
                      className={`w-full px-6 py-4 rounded-xl border-2 transition-all duration-300 focus:outline-none text-gray-900 placeholder-gray-400 font-medium ${
                        errors.email
                          ? 'border-red-500 bg-red-50/50 focus:border-red-600 focus:ring-2 focus:ring-red-200'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      }`}
                    />
                    {errors.email && (
                      <div className="flex items-center gap-2 mt-3 text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium">{errors.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-5 px-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold text-lg rounded-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed mt-10 group"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Joining Now...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Join the Waitlist
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </span>
                    )}
                  </button>
                </form>

                {/* Footer Note */}
                <p className="text-center text-gray-500 text-xs mt-8 leading-relaxed">
                  We respect your privacy. We'll only use your email to send you exclusive updates and a special invite when we launch.
                </p>
              </div>

              {/* Login Link */}
             
            </div>
          </div>
        ) : (
          // Success Message
          <div className="text-center py-20 px-4">
            <div className="flex justify-center mb-8 animate-in zoom-in">
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 via-green-500 to-green-600 rounded-full flex items-center justify-center animate-bounce shadow-2xl">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              You're on the Waitlist! 🎉
            </h2>
            <p className="text-xl text-gray-600 mb-3 leading-relaxed">
              Thanks for joining, <span className="font-bold text-gray-900">{formData.name}</span>!
            </p>
            <p className="text-lg text-gray-600 mb-10 leading-relaxed">
              We'll send early access details to <br />
              <span className="font-bold text-gray-900 text-xl">{formData.email}</span>
            </p>
            <p className="text-base text-gray-500 animate-pulse mb-8">
              Redirecting you in a moment...
            </p>

            <Link
              href="/"
              className="inline-block px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              Back to Home
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}