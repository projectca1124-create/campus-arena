'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface SplashScreenProps {
  email: string
}

function getUniversityFromEmail(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase() || ''
  const parts = domain.split('.')
  const eduIndex = parts.indexOf('edu')
  const mainPart = eduIndex > 0 ? parts[eduIndex - 1] : parts[0]
  return mainPart.toUpperCase()
}

export default function SplashScreen({ email }: SplashScreenProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<'enter' | 'glow' | 'exit'>('enter')
  const uni = getUniversityFromEmail(email)

  useEffect(() => {
    // Phase 1: Enter animation (already happening via CSS)
    const glowTimer = setTimeout(() => setPhase('glow'), 800)
    // Phase 2: Exit after 3 seconds
    const exitTimer = setTimeout(() => setPhase('exit'), 2600)
    // Phase 3: Navigate
    const navTimer = setTimeout(() => {
      router.push('/home/profile?onboarding=true')
    }, 3200)

    return () => {
      clearTimeout(glowTimer)
      clearTimeout(exitTimer)
      clearTimeout(navTimer)
    }
  }, [router])

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden transition-opacity duration-500 ${phase === 'exit' ? 'opacity-0' : 'opacity-100'}`}>
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800">
        {/* Animated orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className={`relative z-10 text-center transition-all duration-700 ${phase === 'enter' ? 'scale-95 opacity-0 translate-y-4' : 'scale-100 opacity-100 translate-y-0'}`}
        style={{ transitionDelay: phase === 'enter' ? '0ms' : '200ms' }}>
        
        {/* Logo */}
        <div className={`w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 border border-white/20 transition-all duration-700 ${phase === 'glow' ? 'shadow-[0_0_60px_rgba(129,140,248,0.5)]' : ''}`}>
          <span className="text-white font-bold text-2xl">CA</span>
        </div>

        {/* Welcome text */}
        <p className="text-indigo-200 text-sm font-medium tracking-widest uppercase mb-3 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
          Welcome to
        </p>
        
        <h1 className="text-5xl font-extrabold text-white mb-3 animate-fadeIn" style={{ animationDelay: '0.6s' }}>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-purple-200">
            {uni} Campus Arena
          </span>
        </h1>

        <p className="text-indigo-300/80 text-base mt-4 animate-fadeIn" style={{ animationDelay: '0.9s' }}>
          Your campus, your community
        </p>

        {/* Loading dots */}
        <div className="flex justify-center gap-1.5 mt-8 animate-fadeIn" style={{ animationDelay: '1.2s' }}>
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
        </div>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.5); opacity: 0.8; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float { animation: float ease-in-out infinite; }
        .animate-fadeIn { animation: fadeIn 0.6s ease-out forwards; opacity: 0; }
      `}</style>
    </div>
  )
}