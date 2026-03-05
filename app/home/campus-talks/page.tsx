'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Plus, Megaphone, Loader2, MessageCircle,
  ArrowLeft, X, Link2, ChevronDown, Clock, CheckCircle2, Send,
  TrendingUp, HelpCircle, Flame, MoreVertical, Trash2, Pencil,
  Share2, Check,
} from 'lucide-react'
import ProfileViewModal from '@/components/ProfileViewModal'

// ─── Types ───────────────────────────────────────────────────────
interface User {
  id: string; email: string; firstName: string; lastName: string
  university?: string; profileImage?: string
}
interface CampusTalk {
  id: string; title: string; content?: string; category: string
  userId: string; university?: string; createdAt: string
  user: { id: string; firstName: string; lastName: string; profileImage?: string }
  responseCount: number
}
interface TalkResponse {
  id: string; content: string; createdAt: string
  user: { id: string; firstName: string; lastName: string; profileImage?: string; major?: string; year?: string; academicStanding?: string }
}

// ─── Category config ─────────────────────────────────────────────
const categoryConfig: Record<string, { bg: string; text: string; border: string; icon: string; accent: string }> = {
  'Campus Life': { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', icon: '🏫', accent: '#f43f5e' },
  'Academics':   { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: '📚', accent: '#10b981' },
  'Research':    { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', icon: '🔬', accent: '#06b6d4' },
  'Housing':     { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: '🏠', accent: '#f59e0b' },
  'Career':      { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: '💼', accent: '#3b82f6' },
  'Social':      { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', icon: '🎉', accent: '#8b5cf6' },
  'General':     { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: '💬', accent: '#64748b' },
}
function getCat(cat: string) { return categoryConfig[cat] || categoryConfig['General'] }

// ─── Avatar ──────────────────────────────────────────────────────
function UserAvatar({ src, firstName, lastName, size = 36, className = '', onClick }: {
  src?: string | null; firstName?: string; lastName?: string; size?: number; className?: string; onClick?: () => void
}) {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`
  const clickClass = onClick ? 'cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all' : ''
  if (src) return <img src={src} alt="" onClick={onClick} className={`rounded-full object-cover flex-shrink-0 ${clickClass} ${className}`} style={{ width: size, height: size }} />
  return (
    <div onClick={onClick} className={`rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0 ${clickClass} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}>{initials}</div>
  )
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const m = Math.floor(seconds / 60); if (m < 60) return `${m} minute${m > 1 ? 's' : ''} ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`
  const d = Math.floor(h / 24); if (d < 7) return `${d} day${d > 1 ? 's' : ''} ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const DEFAULT_CATEGORIES = ['Campus Life', 'Academics', 'Research', 'Housing', 'Career', 'Social', 'General']

const TABS = [
  { key: 'all' as const, label: 'All Discussions' },
  { key: 'unanswered' as const, label: 'Unanswered' },
  { key: 'my' as const, label: 'My Questions' },
  { key: 'answered' as const, label: 'My Responses' },
]

// ─── Main ────────────────────────────────────────────────────────
export default function CampusTalksPage() {
  const router = useRouter()
  const responseEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [user, setUser] = useState<User | null>(null)
  const [talks, setTalks] = useState<CampusTalk[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'unanswered' | 'my' | 'answered'>('all')
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [unansweredCount, setUnansweredCount] = useState(0)  // ← NEW

  const [showAskModal, setShowAskModal] = useState(false)
  const [askForm, setAskForm] = useState({ title: '', content: '', category: 'General' })
  const [askErrors, setAskErrors] = useState<Record<string, string>>({})
  const [isPosting, setIsPosting] = useState(false)

  const [selectedTalk, setSelectedTalk] = useState<CampusTalk | null>(null)
  const [responses, setResponses] = useState<TalkResponse[]>([])
  const [isLoadingResponses, setIsLoadingResponses] = useState(false)
  const [newResponse, setNewResponse] = useState('')
  const [isSendingResponse, setIsSendingResponse] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [profileViewUserId, setProfileViewUserId] = useState<string | null>(null)

  // Menu states
  const [cardMenuId, setCardMenuId] = useState<string | null>(null)
  const [threadMenuOpen, setThreadMenuOpen] = useState(false)
  const [responseMenuId, setResponseMenuId] = useState<string | null>(null)

  // Edit states
  const [editingQuestion, setEditingQuestion] = useState<CampusTalk | null>(null)
  const [editQuestionForm, setEditQuestionForm] = useState({ title: '', content: '', category: 'General' })
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null)
  const [editResponseContent, setEditResponseContent] = useState('')
  const [isSavingResponseEdit, setIsSavingResponseEdit] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-menu]')) return
      setCardMenuId(null); setThreadMenuOpen(false); setResponseMenuId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) { router.push('/auth'); return }
    const currentUser = JSON.parse(userStr) as User
    setUser(currentUser)
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')
    const viewUserId = urlParams.get('userId')
    const targetUserId = viewUserId || currentUser.id
    if (tabParam === 'my' || tabParam === 'unanswered' || tabParam === 'answered') {
      setActiveTab(tabParam); loadTalks(targetUserId, '', '', tabParam)
    } else { loadTalks(currentUser.id, '', '', 'all') }
  }, [router])

  const loadTalks = async (userId: string, search: string, category: string, tab: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ userId, tab })
      if (search) params.set('search', search); if (category) params.set('category', category)
      const res = await fetch(`/api/campus-talks?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTalks(data.talks || [])
        if (data.categories?.length > 0) setCategories([...new Set([...DEFAULT_CATEGORIES, ...data.categories])])
        // ── Always update the unanswered count from every API response ──
        if (typeof data.unansweredCount === 'number') setUnansweredCount(data.unansweredCount)
      }
    } catch (err) { console.error('Error:', err) }
    finally { setIsLoading(false) }
  }

  useEffect(() => { if (!user) return; const t = setTimeout(() => loadTalks(user.id, searchQuery, categoryFilter, activeTab), 300); return () => clearTimeout(t) }, [searchQuery, categoryFilter, activeTab])

  const handleAskQuestion = async () => {
    const errors: Record<string, string> = {}; if (!askForm.title.trim()) errors.title = 'Question is required.'
    setAskErrors(errors); if (Object.keys(errors).length > 0) return; setIsPosting(true)
    try {
      const res = await fetch('/api/campus-talks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...askForm, userId: user?.id }) })
      if (res.ok) {
        const data = await res.json()
        setTalks(prev => [data.talk, ...prev])
        setShowAskModal(false)
        setAskForm({ title: '', content: '', category: 'General' })
        setAskErrors({})
        // New question is unanswered → increment count
        setUnansweredCount(prev => prev + 1)
      }
    } catch (err) { console.error('Error:', err) }
    finally { setIsPosting(false) }
  }

  const openDiscussion = async (talk: CampusTalk) => {
    setSelectedTalk(talk); setIsLoadingResponses(true); setCardMenuId(null)
    try { const res = await fetch(`/api/campus-talks/${talk.id}/responses`); if (res.ok) { const data = await res.json(); setResponses((data.responses || []).reverse()) } }
    catch (err) { console.error('Error:', err) }
    finally { setIsLoadingResponses(false) }
  }

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newResponse.trim() || !selectedTalk || !user) return; setIsSendingResponse(true)
    try {
      const res = await fetch(`/api/campus-talks/${selectedTalk.id}/responses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: newResponse, userId: user.id }) })
      if (res.ok) {
        const data = await res.json()
        setResponses(prev => [data.response, ...prev])
        setNewResponse('')
        const wasUnanswered = selectedTalk.responseCount === 0
        setTalks(prev => prev.map(t => t.id === selectedTalk.id ? { ...t, responseCount: t.responseCount + 1 } : t))
        setSelectedTalk(prev => prev ? { ...prev, responseCount: prev.responseCount + 1 } : null)
        // If this was the first response, it's no longer unanswered → decrement
        if (wasUnanswered) setUnansweredCount(prev => Math.max(0, prev - 1))
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
        setTimeout(() => responseEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    } catch (err) { console.error('Error:', err) }
    finally { setIsSendingResponse(false) }
  }

  // ─── Delete question ───
  const handleDeleteQuestion = async (talkId: string) => {
    if (!confirm('Delete this question and all its responses? This cannot be undone.')) return
    const talk = talks.find(t => t.id === talkId)
    try {
      const res = await fetch(`/api/campus-talks/${talkId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id }) })
      if (res.ok) {
        setTalks(prev => prev.filter(t => t.id !== talkId))
        if (selectedTalk?.id === talkId) { setSelectedTalk(null); setResponses([]) }
        // If the deleted question was unanswered, decrement count
        if (talk && talk.responseCount === 0) setUnansweredCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) { console.error('Error:', err) }
    finally { setCardMenuId(null); setThreadMenuOpen(false) }
  }

  // ─── Edit question ───
  const openEditQuestion = (talk: CampusTalk) => {
    setEditingQuestion(talk)
    setEditQuestionForm({ title: talk.title, content: talk.content || '', category: talk.category })
    setCardMenuId(null); setThreadMenuOpen(false)
  }

  const handleSaveEditQuestion = async () => {
    if (!editingQuestion || !editQuestionForm.title.trim()) return
    setIsSavingEdit(true)
    try {
      const res = await fetch(`/api/campus-talks/${editingQuestion.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, title: editQuestionForm.title, content: editQuestionForm.content, category: editQuestionForm.category })
      })
      if (res.ok) {
        const data = await res.json()
        const updated = data.talk || { ...editingQuestion, ...editQuestionForm }
        setTalks(prev => prev.map(t => t.id === editingQuestion.id ? { ...t, title: updated.title, content: updated.content, category: updated.category } : t))
        if (selectedTalk?.id === editingQuestion.id) {
          setSelectedTalk(prev => prev ? { ...prev, title: updated.title, content: updated.content, category: updated.category } : null)
        }
        setEditingQuestion(null)
      }
    } catch (err) { console.error('Error:', err) }
    finally { setIsSavingEdit(false) }
  }

  // ─── Delete response ───
  const handleDeleteResponse = async (responseId: string) => {
    if (!confirm('Delete this response?')) return
    if (!selectedTalk) return
    try {
      const res = await fetch(`/api/campus-talks/${selectedTalk.id}/responses/${responseId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id }) })
      if (res.ok) {
        const remainingCount = responses.filter(r => r.id !== responseId).length
        setResponses(prev => prev.filter(r => r.id !== responseId))
        setTalks(prev => prev.map(t => t.id === selectedTalk.id ? { ...t, responseCount: Math.max(0, t.responseCount - 1) } : t))
        setSelectedTalk(prev => prev ? { ...prev, responseCount: Math.max(0, prev.responseCount - 1) } : null)
        // If deleting the last response → question becomes unanswered again → increment
        if (remainingCount === 0) setUnansweredCount(prev => prev + 1)
      }
    } catch (err) { console.error('Error:', err) }
    finally { setResponseMenuId(null) }
  }

  // ─── Edit response ───
  const openEditResponse = (r: TalkResponse) => {
    setEditingResponseId(r.id)
    setEditResponseContent(r.content)
    setResponseMenuId(null)
  }

  const handleSaveEditResponse = async () => {
    if (!editingResponseId || !editResponseContent.trim() || !selectedTalk) return
    setIsSavingResponseEdit(true)
    try {
      const res = await fetch(`/api/campus-talks/${selectedTalk.id}/responses/${editingResponseId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, content: editResponseContent })
      })
      if (res.ok) {
        setResponses(prev => prev.map(r => r.id === editingResponseId ? { ...r, content: editResponseContent } : r))
        setEditingResponseId(null); setEditResponseContent('')
      }
    } catch (err) { console.error('Error:', err) }
    finally { setIsSavingResponseEdit(false) }
  }

  const copyThreadLink = () => {
    if (!selectedTalk) return
    navigator.clipboard.writeText(`${window.location.origin}/home/campus-talks?thread=${selectedTalk.id}`)
      .then(() => { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000) })
  }

  // ── Auto-open thread from notification link (?thread=talkId) ──
  useEffect(() => {
    if (!talks.length) return
    const params = new URLSearchParams(window.location.search)
    const threadId = params.get('thread')
    if (threadId) {
      const match = talks.find(t => t.id === threadId)
      if (match) {
        setSelectedTalk(match)
        // Clean the URL so back button works correctly
        window.history.replaceState({}, '', '/home/campus-talks')
      }
    }
  }, [talks])

  const activeTabIndex = TABS.findIndex(t => t.key === activeTab)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ━━━━━━ THREAD DETAIL VIEW ━━━━━━ */}
      {selectedTalk ? (
        <div className="flex flex-col h-full">
          {/* ── Sticky question header ── */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200">
            <div className="h-[3px]" style={{ background: getCat(selectedTalk.category).accent }} />
            <div className="px-8 py-4">
              <button onClick={() => { setSelectedTalk(null); setResponses([]) }}
                className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900 font-medium transition-colors mb-4">
                <ArrowLeft className="w-4 h-4" /> Back to discussions
              </button>
              <div className="flex items-start gap-4">
                <UserAvatar src={selectedTalk.user.profileImage} firstName={selectedTalk.user.firstName} lastName={selectedTalk.user.lastName} size={44}
                  className="mt-0.5 flex-shrink-0" onClick={() => setProfileViewUserId(selectedTalk.user.id)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[13px] font-bold text-gray-900">{selectedTalk.user.firstName} {selectedTalk.user.lastName}</span>
                    <span className="text-[11px] text-gray-400">{timeAgo(selectedTalk.createdAt)}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCat(selectedTalk.category).bg} ${getCat(selectedTalk.category).text} ${getCat(selectedTalk.category).border}`}>
                      {getCat(selectedTalk.category).icon} {selectedTalk.category}
                    </span>
                  </div>
                  <h2 className="text-[17px] font-bold text-gray-900 leading-snug">{selectedTalk.title}</h2>
                  {selectedTalk.content && <p className="text-[13px] text-gray-500 leading-relaxed mt-1">{selectedTalk.content}</p>}
                  <div className="flex items-center gap-1.5 mt-2 text-[12px] text-gray-400">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{responses.length} response{responses.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 relative" data-menu>
                  <button onClick={e => { e.stopPropagation(); e.preventDefault(); setThreadMenuOpen(prev => !prev); setCardMenuId(null); setResponseMenuId(null) }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                    <MoreVertical className="w-[18px] h-[18px]" />
                  </button>
                  {threadMenuOpen && (
                    <div className="absolute top-9 right-0 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 w-48 z-20" data-menu>
                      <button onClick={copyThreadLink}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        {copiedLink ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4 text-gray-400" />}
                        <span>{copiedLink ? 'Link Copied!' : 'Share Thread'}</span>
                      </button>
                      {selectedTalk.userId === user?.id && (
                        <>
                          <button onClick={() => openEditQuestion(selectedTalk)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <Pencil className="w-4 h-4 text-gray-400" /><span>Edit Question</span>
                          </button>
                          <div className="mx-3 my-1 border-t border-gray-100"></div>
                          <button onClick={() => handleDeleteQuestion(selectedTalk.id)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" /><span>Delete Question</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Scrollable responses ── */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="px-8 py-5">
              <p className="text-[13px] font-bold text-gray-900 mb-4">{responses.length} Response{responses.length !== 1 ? 's' : ''}</p>
              {isLoadingResponses ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
              ) : responses.length > 0 ? (
                <div className="space-y-3">
                  {responses.map(r => (
                    <div key={r.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 relative group/resp hover:border-gray-300 transition-all">
                      {editingResponseId === r.id ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-1">
                            <UserAvatar src={r.user.profileImage} firstName={r.user.firstName} lastName={r.user.lastName} size={34} />
                            <span className="text-[13px] font-bold text-gray-900">{r.user.firstName} {r.user.lastName}</span>
                            <span className="text-[11px] text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded font-medium">Editing</span>
                          </div>
                          <textarea value={editResponseContent} onChange={e => setEditResponseContent(e.target.value)}
                            rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none" />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => { setEditingResponseId(null); setEditResponseContent('') }}
                              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
                            <button onClick={handleSaveEditResponse} disabled={isSavingResponseEdit || !editResponseContent.trim()}
                              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                              {isSavingResponseEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <UserAvatar src={r.user.profileImage} firstName={r.user.firstName} lastName={r.user.lastName} size={38}
                            className="mt-0.5 flex-shrink-0" onClick={() => setProfileViewUserId(r.user.id)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-[13px] font-bold text-gray-900">{r.user.firstName} {r.user.lastName}</span>
                              {r.user.academicStanding && (
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">{r.user.academicStanding}</span>
                              )}
                              <span className="text-[11px] text-gray-400">{timeAgo(r.createdAt)}</span>
                            </div>
                            <p className="text-[13px] text-gray-700 leading-relaxed">{r.content}</p>
                          </div>
                          {r.user.id === user?.id && (
                            <div className="relative flex-shrink-0" data-menu>
                              <button onClick={e => { e.stopPropagation(); e.preventDefault(); setResponseMenuId(responseMenuId === r.id ? null : r.id); setCardMenuId(null); setThreadMenuOpen(false) }}
                                className="p-1 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-all opacity-0 group-hover/resp:opacity-100">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {responseMenuId === r.id && (
                                <div className="absolute top-7 right-0 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 w-44 z-20" data-menu>
                                  <button onClick={() => openEditResponse(r)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                    <Pencil className="w-4 h-4 text-gray-400" /><span>Edit Response</span>
                                  </button>
                                  <div className="mx-3 my-1 border-t border-gray-100"></div>
                                  <button onClick={() => handleDeleteResponse(r.id)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                    <Trash2 className="w-4 h-4" /><span>Delete Response</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={responseEndRef} />
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-500">No responses yet</p>
                  <p className="text-xs text-gray-400 mt-1">Be the first to share your thoughts!</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Fixed bottom reply ── */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
            <div className="px-8 py-3.5">
              <form onSubmit={handleSendResponse} className="flex items-end gap-3">
                <div className="flex-1">
                  <textarea ref={textareaRef} value={newResponse}
                    onChange={e => { setNewResponse(e.target.value); if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px' } }}
                    placeholder="Write your response..." rows={1}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-[13px] resize-none placeholder-gray-400 bg-gray-50/50 focus:bg-white transition-all leading-relaxed"
                    style={{ minHeight: 46, maxHeight: 120 }} disabled={isSendingResponse} />
                </div>
                <button type="submit" disabled={!newResponse.trim() || isSendingResponse}
                  className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-[13px] hover:bg-indigo-700 transition-all disabled:opacity-40 flex-shrink-0 flex items-center gap-2 shadow-sm shadow-indigo-200">
                  {isSendingResponse ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Post Response
                </button>
              </form>
            </div>
          </div>
        </div>

      ) : (
        /* ━━━━━━ LIST VIEW ━━━━━━ */
        <div className="h-full overflow-y-auto">
          {/* ── Top nav bar with back button + university ── */}
          <div className="sticky top-0 z-20 flex items-center justify-between px-6 h-14 border-b" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderColor: '#e5e7eb' }}>
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/home')} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all">
                <ArrowLeft className="w-[18px] h-[18px]" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-[10px]">CA</span>
                </div>
                <div>
                  <span className="font-bold text-[14px] text-gray-900 tracking-tight leading-none block">Campus Arena</span>
                  {user?.university && <span className="text-[11px] text-indigo-500 font-semibold leading-none block mt-0.5">{user.university}</span>}
                </div>
              </div>
            </div>
            <Megaphone className="w-[18px] h-[18px] text-indigo-400" />
          </div>
          <div className="px-8 py-5">
            {/* Hero */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl px-7 py-5 mb-5 text-white relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full"></div>
              <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-white/5 rounded-full translate-y-1/2"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1"><Flame className="w-5 h-5 text-amber-300" /><h2 className="text-lg font-bold">Seniors on Demand</h2></div>
                  <p className="text-indigo-200 text-sm">Real talk. Real answers. From seniors who've been there — drop your question, start the convo.</p>
                </div>
                <button onClick={() => setShowAskModal(true)} className="px-5 py-2.5 bg-white text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all flex items-center gap-2 flex-shrink-0 shadow-lg shadow-indigo-900/20 ml-6"><Plus className="w-4 h-4" /> Ask a Question</button>
              </div>
            </div>

            {/* Search + Category */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search discussions..." className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" /></div>
              <div className="relative"><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="appearance-none pl-4 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"><option value="">All Categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" /></div>
            </div>

            {/* ── Sliding pill tabs ── */}
            <div className="relative flex bg-gray-100 rounded-xl p-1 mb-5">
              <div className="absolute top-1 bottom-1 rounded-lg bg-indigo-600 shadow-md transition-all duration-300 ease-in-out"
                style={{
                  width: `calc(${100 / TABS.length}% - ${8 / TABS.length}px)`,
                  left: `calc(${activeTabIndex * (100 / TABS.length)}% + 4px)`,
                }} />
              {TABS.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold rounded-lg transition-colors duration-300 ${
                    activeTab === tab.key ? 'text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {tab.label}
                  {/* ── Unanswered badge ── */}
                  {tab.key === 'unanswered' && unansweredCount > 0 && (
                    <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold transition-colors ${
                      activeTab === 'unanswered' ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-600'
                    }`}>
                      {unansweredCount > 99 ? '99+' : unansweredCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Discussion cards */}
            {isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-indigo-400 animate-spin" /></div>
            ) : talks.length > 0 ? (
              <div className="space-y-3">
                {talks.map(talk => {
                  const cat = getCat(talk.category)
                  return (
                    <div key={talk.id} className="bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-gray-300 transition-all cursor-pointer relative group/card"
                      onClick={() => openDiscussion(talk)}>
                      <div className="px-6 py-4">
                        {/* Title + category badge inline */}
                        <div className="flex items-start gap-2 mb-2.5 flex-wrap">
                          <h3 className="text-[15px] font-bold text-gray-900 leading-snug group-hover/card:text-indigo-600 transition-colors">{talk.title}</h3>
                          <span className={`inline-flex items-center self-center text-[11px] font-bold px-2 py-0.5 rounded-md border flex-shrink-0 ${cat.bg} ${cat.text} ${cat.border}`}>
                            {talk.category}
                          </span>
                        </div>

                        {/* Bottom meta row: author · time  ···  responses  [⋮] */}
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-gray-400 flex-shrink-0">
                            By <span className="text-gray-500 font-medium">{talk.user.firstName} {talk.user.lastName}</span>
                            <span className="mx-1.5">·</span>
                            {timeAgo(talk.createdAt)}
                          </span>

                          {/* Push to right */}
                          <span className="flex-1" />

                          {/* Response count */}
                          <span className="flex items-center gap-1 text-[12px] text-gray-400 flex-shrink-0">
                            <MessageCircle className="w-3.5 h-3.5" />
                            {talk.responseCount} response{talk.responseCount !== 1 ? 's' : ''}
                          </span>

                          {/* Three-dot menu */}
                          <div className="relative flex-shrink-0" data-menu>
                            <button onClick={e => { e.stopPropagation(); e.preventDefault(); setCardMenuId(cardMenuId === talk.id ? null : talk.id); setThreadMenuOpen(false); setResponseMenuId(null) }}
                              className="p-1 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-all ml-1">
                              <MoreVertical className="w-[15px] h-[15px]" />
                            </button>
                            {cardMenuId === talk.id && (
                              <div className="absolute top-7 right-0 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 w-48 z-20" data-menu>
                                <button onClick={e => { e.stopPropagation(); e.preventDefault(); navigator.clipboard.writeText(`${window.location.origin}/home/campus-talks?thread=${talk.id}`); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); setCardMenuId(null) }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                  <Share2 className="w-4 h-4 text-gray-400" /><span>Share Thread</span>
                                </button>
                                {talk.userId === user?.id && (
                                  <>
                                    <button onClick={e => { e.stopPropagation(); e.preventDefault(); openEditQuestion(talk) }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                      <Pencil className="w-4 h-4 text-gray-400" /><span>Edit</span>
                                    </button>
                                    <div className="mx-3 my-1 border-t border-gray-100"></div>
                                    <button onClick={e => { e.stopPropagation(); e.preventDefault(); handleDeleteQuestion(talk.id) }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                      <Trash2 className="w-4 h-4" /><span>Delete</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white border border-dashed border-gray-300 rounded-2xl py-16 text-center">
                <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3"><Megaphone className="w-7 h-7 text-indigo-400" /></div>
                <p className="text-gray-700 font-semibold mb-1">No discussions yet</p><p className="text-gray-400 text-sm mb-4">Be the first to ask a question!</p>
                <button onClick={() => setShowAskModal(true)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-all inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Ask a Question</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== ASK QUESTION MODAL ===== */}
      {showAskModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAskModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Ask a Question</h2>
              <button onClick={() => setShowAskModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                <div className="relative"><select value={askForm.category} onChange={e => setAskForm(p => ({ ...p, category: e.target.value }))} className="appearance-none w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer">{DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" /></div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Question <span className="text-red-500">*</span></label>
                <input type="text" value={askForm.title} onChange={e => { setAskForm(p => ({ ...p, title: e.target.value })); if (askErrors.title) setAskErrors({}) }} placeholder="e.g., Best study spots on campus?" className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 ${askErrors.title ? 'border-red-300' : 'border-gray-200'}`} />
                {askErrors.title && <p className="text-xs text-red-500 mt-1">{askErrors.title}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Details <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
                <textarea value={askForm.content} onChange={e => setAskForm(p => ({ ...p, content: e.target.value }))} placeholder="Add more context..." rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-5">
              <button onClick={() => { setShowAskModal(false); setAskErrors({}) }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-sm">Cancel</button>
              <button onClick={handleAskQuestion} disabled={isPosting} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">{isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Post</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT QUESTION MODAL ===== */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditingQuestion(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Edit Question</h2>
              <button onClick={() => setEditingQuestion(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                <div className="relative"><select value={editQuestionForm.category} onChange={e => setEditQuestionForm(p => ({ ...p, category: e.target.value }))} className="appearance-none w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer">{DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" /></div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Question <span className="text-red-500">*</span></label>
                <input type="text" value={editQuestionForm.title} onChange={e => setEditQuestionForm(p => ({ ...p, title: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Details <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
                <textarea value={editQuestionForm.content} onChange={e => setEditQuestionForm(p => ({ ...p, content: e.target.value }))} rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-5">
              <button onClick={() => setEditingQuestion(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-sm">Cancel</button>
              <button onClick={handleSaveEditQuestion} disabled={isSavingEdit || !editQuestionForm.title.trim()} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">{isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <ProfileViewModal userId={profileViewUserId} onClose={() => setProfileViewUserId(null)} currentUserId={user?.id}
        onStartDM={(dmUser) => { router.push(`/home?openDM=${dmUser.id}&dmName=${encodeURIComponent(dmUser.firstName + ' ' + dmUser.lastName)}`) }} />
    </div>
  )
}