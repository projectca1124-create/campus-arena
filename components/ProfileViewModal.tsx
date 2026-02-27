'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  X, Loader2, MapPin, GraduationCap, BookOpen, Calendar,
  Layers, User, Sparkles, MessageCircle, Mail, Share2,
  Copy, Check, Link2, Send, ExternalLink,
} from 'lucide-react'

interface ProfileUser {
  id: string
  firstName: string
  lastName: string
  email?: string
  university?: string
  major?: string
  degree?: string
  semester?: string
  year?: string
  profileImage?: string
  hometown?: string
  bio?: string
  minor?: string
  academicStanding?: string
  interests?: string
  funFact?: string
}

interface ProfileViewModalProps {
  userId: string | null
  onClose: () => void
  onStartDM?: (user: { id: string; firstName: string; lastName: string; profileImage?: string; major?: string; year?: string }) => void
  currentUserId?: string
}

export default function ProfileViewModal({ userId, onClose, onStartDM, currentUserId }: ProfileViewModalProps) {
  const [user, setUser] = useState<ProfileUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailCopied, setEmailCopied] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const shareRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userId) { setUser(null); return }
    setIsLoading(true); setError('')
    fetch(`/api/users/${userId}`)
      .then(res => { if (res.ok) return res.json(); throw new Error() })
      .then(data => setUser(data.user))
      .catch(() => setError('Could not load profile'))
      .finally(() => setIsLoading(false))
  }, [userId])

  // Close share menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShowShareMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!userId) return null

  const interests = user?.interests
    ? user.interests.split(',').map(s => s.trim()).filter(Boolean)
    : user?.funFact
      ? user.funFact.split(',').map(s => s.trim()).filter(Boolean)
      : []

  const isOwnProfile = currentUserId === userId

  const copyEmail = () => {
    if (!user?.email) return
    navigator.clipboard.writeText(user.email)
    setEmailCopied(true)
    setTimeout(() => setEmailCopied(false), 2000)
  }

  const copyProfileLink = () => {
    const link = `${window.location.origin}/home?viewProfile=${userId}`
    navigator.clipboard.writeText(link)
    setLinkCopied(true)
    setTimeout(() => { setLinkCopied(false); setShowShareMenu(false) }, 1500)
  }

  const shareViaDM = () => {
    setShowShareMenu(false)
    // For now copy link — in future could open a DM picker
    const link = `${window.location.origin}/home?viewProfile=${userId}`
    navigator.clipboard.writeText(link)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden" onClick={e => e.stopPropagation()}>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-28">
            <Loader2 className="w-9 h-9 text-indigo-500 animate-spin mb-3" />
            <p className="text-sm text-gray-400">Loading profile...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-7 h-7 text-red-400" />
            </div>
            <p className="text-sm text-red-500 font-medium mb-1">{error}</p>
            <p className="text-xs text-gray-400 mb-5">Please try again later</p>
            <button onClick={onClose} className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold">Close</button>
          </div>
        ) : user ? (
          <>
            {/* ─── Gradient header ────────────────────────── */}
            <div className="relative">
              <div className="h-[130px] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400 relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full"></div>
                <div className="absolute bottom-0 left-20 w-24 h-24 bg-white/5 rounded-full"></div>
                <div className="absolute top-4 left-8 w-3 h-3 bg-white/20 rounded-full"></div>
                <div className="absolute top-10 right-24 w-2 h-2 bg-white/25 rounded-full"></div>
              </div>

              {/* Top-right buttons */}
              <div className="absolute top-3.5 right-3.5 flex items-center gap-2">
                <div ref={shareRef} className="relative">
                  <button onClick={() => setShowShareMenu(!showShareMenu)}
                    className="w-8 h-8 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-sm">
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  {showShareMenu && (
                    <div className="absolute top-10 right-0 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 w-52 z-10">
                      <button onClick={copyProfileLink}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        {linkCopied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4 text-gray-400" />}
                        <span>{linkCopied ? 'Link copied!' : 'Copy profile link'}</span>
                      </button>
                      <button onClick={shareViaDM}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <Send className="w-4 h-4 text-gray-400" />
                        <span>Share via DM</span>
                      </button>
                    </div>
                  )}
                </div>
                <button onClick={onClose}
                  className="w-8 h-8 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Avatar */}
              <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
                <div className="p-1 bg-white rounded-full shadow-xl">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={`${user.firstName} ${user.lastName}`}
                      className="w-[120px] h-[120px] rounded-full object-cover" />
                  ) : (
                    <div className="w-[120px] h-[120px] rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-4xl">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Name + email ───────────────────────────── */}
            <div className="pt-[76px] pb-1 px-10 text-center">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{user.firstName} {user.lastName}</h2>

              {user.email && (
                <button onClick={copyEmail}
                  className="group inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full hover:bg-gray-100 transition-all relative">
                  <Mail className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                  <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">{user.email}</span>
                  {emailCopied ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-semibold ml-1">
                      <Check className="w-3 h-3" /> Copied!
                    </span>
                  ) : (
                    <span className="hidden group-hover:flex items-center gap-1 text-xs text-indigo-500 font-medium ml-1">
                      <Copy className="w-3 h-3" /> Copy
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* ─── Info grid ─────────────────────────────── */}
            <div className="px-10 pb-5 pt-4">
              <div className="grid grid-cols-2 gap-3">
                {user.degree && (
                  <InfoCard icon={<GraduationCap className="w-[18px] h-[18px] text-indigo-500" />} label="Degree" value={user.degree} color="indigo" />
                )}
                {user.major && (
                  <InfoCard icon={<BookOpen className="w-[18px] h-[18px] text-emerald-500" />} label="Major" value={user.major} color="emerald" />
                )}
                {(user.semester || user.year) && (
                  <InfoCard icon={<Calendar className="w-[18px] h-[18px] text-amber-500" />} label="Enrolled" value={`${user.semester || ''} ${user.year || ''}`.trim()} color="amber" />
                )}
                {user.academicStanding && (
                  <InfoCard icon={<Layers className="w-[18px] h-[18px] text-violet-500" />} label="Standing" value={user.academicStanding} color="violet" />
                )}
                {user.minor && (
                  <InfoCard icon={<BookOpen className="w-[18px] h-[18px] text-cyan-500" />} label="Minor" value={user.minor} color="cyan" />
                )}
                {user.hometown && (
                  <InfoCard icon={<MapPin className="w-[18px] h-[18px] text-rose-500" />} label="Hometown" value={user.hometown} color="rose" />
                )}
              </div>

              {/* Bio */}
              {user.bio && (
                <div className="mt-5 bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-100 rounded-2xl px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-gray-200/60 rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 text-gray-500" />
                    </div>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">About</span>
                  </div>
                  <p className="text-[13px] text-gray-600 leading-relaxed">{user.bio}</p>
                </div>
              )}

              {/* Interests */}
              {interests.length > 0 && (
                <div className="mt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-indigo-100/60 rounded-full flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                    </div>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Interests</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {interests.map((interest, i) => (
                      <span key={i}
                        className="text-xs font-semibold bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 border border-indigo-100 rounded-full px-4 py-2 shadow-sm shadow-indigo-100/50">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ─── Footer ────────────────────────────────── */}
            {!isOwnProfile && (
              <div className="px-10 pb-7 pt-2">
                <button
                  onClick={() => {
                    if (onStartDM) {
                      onStartDM({ id: user.id, firstName: user.firstName, lastName: user.lastName, profileImage: user.profileImage, major: user.major, year: user.year })
                    }
                    onClose()
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold text-sm hover:shadow-lg hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2.5 active:scale-[0.98]">
                  <MessageCircle className="w-[18px] h-[18px]" />
                  Send Message
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

// ─── Info Card ───────────────────────────────────────────────────
function InfoCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const bgMap: Record<string, string> = {
    indigo: 'bg-indigo-50/50 border-indigo-100/60',
    emerald: 'bg-emerald-50/50 border-emerald-100/60',
    amber: 'bg-amber-50/50 border-amber-100/60',
    violet: 'bg-violet-50/50 border-violet-100/60',
    cyan: 'bg-cyan-50/50 border-cyan-100/60',
    rose: 'bg-rose-50/50 border-rose-100/60',
  }
  return (
    <div className={`rounded-2xl px-4 py-3.5 flex items-start gap-3 border ${bgMap[color] || 'bg-gray-50 border-gray-100'}`}>
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1.5">{label}</p>
        <p className="text-[13px] font-semibold text-gray-900 leading-snug">{value}</p>
      </div>
    </div>
  )
}