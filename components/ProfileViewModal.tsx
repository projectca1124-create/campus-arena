'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  X, Loader2, GraduationCap, BookOpen, Calendar,
  Layers, MessageCircle, Share2, Sparkles, MapPin,
  CheckCircle, Pencil, Copy, Check, Link2, Send,
  ArrowLeft, Search,
} from 'lucide-react'

interface ProfileUser {
  id: string; firstName: string; lastName: string; email?: string
  university?: string; major?: string; degree?: string; semester?: string
  year?: string; profileImage?: string; hometown?: string; bio?: string
  minor?: string; academicStanding?: string; interests?: string; funFact?: string
}
interface Stats { questionsAsked: number; answersGiven: number }
interface DMContact {
  user: { id: string; firstName: string; lastName: string; profileImage?: string; major?: string; year?: string }
  lastMessage: string; lastMessageAt: string; unreadCount: number
}
interface ProfileViewModalProps {
  userId: string | null; onClose: () => void
  onStartDM?: (user: { id: string; firstName: string; lastName: string; profileImage?: string; major?: string; year?: string }) => void
  currentUserId?: string
}

function MiniAvatar({ src, firstName, lastName, size = 40 }: {
  src?: string | null; firstName?: string; lastName?: string; size?: number
}) {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`
  if (src) return <img src={src} alt="" className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  return (
    <div className="rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials}</div>
  )
}

export default function ProfileViewModal({ userId, onClose, onStartDM, currentUserId }: ProfileViewModalProps) {
  const router = useRouter()
  const [user, setUser] = useState<ProfileUser | null>(null)
  const [stats, setStats] = useState<Stats>({ questionsAsked: 0, answersGiven: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'profile' | 'activity'>('profile')
  const [emailCopied, setEmailCopied] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement>(null)
  const [showDMPicker, setShowDMPicker] = useState(false)
  const [dmContacts, setDmContacts] = useState<DMContact[]>([])
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  const [dmSearch, setDmSearch] = useState('')
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) { setUser(null); setActiveTab('profile'); setShowShareMenu(false); setShowDMPicker(false); setSentTo(new Set()); return }
    const fetchUser = async () => {
      setIsLoading(true); setError('')
      try {
        const res = await fetch(`/api/users/${userId}`)
        if (res.ok) { const data = await res.json(); setUser(data.user); setStats(data.stats || { questionsAsked: 0, answersGiven: 0 }) }
        else setError('Could not load profile')
      } catch { setError('Something went wrong') }
      finally { setIsLoading(false) }
    }
    fetchUser()
  }, [userId])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) setShowShareMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!showDMPicker || !currentUserId) return
    const loadContacts = async () => {
      setIsLoadingContacts(true)
      try {
        const res = await fetch(`/api/dm?userId=${currentUserId}`)
        if (res.ok) { const data = await res.json(); setDmContacts(data.conversations || []) }
      } catch {}
      finally { setIsLoadingContacts(false) }
    }
    loadContacts()
  }, [showDMPicker, currentUserId])

  if (!userId) return null

  const interests = user?.interests
    ? user.interests.split(',').map(s => s.trim()).filter(Boolean)
    : user?.funFact ? user.funFact.split(',').map(s => s.trim()).filter(Boolean) : []

  const isOwnProfile = currentUserId === userId
  const profileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/home/profile?view=${userId}`

  const handleCopyEmail = () => {
    if (!user?.email) return
    navigator.clipboard.writeText(user.email).then(() => { setEmailCopied(true); setTimeout(() => setEmailCopied(false), 2000) })
  }
  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl).then(() => { setLinkCopied(true); setTimeout(() => { setLinkCopied(false); setShowShareMenu(false) }, 1500) })
  }
  const handleShareViaDM = () => { setShowShareMenu(false); setShowDMPicker(true); setDmSearch(''); setSentTo(new Set()) }

  const sendProfileToDM = async (contact: DMContact) => {
    if (!currentUserId || !user) return
    setSending(contact.user.id)
    try {
      const message = `👤 Check out ${user.firstName} ${user.lastName}'s profile!\n${profileUrl}`
      await fetch('/api/dm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message, senderId: currentUserId, receiverId: contact.user.id }),
      })
      setSentTo(prev => new Set(prev).add(contact.user.id))
    } catch {}
    finally { setSending(null) }
  }

  const filteredContacts = dmContacts.filter(c =>
    `${c.user.firstName} ${c.user.lastName}`.toLowerCase().includes(dmSearch.toLowerCase())
  )

  return (
    // ✅ Bottom-sheet style on mobile (items-end), centered on sm+
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <div
        className="w-full overflow-hidden sm:rounded-[20px] rounded-t-[20px]"
        style={{
          maxWidth: 580,
          // ✅ On mobile: 92vh so it doesn't fully cover screen (user sees it's a sheet)
          // On sm+: 90vh centered modal
          maxHeight: '92dvh',
          background: 'white',
          boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="flex items-center justify-center" style={{ height: 320 }}>
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center" style={{ height: 260 }}>
            <p className="text-sm text-gray-500">{error}</p>
            <button onClick={onClose} className="mt-3 text-sm text-indigo-600 font-semibold">Close</button>
          </div>
        ) : user ? (
          <div style={{ maxHeight: '92dvh', overflowY: 'auto' }}>

            {/* ── DM PICKER ── */}
            {showDMPicker ? (
              <div className="flex flex-col" style={{ minHeight: 360 }}>
                <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-gray-100">
                  <button onClick={() => setShowDMPicker(false)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-all" style={{ minWidth: 36, minHeight: 36 }}>
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="flex-1">
                    <h3 className="text-[15px] font-bold text-gray-900">Share Profile</h3>
                    <p className="text-xs text-gray-400">Send {user.firstName}'s profile via DM</p>
                  </div>
                </div>

                <div className="mx-4 sm:mx-6 mt-4 mb-3 px-4 py-3 rounded-xl flex items-center gap-3 bg-gray-50 border border-gray-100">
                  <MiniAvatar src={user.profileImage} firstName={user.firstName} lastName={user.lastName} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                    <p className="text-[11px] text-gray-400 truncate">{user.major || user.email || ''}</p>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md flex-shrink-0">PROFILE</span>
                </div>

                <div className="px-4 sm:px-6 mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={dmSearch} onChange={e => setDmSearch(e.target.value)}
                      placeholder="Search contacts..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-gray-50 border border-gray-200 text-gray-900"
                      style={{ fontSize: 16, colorScheme: 'light', color: '#111827', backgroundColor: 'white' }} />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-4" style={{ maxHeight: 280 }}>
                  {isLoadingContacts ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
                  ) : filteredContacts.length > 0 ? (
                    <div className="space-y-1">
                      {filteredContacts.map(contact => {
                        const isSent = sentTo.has(contact.user.id)
                        const isSending = sending === contact.user.id
                        return (
                          <div key={contact.user.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50">
                            <MiniAvatar src={contact.user.profileImage} firstName={contact.user.firstName} lastName={contact.user.lastName} size={40} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{contact.user.firstName} {contact.user.lastName}</p>
                              {contact.user.major && <p className="text-xs text-gray-400 truncate">{contact.user.major}</p>}
                            </div>
                            <button
                              onClick={() => !isSent && !isSending && sendProfileToDM(contact)}
                              disabled={isSent || isSending}
                              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                              style={isSent
                                ? { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', minHeight: 36 }
                                : { background: '#4f46e5', color: 'white', border: 'none', minHeight: 36 }
                              }>
                              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : isSent ? <><Check className="w-3.5 h-3.5" /> Sent</>
                                : <><Send className="w-3.5 h-3.5" /> Send</>}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-400">{dmSearch ? 'No contacts match' : 'No DM conversations yet'}</p>
                    </div>
                  )}
                </div>

                {sentTo.size > 0 && (
                  <div className="px-4 sm:px-6 py-4 border-t border-gray-100"
                    style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                    <button onClick={() => setShowDMPicker(false)}
                      className="w-full py-3 rounded-xl font-semibold text-sm text-indigo-600 hover:bg-indigo-50 border border-indigo-100">
                      Done — Shared with {sentTo.size} {sentTo.size === 1 ? 'person' : 'people'}
                    </button>
                  </div>
                )}
              </div>

            ) : (
              /* ── MAIN PROFILE VIEW ── */
              <>
                {/* Header gradient + avatar */}
                <div className="relative">
                  <div style={{
                    height: 100, position: 'relative', overflow: 'hidden',
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 40%, #ec4899 100%)',
                  }}>
                    <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ position: 'absolute', bottom: -20, left: '30%', width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                  </div>

                  {/* Action buttons */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <div ref={shareMenuRef} className="relative">
                      <button onClick={e => { e.stopPropagation(); setShowShareMenu(!showShareMenu) }}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', color: 'white' }}>
                        <Share2 className="w-4 h-4" />
                      </button>
                      {showShareMenu && (
                        <div
                          className="absolute top-10 rounded-xl shadow-xl py-1.5 z-30 bg-white border border-gray-200"
                          // ✅ right-0 but capped so it doesn't bleed off left edge on small screens
                          style={{ right: 0, width: 'min(208px, calc(100vw - 32px))', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}
                          onClick={e => e.stopPropagation()}>
                          <button onClick={handleCopyLink}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                            style={{ minHeight: 44 }}>
                            {linkCopied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4 text-gray-400" />}
                            <span>{linkCopied ? 'Link copied!' : 'Copy profile link'}</span>
                          </button>
                          <button onClick={handleShareViaDM}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                            style={{ minHeight: 44 }}>
                            <Send className="w-4 h-4 text-gray-400" />
                            <span>Share via DM</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <button onClick={onClose}
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', color: 'white' }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Avatar */}
                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                    {user.profileImage ? (
                      <img src={user.profileImage} alt=""
                        className="w-[88px] h-[88px] rounded-full object-cover"
                        style={{ border: '4px solid white', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }} />
                    ) : (
                      <div className="w-[88px] h-[88px] rounded-full flex items-center justify-center font-bold text-2xl text-white"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', border: '4px solid white', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </div>
                    )}
                  </div>
                </div>

                {/* Name + email */}
                <div className="pt-14 pb-2 px-4 sm:px-8 text-center">
                  <h2 className="text-[20px] sm:text-[22px] font-bold text-gray-900 tracking-tight">{user.firstName} {user.lastName}</h2>
                  {user.email && (
                    <button onClick={handleCopyEmail}
                      className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-lg transition-all group"
                      style={{ background: emailCopied ? '#f0fdf4' : 'transparent', minHeight: 36 }}>
                      <span className="text-[13px] text-gray-400">✉</span>
                      <span className={`text-[12px] sm:text-[13px] ${emailCopied ? 'text-green-600' : 'text-gray-400 group-hover:text-gray-600'} transition-colors`}>
                        {emailCopied ? 'Copied!' : user.email}
                      </span>
                      <span className={`transition-all ${emailCopied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        {emailCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                      </span>
                    </button>
                  )}
                  {user.bio && <p className="text-sm text-gray-500 mt-3 leading-relaxed max-w-md mx-auto">{user.bio}</p>}
                </div>

                {/* Tab bar */}
                <div className="flex mx-4 sm:mx-8 mt-4" style={{ borderBottom: '1.5px solid #f1f3f5' }}>
                  {(['profile', 'activity'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className="flex-1 pb-3 text-[13px] font-semibold uppercase tracking-widest transition-all"
                      style={{
                        color: activeTab === tab ? '#111827' : '#9ca3af',
                        borderBottom: activeTab === tab ? '2px solid #111827' : '2px solid transparent',
                        marginBottom: -1.5, minHeight: 44,
                      }}>
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab content — ✅ px-4 on mobile, px-8 on sm+ */}
                <div className="px-4 sm:px-8 py-5">
                  {activeTab === 'profile' && (
                    <div>
                      {/* ✅ 1-col on mobile, 2-col on sm+ */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                        {user.degree && <InfoCard icon={<GraduationCap className="w-[18px] h-[18px]" />} label="Degree" value={user.degree} accent="#6366f1" />}
                        {user.major && <InfoCard icon={<BookOpen className="w-[18px] h-[18px]" />} label="Major" value={user.major} accent="#10b981" />}
                        {(user.semester || user.year) && <InfoCard icon={<Calendar className="w-[18px] h-[18px]" />} label="Enrolled" value={`${user.semester || ''} ${user.year || ''}`.trim()} accent="#f59e0b" />}
                        {user.academicStanding && <InfoCard icon={<Layers className="w-[18px] h-[18px]" />} label="Standing" value={user.academicStanding} accent="#8b5cf6" />}
                        {user.minor && <InfoCard icon={<BookOpen className="w-[18px] h-[18px]" />} label="Minor" value={user.minor} accent="#06b6d4" />}
                        {user.hometown && <InfoCard icon={<MapPin className="w-[18px] h-[18px]" />} label="From" value={user.hometown} accent="#ef4444" />}
                      </div>

                      {interests.length > 0 && (
                        <div className="mt-5">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-3.5 h-3.5 text-gray-300" />
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Interests</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {interests.map((interest, i) => (
                              <span key={i} className="text-[13px] font-medium rounded-full px-3 sm:px-4 py-1.5"
                                style={{ color: '#6366f1', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08))', border: '1px solid rgba(99,102,241,0.12)' }}>
                                {interest}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'activity' && (
                    // ✅ Compact cards on mobile — less padding, smaller stat number
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => { onClose(); router.push('/home/campus-talks?tab=my&userId=' + userId) }}
                        className="bg-white rounded-2xl p-4 sm:p-6 flex flex-col items-center text-center transition-all hover:shadow-lg cursor-pointer group border border-gray-100"
                        style={{ minHeight: 120 }}>
                        <div className="w-11 h-11 rounded-full flex items-center justify-center mb-2 sm:mb-3 transition-transform group-hover:scale-110 bg-orange-50">
                          <MessageCircle className="w-5 h-5 text-orange-500" />
                        </div>
                        <p className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">{stats.questionsAsked}</p>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">Questions Asked</p>
                      </button>
                      <button onClick={() => { onClose(); router.push('/home/campus-talks?tab=answered&userId=' + userId) }}
                        className="bg-white rounded-2xl p-4 sm:p-6 flex flex-col items-center text-center transition-all hover:shadow-lg cursor-pointer group border border-gray-100"
                        style={{ minHeight: 120 }}>
                        <div className="w-11 h-11 rounded-full flex items-center justify-center mb-2 sm:mb-3 transition-transform group-hover:scale-110 bg-teal-50">
                          <CheckCircle className="w-5 h-5 text-teal-500" />
                        </div>
                        <p className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">{stats.answersGiven}</p>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">Responses Given</p>
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer — safe area bottom padding */}
                <div className="px-4 sm:px-8"
                  style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
                  {!isOwnProfile && onStartDM && (
                    <button
                      onClick={() => { onStartDM({ id: user.id, firstName: user.firstName, lastName: user.lastName, profileImage: user.profileImage, major: user.major, year: user.year }); onClose() }}
                      className="w-full rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:shadow-lg"
                      style={{ height: 52, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)', color: 'white', boxShadow: '0 4px 14px rgba(99,102,241,0.25)' }}>
                      <MessageCircle className="w-4 h-4" /> Send Message
                    </button>
                  )}
                  {isOwnProfile && (
                    <button onClick={() => { onClose(); router.push('/home/profile') }}
                      className="w-full rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:bg-gray-100 bg-gray-50 text-gray-700 border border-gray-200"
                      style={{ height: 52 }}>
                      <Pencil className="w-4 h-4" /> Edit Profile
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function InfoCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl px-4 py-3 flex items-start gap-3 bg-gray-50 border border-gray-100">
      <div className="mt-0.5 flex-shrink-0" style={{ color: accent }}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider leading-none mb-1" style={{ color: accent }}>{label}</p>
        <p className="text-[13px] sm:text-[14px] font-semibold text-gray-900 leading-snug">{value}</p>
      </div>
    </div>
  )
}