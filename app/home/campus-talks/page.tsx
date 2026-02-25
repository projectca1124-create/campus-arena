'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Plus,
  Users,
  Calendar,
  LayoutList,
  Megaphone,
  MessageSquare,
  Home,
  LogOut,
  Bell,
  Loader2,
  MessageCircle,
  ArrowLeft,
  Send,
  X,
  MoreVertical,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'

// ─── Types ───────────────────────────────────────────────────────
interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  university?: string
  profileImage?: string
}

interface CampusTalk {
  id: string
  title: string
  content?: string
  category: string
  userId: string
  university?: string
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    profileImage?: string
  }
  responseCount: number
}

interface TalkResponse {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    profileImage?: string
    major?: string
    year?: string
  }
}

// ─── Category colors ─────────────────────────────────────────────
const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  'Campus Life': { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  'Academics': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  'Research': { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
  'Housing': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  'Career': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  'Social': { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  'General': { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
}

function getCategoryStyle(category: string) {
  return categoryColors[category] || categoryColors['General']
}

// ─── Avatar ──────────────────────────────────────────────────────
function UserAvatar({ src, firstName, lastName, size = 36, className = '' }: {
  src?: string | null; firstName?: string; lastName?: string; size?: number; className?: string
}) {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`
  if (src) {
    return <img src={src} alt={`${firstName} ${lastName}`} className={`rounded-full object-cover flex-shrink-0 ${className}`} style={{ width: size, height: size }} />
  }
  return (
    <div className={`rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}>{initials}</div>
  )
}

// ─── Time ago helper ─────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

// ─── Available categories ────────────────────────────────────────
const DEFAULT_CATEGORIES = ['Campus Life', 'Academics', 'Research', 'Housing', 'Career', 'Social', 'General']

// ─── Main Component ──────────────────────────────────────────────
export default function CampusTalksPage() {
  const router = useRouter()
  const responseEndRef = useRef<HTMLDivElement>(null)

  const [user, setUser] = useState<User | null>(null)
  const [talks, setTalks] = useState<CampusTalk[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'unanswered' | 'my' | 'answered'>('all')
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)

  const [showAskModal, setShowAskModal] = useState(false)
  const [askForm, setAskForm] = useState({ title: '', content: '', category: 'General' })
  const [askErrors, setAskErrors] = useState<Record<string, string>>({})
  const [isPosting, setIsPosting] = useState(false)

  const [selectedTalk, setSelectedTalk] = useState<CampusTalk | null>(null)
  const [responses, setResponses] = useState<TalkResponse[]>([])
  const [isLoadingResponses, setIsLoadingResponses] = useState(false)
  const [newResponse, setNewResponse] = useState('')
  const [isSendingResponse, setIsSendingResponse] = useState(false)

 useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) { router.push('/auth'); return }
    const currentUser = JSON.parse(userStr) as User
    setUser(currentUser)
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')
    if (tabParam === 'my' || tabParam === 'unanswered' || tabParam === 'answered')  {
      setActiveTab(tabParam)
      loadTalks(currentUser.id, '', '', tabParam)
    } else {
      loadTalks(currentUser.id, '', '', 'all')
    }
  }, [router])

  const loadTalks = async (userId: string, search: string, category: string, tab: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ userId, tab })
      if (search) params.set('search', search)
      if (category) params.set('category', category)
      const res = await fetch(`/api/campus-talks?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTalks(data.talks || [])
        if (data.categories?.length > 0) {
          setCategories([...new Set([...DEFAULT_CATEGORIES, ...data.categories])])
        }
      }
    } catch (err) { console.error('Error:', err) }
    finally { setIsLoading(false) }
  }

  useEffect(() => {
    if (!user) return
    const timeout = setTimeout(() => loadTalks(user.id, searchQuery, categoryFilter, activeTab), 300)
    return () => clearTimeout(timeout)
  }, [searchQuery, categoryFilter, activeTab])

  const handleAskQuestion = async () => {
    const errors: Record<string, string> = {}
    if (!askForm.title.trim()) errors.title = 'Question is required.'
    setAskErrors(errors)
    if (Object.keys(errors).length > 0) return
    setIsPosting(true)
    try {
      const res = await fetch('/api/campus-talks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...askForm, userId: user?.id }),
      })
      if (res.ok) {
        const data = await res.json()
        setTalks((prev) => [data.talk, ...prev])
        setShowAskModal(false)
        setAskForm({ title: '', content: '', category: 'General' })
        setAskErrors({})
      }
    } catch (err) { console.error('Error:', err) }
    finally { setIsPosting(false) }
  }

  const openDiscussion = async (talk: CampusTalk) => {
    setSelectedTalk(talk)
    setIsLoadingResponses(true)
    try {
      const res = await fetch(`/api/campus-talks/${talk.id}/responses`)
      if (res.ok) { const data = await res.json(); setResponses(data.responses || []) }
    } catch (err) { console.error('Error:', err) }
    finally { setIsLoadingResponses(false) }
  }

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newResponse.trim() || !selectedTalk || !user) return
    setIsSendingResponse(true)
    try {
      const res = await fetch(`/api/campus-talks/${selectedTalk.id}/responses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newResponse, userId: user.id }),
      })
      if (res.ok) {
        const data = await res.json()
        setResponses((prev) => [...prev, data.response])
        setNewResponse('')
        setTalks((prev) => prev.map((t) => t.id === selectedTalk.id ? { ...t, responseCount: t.responseCount + 1 } : t))
        responseEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    } catch (err) { console.error('Error:', err) }
    finally { setIsSendingResponse(false) }
  }

  const handleLogout = () => { localStorage.removeItem('user'); router.push('/auth') }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* LEFT SIDEBAR */}
      <aside className="w-[210px] bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">CA</span>
            </div>
            <span className="font-bold text-[15px] text-gray-900">Campus Arena</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pt-2 space-y-0.5">
          {/* <NavItem icon={<LayoutList className="w-[18px] h-[18px]" />} label="CAMP" /> */}
          {/* <NavItem icon={<Home className="w-[18px] h-[18px]" />} label="Dashboard" /> */}
          <NavItem icon={<MessageSquare className="w-[18px] h-[18px]" />} label="Chat" onClick={() => router.push('/home')} />
          <NavItem icon={<Megaphone className="w-[18px] h-[18px]" />} label="Campus Talks" active />
          {/* <NavItem icon={<Calendar className="w-[18px] h-[18px]" />} label="Events" /> */}
          {/* <NavItem icon={<Users className="w-[18px] h-[18px]" />} label="Clubs" /> */}
          {/* <NavItem icon={<Search className="w-[18px] h-[18px]" />} label="Lost & Found" /> */}
        </nav>
        <div className="px-3 py-4 border-t border-gray-200">
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all text-sm font-medium">
            <LogOut className="w-[18px] h-[18px]" /><span>Log out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <div className="h-[60px] border-b border-gray-200 px-6 flex items-center justify-between flex-shrink-0 bg-white">
          <h1 className="text-[15px] font-semibold text-gray-900">Campus Talks</h1>
          {user && (
            <div className="flex items-center gap-3">
             <NotificationBell userId={user?.id || ''} />
              <button onClick={() => router.push('/home/profile')}><UserAvatar src={user.profileImage} firstName={user.firstName} lastName={user.lastName} size={36} className="border-2 border-gray-100 cursor-pointer" /></button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          {/* Discussion Detail View */}
          {selectedTalk ? (
            <div className="px-8 py-6 max-w-4xl">
              {/* Back button */}
              <button onClick={() => { setSelectedTalk(null); setResponses([]) }}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 font-medium">
                <ArrowLeft className="w-4 h-4" /> Back to discussions
              </button>

              {/* Question card */}
              <div className="bg-white border border-gray-200 rounded-xl p-8 mb-8">
                <div className="flex items-start justify-between mb-4">
                  <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${getCategoryStyle(selectedTalk.category).bg} ${getCategoryStyle(selectedTalk.category).text} ${getCategoryStyle(selectedTalk.category).border}`}>
                    {selectedTalk.category}
                  </span>
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">{selectedTalk.title}</h2>
                {selectedTalk.content && <p className="text-gray-600 text-sm mb-5 leading-relaxed">{selectedTalk.content}</p>}
                <div className="flex items-center gap-3">
                  <UserAvatar src={selectedTalk.user.profileImage} firstName={selectedTalk.user.firstName} lastName={selectedTalk.user.lastName} size={32} />
                  <span className="text-sm text-gray-500">
                    By <span className="font-semibold text-gray-700">{selectedTalk.user.firstName} {selectedTalk.user.lastName}</span> • {timeAgo(selectedTalk.createdAt)}
                  </span>
                </div>
              </div>

              {/* Responses header */}
              <h3 className="text-base font-bold text-gray-900 mb-4">{responses.length} Response{responses.length !== 1 ? 's' : ''}</h3>

              {isLoadingResponses ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
              ) : responses.length > 0 ? (
                <div className="space-y-4 mb-8">
                  {responses.map((r) => (
                    <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-6">
                      <div className="flex items-start gap-3 mb-3">
                        <UserAvatar src={r.user.profileImage} firstName={r.user.firstName} lastName={r.user.lastName} size={40} />
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-gray-900">{r.user.firstName} {r.user.lastName}</p>
                          <span className="text-xs text-gray-400">{r.user.major}{r.user.year ? ` • ${r.user.year}` : ''} • {timeAgo(r.createdAt)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed ml-[52px]">{r.content}</p>
                    </div>
                  ))}
                  <div ref={responseEndRef} />
                </div>
              ) : (
                <p className="text-center text-gray-400 text-sm py-8 mb-8">No responses yet. Be the first to answer!</p>
              )}

              {/* Reply input - textarea style */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <form onSubmit={handleSendResponse}>
                  <textarea
                    value={newResponse}
                    onChange={(e) => setNewResponse(e.target.value)}
                    placeholder="Write your response..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm resize-none mb-4"
                    disabled={isSendingResponse}
                  />
                  <div className="flex justify-end">
                    <button type="submit" disabled={!newResponse.trim() || isSendingResponse}
                      className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2">
                      {isSendingResponse ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post Response'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
           <div className="px-8 py-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">🔥 Seniors on Demand</h2>
                  <p className="text-gray-500 text-sm mt-1">Real talk. Real answers. From seniors who've been there — drop your question, start the convo.</p>
                </div>
                <button onClick={() => setShowAskModal(true)}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2 flex-shrink-0">
                  <Plus className="w-4 h-4" /> Ask a Question
                </button>
              </div>

              <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search discussions..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-[160px]"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', appearance: 'none', paddingRight: 32 }}>
                  <option value="">All Categories</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex gap-1 mb-6 border-b border-gray-200">
                {[
                  { key: 'all', label: 'All Discussions' },
                  { key: 'unanswered', label: 'Unanswered' },
                  { key: 'my', label: 'My Questions' },
                   { key: 'answered', label: 'My Responses' },
                ].map((tab) => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${activeTab === tab.key ? 'text-gray-900 border-gray-900' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {isLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
              ) : talks.length > 0 ? (
                <div className="space-y-3">
                  {talks.map((talk) => {
                    const catStyle = getCategoryStyle(talk.category)
                    return (
                      <button key={talk.id} onClick={() => openDiscussion(talk)}
                        className="w-full text-left bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-indigo-200 transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>{talk.category}</span>
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-1.5">{talk.title}</h3>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">By {talk.user.firstName} {talk.user.lastName} • {timeAgo(talk.createdAt)}</p>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <MessageCircle className="w-3.5 h-3.5" /> {talk.responseCount} response{talk.responseCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No discussions yet</p>
                  <p className="text-gray-400 text-sm mt-1">Be the first to ask a question!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ASK QUESTION MODAL */}
      {showAskModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAskModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Ask a Question</h2>
              <button onClick={() => setShowAskModal(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Category</label>
              <select value={askForm.category} onChange={(e) => setAskForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                {DEFAULT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Your Question</label>
              <input type="text" value={askForm.title} onChange={(e) => { setAskForm((p) => ({ ...p, title: e.target.value })); if (askErrors.title) setAskErrors({}) }}
                placeholder="e.g., Best study spots on campus?" className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${askErrors.title ? 'border-red-300' : 'border-gray-300'}`} />
              {askErrors.title && <p className="text-xs text-red-500 mt-1.5">{askErrors.title}</p>}
            </div>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Details (optional)</label>
              <textarea value={askForm.content} onChange={(e) => setAskForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="Add more context to your question..." rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowAskModal(false); setAskErrors({}) }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition-all font-semibold text-sm">Cancel</button>
              <button onClick={handleAskQuestion} disabled={isPosting}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}>
      <span className="flex items-center justify-center w-5 h-5">{icon}</span>
      <span>{label}</span>
    </button>
  )
}