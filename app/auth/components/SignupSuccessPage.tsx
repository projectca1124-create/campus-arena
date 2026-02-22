'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'

interface SignupSuccessPageProps {
  email: string
  onComplete?: () => void
}

export default function SignupSuccessPage({ email, onComplete }: SignupSuccessPageProps) {
  const router = useRouter()

  // Extract university name from email
  const getUniversityName = (emailAddress: string): string => {
    const domain = emailAddress.split('@')[1]?.toLowerCase() || ''
    
    // Remove .edu and get the main part (remove subdomains like mavs.)
    const parts = domain.replace('.edu', '').split('.')
    const mainDomain = parts[parts.length - 1].toUpperCase()
    
    return mainDomain
  }

  const universityName = getUniversityName(email)

  // Auto redirect after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete()
      } else {
        router.push('/home')
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [router, onComplete])

  return (
    <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-purple-700 flex items-center justify-center overflow-hidden">
      <div className="text-center">
        {/* Small Star Icon */}
        <div className="mb-8 flex justify-center">
          <Star className="w-12 h-12 text-white fill-white" />
        </div>

        {/* Welcome Text */}
        <h1 className="text-3xl md:text-4xl font-semibold text-white mb-2">
          Welcome to
        </h1>
        
        {/* University Campus Arena */}
        <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">
          {universityName} Campus Arena
        </h2>

        {/* Loading Dots Animation */}
        <div className="flex justify-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  )
}