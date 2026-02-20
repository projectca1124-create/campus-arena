'use client'

import { useState, useRef } from 'react'
import { User, Camera } from 'lucide-react'

interface ProfileInfoStepProps {
  email: string
  password: string
  onSuccess: (profileData: {
    firstName: string
    lastName: string
    major: string
    semester: string
    year: string
    funFact: string
    profileImage?: string
  }) => void
  onTabChange?: (tab: 'signup' | 'login') => void
}

const semesters = ['Fall', 'Spring', 'Summer']

const years = Array.from({ length: 10 }, (_, i) => 
  (new Date().getFullYear() - 5 + i).toString()
)

export default function ProfileInfoStep({
  email,
  password,
  onSuccess,
  onTabChange,
}: ProfileInfoStepProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [major, setMajor] = useState('')
  const [semester, setSemester] = useState('')
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [funFact, setFunFact] = useState('')
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!firstName || !lastName) {
      setError('First and last name are required')
      return
    }

    if (!major) {
      setError('Major is required')
      return
    }

    if (!semester || !year) {
      setError('Enrollment semester and year are required')
      return
    }

    setIsLoading(true)

    try {
      // Submit profile data with password
      const response = await fetch('/api/auth/complete-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password, // IMPORTANT: Include password from Step 3
          firstName,
          lastName,
          major,
          semester,
          year,
          funFact,
          profileImage,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account')
      }

      // Success!
      onSuccess({
        firstName,
        lastName,
        major,
        semester,
        year,
        funFact,
        profileImage: profileImage || undefined,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-8 shadow-lg">
      {/* Icon */}
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <User className="w-8 h-8 text-blue-600" />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
        Tell us about yourself
      </h2>
      <p className="text-gray-600 text-center mb-8">
        Help classmates get to know you
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Profile Image Upload */}
        <div>
          <div className="flex justify-center mb-6">
            <div className="relative">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-4xl text-blue-300">?</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"
                tabIndex={-1}
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* First Name & Last Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value)
                setError('')
              }}
              placeholder="Shiva"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value)
                setError('')
              }}
              placeholder="Sondeep"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Major */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Major
          </label>
          <input
            type="text"
            value={major}
            onChange={(e) => {
              setMajor(e.target.value)
              setError('')
            }}
            placeholder="Computer Science"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>

        {/* Semester & Year */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Enrollment Semester
            </label>
            <select
              value={semester}
              onChange={(e) => {
                setSemester(e.target.value)
                setError('')
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="">Select semester</option>
              {semesters.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Enrollment Year
            </label>
            <select
              value={year}
              onChange={(e) => {
                setYear(e.target.value)
                setError('')
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fun Fact */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Fun Fact (optional)
          </label>
          <textarea
            value={funFact}
            onChange={(e) => {
              setFunFact(e.target.value)
              setError('')
            }}
            placeholder="I love music"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500 resize-none"
            rows={3}
            disabled={isLoading}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !firstName || !lastName || !major || !semester}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating account...' : 'Enter the Arena'}
        </button>
      </form>

      {/* Login Link */}
      <p className="text-center text-gray-600 mt-6">
        Already have an account?{' '}
        <button
          onClick={() => onTabChange?.('login')}
          className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
        >
          Log in
        </button>
      </p>
    </div>
  )
}