'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Plus, Megaphone, Loader2, MessageCircle,
  ArrowLeft, X, ChevronDown, Send,
  MoreVertical, Trash2, Pencil, Share2, Check,
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

// ─── Category colors — exact Base44 style ────────────────────────
const categoryColors: Record<string, { bg: string; text: string; icon: string }> = {
  'Campus Life': { bg: '#f5f3ff', text: '#7c3aed', icon: '🏫' },
  'Academics':   { bg: '#eff6ff', text: '#2563eb', icon: '📚' },
  'Research':    { bg: '#f0fdf4', text: '#16a34a', icon: '🔬' },
  'Housing':     { bg: '#fff7ed', text: '#ea580c', icon: '🏠' },
  'Career':      { bg: '#fdf2f8', text: '#db2777', icon: '💼' },
  'Social':      { bg: '#fefce8', text: '#ca8a04', icon: '🎉' },
  'General':     { bg: '#f8fafc', text: '#475569', icon: '💬' },
}
function getCat(cat: string) { return categoryColors[cat] || categoryColors['General'] }

function CategoryBadge({ category }: { category: string }) {
  const c = getCat(category)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, fontWeight: 600,
      color: c.text, background: c.bg,
      padding: '4px 10px', borderRadius: 6,
    }}>
      {c.icon} {category}
    </span>
  )
}

// ─── Avatar ──────────────────────────────────────────────────────
function UserAvatar({ src, firstName, lastName, size = 36, onClick }: {
  src?: string | null; firstName?: string; lastName?: string; size?: number; onClick?: () => void
}) {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`
  const s: React.CSSProperties = { width: size, height: size, borderRadius: '50%', flexShrink: 0, cursor: onClick ? 'pointer' : 'default' }
  if (src) return <img src={src} alt="" onClick={onClick} style={{ ...s, objectFit: 'cover' }} />
  return (
    <div onClick={onClick} style={{ ...s, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: size * 0.36 }}>
      {initials}
    </div>
  )
}

function timeAgo(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const DEFAULT_CATEGORIES = ['Campus Life', 'Academics', 'Research', 'Housing', 'Career', 'Social', 'General']
const TABS = [
  { key: 'all' as const,        label: 'All Discussions' },
  { key: 'unanswered' as const, label: 'Unanswered' },
  { key: 'my' as const,         label: 'My Questions' },
  { key: 'answered' as const,   label: 'My Responses' },
]

// ─── Shared button styles ─────────────────────────────────────────
const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  padding: '9px 20px', background: '#4f46e5', color: 'white',
  border: 'none', borderRadius: 8, cursor: 'pointer',
  fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
}
const btnGhost: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '6px 12px', background: 'none', color: '#6b7280',
  border: 'none', borderRadius: 8, cursor: 'pointer',
  fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
}

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
  const [unansweredCount, setUnansweredCount] = useState(0)

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

  const [cardMenuId, setCardMenuId] = useState<string | null>(null)
  const [threadMenuOpen, setThreadMenuOpen] = useState(false)
  const [responseMenuId, setResponseMenuId] = useState<string | null>(null)

  const [editingQuestion, setEditingQuestion] = useState<CampusTalk | null>(null)
  const [editQuestionForm, setEditQuestionForm] = useState({ title: '', content: '', category: 'General' })
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null)
  const [editResponseContent, setEditResponseContent] = useState('')
  const [isSavingResponseEdit, setIsSavingResponseEdit] = useState(false)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-menu]')) return
      setCardMenuId(null); setThreadMenuOpen(false); setResponseMenuId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) { router.push('/auth'); return }
    const u = JSON.parse(userStr) as User
    setUser(u)
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')
    if (tabParam === 'my' || tabParam === 'unanswered' || tabParam === 'answered') {
      setActiveTab(tabParam); loadTalks(u.id, '', '', tabParam)
    } else { loadTalks(u.id, '', '', 'all') }
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
        if (data.categories?.length > 0) setCategories([...new Set([...DEFAULT_CATEGORIES, ...data.categories])])
        if (typeof data.unansweredCount === 'number') setUnansweredCount(data.unansweredCount)
      }
    } catch (err) { console.error(err) }
    finally { setIsLoading(false) }
  }

  useEffect(() => {
    if (!user) return
    const t = setTimeout(() => loadTalks(user.id, searchQuery, categoryFilter, activeTab), 300)
    return () => clearTimeout(t)
  }, [searchQuery, categoryFilter, activeTab])

  useEffect(() => {
    if (!user) return
    const params = new URLSearchParams(window.location.search)
    const threadId = params.get('thread')
    if (!threadId) return
    window.history.replaceState({}, '', '/home/campus-talks')
    const match = talks.find(t => t.id === threadId)
    if (match) { openDiscussion(match); return }
    fetch(`/api/campus-talks/${threadId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.talk) openDiscussion(data.talk) })
      .catch(() => {})
  }, [user])

  const handleAskQuestion = async () => {
    const errors: Record<string, string> = {}
    if (!askForm.title.trim()) errors.title = 'Question is required.'
    setAskErrors(errors); if (Object.keys(errors).length > 0) return; setIsPosting(true)
    try {
      const res = await fetch('/api/campus-talks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...askForm, userId: user?.id }) })
      if (res.ok) {
        setShowAskModal(false); setAskForm({ title: '', content: '', category: 'General' }); setAskErrors({})
        setActiveTab('unanswered'); setUnansweredCount(prev => prev + 1)
        if (user) loadTalks(user.id, searchQuery, categoryFilter, 'unanswered')
      }
    } catch (err) { console.error(err) }
    finally { setIsPosting(false) }
  }

  const openDiscussion = async (talk: CampusTalk) => {
    setSelectedTalk(talk); setIsLoadingResponses(true); setCardMenuId(null)
    try {
      const res = await fetch(`/api/campus-talks/${talk.id}/responses`)
      if (res.ok) { const data = await res.json(); setResponses((data.responses || []).reverse()) }
    } catch (err) { console.error(err) }
    finally { setIsLoadingResponses(false) }
  }

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newResponse.trim() || !selectedTalk || !user) return
    setIsSendingResponse(true)
    try {
      const res = await fetch(`/api/campus-talks/${selectedTalk.id}/responses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: newResponse, userId: user.id }) })
      if (res.ok) {
        const data = await res.json()
        setResponses(prev => [data.response, ...prev])
        setNewResponse('')
        const wasUnanswered = selectedTalk.responseCount === 0
        setTalks(prev => prev.map(t => t.id === selectedTalk.id ? { ...t, responseCount: t.responseCount + 1 } : t))
        setSelectedTalk(prev => prev ? { ...prev, responseCount: prev.responseCount + 1 } : null)
        if (wasUnanswered) setUnansweredCount(prev => Math.max(0, prev - 1))
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
        setTimeout(() => responseEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    } catch (err) { console.error(err) }
    finally { setIsSendingResponse(false) }
  }

  const handleDeleteQuestion = async (talkId: string) => {
    if (!confirm('Delete this question and all its responses?')) return
    const talk = talks.find(t => t.id === talkId)
    try {
      const res = await fetch(`/api/campus-talks/${talkId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id }) })
      if (res.ok) {
        setTalks(prev => prev.filter(t => t.id !== talkId))
        if (selectedTalk?.id === talkId) { setSelectedTalk(null); setResponses([]) }
        if (talk && talk.responseCount === 0) setUnansweredCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) { console.error(err) }
    finally { setCardMenuId(null); setThreadMenuOpen(false) }
  }

  const openEditQuestion = (talk: CampusTalk) => {
    setEditingQuestion(talk)
    setEditQuestionForm({ title: talk.title, content: talk.content || '', category: talk.category })
    setCardMenuId(null); setThreadMenuOpen(false)
  }

  const handleSaveEditQuestion = async () => {
    if (!editingQuestion || !editQuestionForm.title.trim()) return
    setIsSavingEdit(true)
    try {
      const res = await fetch(`/api/campus-talks/${editingQuestion.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id, ...editQuestionForm }) })
      if (res.ok) {
        const data = await res.json()
        const updated = data.talk || { ...editingQuestion, ...editQuestionForm }
        setTalks(prev => prev.map(t => t.id === editingQuestion.id ? { ...t, ...updated } : t))
        if (selectedTalk?.id === editingQuestion.id) setSelectedTalk(prev => prev ? { ...prev, ...updated } : null)
        setEditingQuestion(null)
      }
    } catch (err) { console.error(err) }
    finally { setIsSavingEdit(false) }
  }

  const handleDeleteResponse = async (responseId: string) => {
    if (!confirm('Delete this response?') || !selectedTalk) return
    try {
      const res = await fetch(`/api/campus-talks/${selectedTalk.id}/responses/${responseId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id }) })
      if (res.ok) {
        const remaining = responses.filter(r => r.id !== responseId).length
        setResponses(prev => prev.filter(r => r.id !== responseId))
        setTalks(prev => prev.map(t => t.id === selectedTalk.id ? { ...t, responseCount: Math.max(0, t.responseCount - 1) } : t))
        setSelectedTalk(prev => prev ? { ...prev, responseCount: Math.max(0, prev.responseCount - 1) } : null)
        if (remaining === 0) setUnansweredCount(prev => prev + 1)
      }
    } catch (err) { console.error(err) }
    finally { setResponseMenuId(null) }
  }

  const openEditResponse = (r: TalkResponse) => {
    setEditingResponseId(r.id); setEditResponseContent(r.content); setResponseMenuId(null)
  }

  const handleSaveEditResponse = async () => {
    if (!editingResponseId || !editResponseContent.trim() || !selectedTalk) return
    setIsSavingResponseEdit(true)
    try {
      const res = await fetch(`/api/campus-talks/${selectedTalk.id}/responses/${editingResponseId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id, content: editResponseContent }) })
      if (res.ok) {
        setResponses(prev => prev.map(r => r.id === editingResponseId ? { ...r, content: editResponseContent } : r))
        setEditingResponseId(null); setEditResponseContent('')
      }
    } catch (err) { console.error(err) }
    finally { setIsSavingResponseEdit(false) }
  }

  const copyThreadLink = () => {
    if (!selectedTalk) return
    navigator.clipboard.writeText(`${window.location.origin}/home/campus-talks?thread=${selectedTalk.id}`)
      .then(() => { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000) })
  }

  // ── Dropdown menu item style ──────────────────────────────────────
  const menuItem = (color = '#111827'): React.CSSProperties => ({
    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 14px', fontSize: 13, color,
    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
    fontFamily: 'inherit',
  })

  // ══════════════════════════════════════════════════════════════
  // THREAD DETAIL — original layout, fixed reply bar at bottom
  // ══════════════════════════════════════════════════════════════
  if (selectedTalk) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f9fafb' }}>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '24px 32px' }}>

          {/* Back button */}
          <button onClick={() => { setSelectedTalk(null); setResponses([]) }}
            style={{ ...btnGhost, marginBottom: 20, paddingLeft: 0 }}>
            <ArrowLeft size={15} /> Back to discussions
          </button>

          {/* Question card — white rounded like Base44 */}
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #f3f4f6', padding: '24px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <CategoryBadge category={selectedTalk.category} />
              <div style={{ position: 'relative' }} data-menu>
                <button onClick={e => { e.stopPropagation(); setThreadMenuOpen(p => !p) }}
                  style={{ padding: 6, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                  <MoreVertical size={16} />
                </button>
                {threadMenuOpen && (
                  <div style={{ position: 'absolute', top: 32, right: 0, background: 'white', border: '1px solid #f3f4f6', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: '4px 0', width: 172, zIndex: 20 }} data-menu>
                    <button onClick={copyThreadLink} style={menuItem()}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      {copiedLink ? <Check size={14} color="#22c55e" /> : <Share2 size={14} color="#9ca3af" />}
                      {copiedLink ? 'Copied!' : 'Share Thread'}
                    </button>
                    {selectedTalk.userId === user?.id && <>
                      <button onClick={() => openEditQuestion(selectedTalk)} style={menuItem()}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <Pencil size={14} color="#9ca3af" /> Edit Question
                      </button>
                      <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 10px' }} />
                      <button onClick={() => handleDeleteQuestion(selectedTalk.id)} style={menuItem('#ef4444')}
                        onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </>}
                  </div>
                )}
              </div>
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 10px', lineHeight: 1.35 }}>
              {selectedTalk.title}
            </h1>
            {selectedTalk.content && (
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.65, margin: '0 0 16px' }}>
                {selectedTalk.content}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280' }}>
              <UserAvatar src={selectedTalk.user.profileImage} firstName={selectedTalk.user.firstName}
                lastName={selectedTalk.user.lastName} size={24} onClick={() => setProfileViewUserId(selectedTalk.user.id)} />
              <span>By <strong style={{ color: '#374151', fontWeight: 600 }}>{selectedTalk.user.firstName} {selectedTalk.user.lastName}</strong></span>
              <span>·</span>
              <span>{timeAgo(selectedTalk.createdAt)}</span>
            </div>
          </div>

          {/* Responses */}
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>
            {responses.length} Response{responses.length !== 1 ? 's' : ''}
          </h3>

          {isLoadingResponses ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <Loader2 size={20} color="#d1d5db" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : responses.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {responses.map(r => (
                <div key={r.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #f3f4f6', padding: '20px' }}>
                  {editingResponseId === r.id ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <UserAvatar src={r.user.profileImage} firstName={r.user.firstName} lastName={r.user.lastName} size={30} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{r.user.firstName} {r.user.lastName}</span>
                        <span style={{ fontSize: 11, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>Editing</span>
                      </div>
                      <textarea value={editResponseContent} onChange={e => setEditResponseContent(e.target.value)}
                        rows={3} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                        <button onClick={() => { setEditingResponseId(null); setEditResponseContent('') }}
                          style={{ padding: '7px 14px', fontSize: 13, color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                        <button onClick={handleSaveEditResponse} disabled={isSavingResponseEdit || !editResponseContent.trim()}
                          style={{ padding: '7px 14px', fontSize: 13, color: 'white', background: '#4f46e5', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', opacity: isSavingResponseEdit || !editResponseContent.trim() ? 0.5 : 1 }}>
                          {isSavingResponseEdit ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />} Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <UserAvatar src={r.user.profileImage} firstName={r.user.firstName} lastName={r.user.lastName}
                        size={38} onClick={() => setProfileViewUserId(r.user.id)} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{r.user.firstName} {r.user.lastName}</span>
                          {r.user.academicStanding && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#4f46e5', background: '#eef2ff', padding: '2px 8px', borderRadius: 6 }}>{r.user.academicStanding}</span>
                          )}
                          <span style={{ fontSize: 12, color: '#9ca3af' }}>{timeAgo(r.createdAt)}</span>
                        </div>
                        <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.65, margin: 0 }}>{r.content}</p>
                      </div>
                      {r.user.id === user?.id && (
                        <div style={{ position: 'relative', flexShrink: 0 }} data-menu>
                          <button onClick={e => { e.stopPropagation(); setResponseMenuId(responseMenuId === r.id ? null : r.id) }}
                            style={{ padding: 5, borderRadius: 7, background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db' }}>
                            <MoreVertical size={15} />
                          </button>
                          {responseMenuId === r.id && (
                            <div style={{ position: 'absolute', top: 28, right: 0, background: 'white', border: '1px solid #f3f4f6', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: '4px 0', width: 150, zIndex: 20 }} data-menu>
                              <button onClick={() => openEditResponse(r)} style={menuItem()}
                                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                <Pencil size={13} color="#9ca3af" /> Edit
                              </button>
                              <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 10px' }} />
                              <button onClick={() => handleDeleteResponse(r.id)} style={menuItem('#ef4444')}
                                onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                <Trash2 size={13} /> Delete
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
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #f3f4f6', padding: '48px', textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <MessageCircle size={18} color="#d1d5db" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#6b7280', margin: '0 0 4px' }}>No responses yet</p>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Be the first to share your thoughts!</p>
            </div>
          )}

        </div>
      </div>

      {/* Reply bar — fixed at bottom, full width */}
      <div style={{ flexShrink: 0, background: 'white', borderTop: '1px solid #f3f4f6', padding: '12px 32px 16px' }}>
        <form onSubmit={handleSendResponse} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <textarea ref={textareaRef} value={newResponse}
            onChange={e => {
              setNewResponse(e.target.value)
              if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px' }
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (newResponse.trim()) handleSendResponse(e as any) } }}
            placeholder="Write your response..."
            rows={1} disabled={isSendingResponse}
            style={{
              flex: 1, padding: '12px 16px',
              border: '1.5px solid #e5e7eb', borderRadius: 12,
              fontSize: 14, outline: 'none', resize: 'none',
              fontFamily: 'inherit', background: '#fafafa',
              minHeight: 46, maxHeight: 120,
              boxSizing: 'border-box', color: '#374151',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
          <button type="submit" disabled={!newResponse.trim() || isSendingResponse}
            style={{
              flexShrink: 0, height: 46, padding: '0 24px',
              background: newResponse.trim() ? '#4f46e5' : '#e5e7eb',
              color: newResponse.trim() ? 'white' : '#9ca3af',
              border: 'none', borderRadius: 12,
              cursor: newResponse.trim() ? 'pointer' : 'default',
              fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: 'inherit', transition: 'all 0.15s',
            }}>
            {isSendingResponse ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
            Post Response
          </button>
        </form>
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════════════════
  // MAIN LIST — bg-gray-50 with white cards, exact Base44 match
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f9fafb' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '28px 32px' }}>

          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 24 }}>🔥</span>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                  Seniors on Demand
                </h2>
              </div>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                Real talk. Real answers. From seniors who've been there — drop your question, start the convo.
              </p>
            </div>
            <button onClick={() => setShowAskModal(true)} style={{ ...btnPrimary, flexShrink: 0 }}>
              <Plus size={15} /> Ask a Question
            </button>
          </div>

          {/* Search + Filter */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search discussions..."
                style={{ width: '100%', paddingLeft: 36, paddingRight: 14, height: 40, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, background: 'white', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            <div style={{ position: 'relative' }}>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                style={{ appearance: 'none', paddingLeft: 14, paddingRight: 32, height: 40, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: '#374151', background: 'white', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} color="#9ca3af" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Tabs — Base44: white bg, border, pill triggers */}
          <div style={{ marginBottom: 24, display: 'flex', background: 'white', border: '1px solid #f3f4f6', borderRadius: 10, padding: 4, width: 'fit-content', gap: 2 }}>
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 500,
                  background: activeTab === tab.key ? '#f3f4f6' : 'transparent',
                  color: activeTab === tab.key ? '#111827' : '#6b7280',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s',
                }}>
                {tab.label}
                {tab.key === 'unanswered' && unansweredCount > 0 && (
                  <span style={{
                    minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px',
                    background: activeTab === 'unanswered' ? '#4f46e5' : '#e5e7eb',
                    color: activeTab === 'unanswered' ? 'white' : '#6b7280',
                    fontSize: 10, fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {unansweredCount > 99 ? '99+' : unansweredCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Questions list — white rounded cards with hover shadow */}
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
              <Loader2 size={20} color="#d1d5db" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : talks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {talks.map(talk => (
                <div key={talk.id}
                  onClick={() => openDiscussion(talk)}
                  style={{
                    background: 'white', borderRadius: 16,
                    border: '1px solid #f3f4f6',
                    padding: '20px', cursor: 'pointer',
                    transition: 'box-shadow 0.2s, border-color 0.2s',
                  }}
                  onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)'; d.style.borderColor = '#e0e7ff' }}
                  onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.boxShadow = 'none'; d.style.borderColor = '#f3f4f6' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <CategoryBadge category={talk.category} />
                    <div style={{ position: 'relative' }} data-menu>
                      <button onClick={e => { e.stopPropagation(); setCardMenuId(cardMenuId === talk.id ? null : talk.id) }}
                        style={{ padding: '4px 6px', borderRadius: 7, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                        <MoreVertical size={16} />
                      </button>
                      {cardMenuId === talk.id && (
                        <div style={{ position: 'absolute', top: 30, right: 0, background: 'white', border: '1px solid #f3f4f6', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: '4px 0', width: 172, zIndex: 20 }} data-menu>
                          <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/home/campus-talks?thread=${talk.id}`); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); setCardMenuId(null) }}
                            style={menuItem()}
                            onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                            <Share2 size={14} color="#9ca3af" /> Share Thread
                          </button>
                          {talk.userId === user?.id && <>
                            <button onClick={e => { e.stopPropagation(); openEditQuestion(talk) }}
                              style={menuItem()}
                              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                              <Pencil size={14} color="#9ca3af" /> Edit
                            </button>
                            <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 10px' }} />
                            <button onClick={e => { e.stopPropagation(); handleDeleteQuestion(talk.id) }}
                              style={menuItem('#ef4444')}
                              onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                              <Trash2 size={14} /> Delete
                            </button>
                          </>}
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 10px', lineHeight: 1.4 }}>
                    {talk.title}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
                      <span>By <strong style={{ fontWeight: 500 }}>{talk.user.firstName} {talk.user.lastName}</strong></span>
                      <span>·</span>
                      <span>{timeAgo(talk.createdAt)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#6b7280' }}>
                      <MessageCircle size={14} />
                      {talk.responseCount} response{talk.responseCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #f3f4f6', padding: '64px', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Megaphone size={20} color="#d1d5db" />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>No discussions yet</p>
              <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 20px' }}>Be the first to ask a question!</p>
              <button onClick={() => setShowAskModal(true)} style={btnPrimary}>
                <Plus size={14} /> Ask a Question
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ASK MODAL */}
      {showAskModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowAskModal(false)}>
          <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.12)', width: '100%', maxWidth: 520 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Ask a Question</h2>
              <button onClick={() => setShowAskModal(false)} style={{ padding: 6, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={16} /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Category</label>
                <div style={{ position: 'relative' }}>
                  <select value={askForm.category} onChange={e => setAskForm(p => ({ ...p, category: e.target.value }))}
                    style={{ appearance: 'none', width: '100%', padding: '10px 32px 10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, background: 'white', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
                    {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={14} color="#9ca3af" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  Your Question <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input type="text" value={askForm.title}
                  onChange={e => { setAskForm(p => ({ ...p, title: e.target.value })); if (askErrors.title) setAskErrors({}) }}
                  placeholder="e.g., Best study spots on campus?"
                  style={{ width: '100%', padding: '10px 14px', border: `1px solid ${askErrors.title ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: askErrors.title ? '#fef2f2' : 'white' }} />
                {askErrors.title && <p style={{ fontSize: 12, color: '#f87171', margin: '4px 0 0' }}>{askErrors.title}</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  Details <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea value={askForm.content} onChange={e => setAskForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="Add more context..." rows={3}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowAskModal(false); setAskErrors({}) }}
                style={{ flex: 1, padding: '10px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#6b7280', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleAskQuestion} disabled={isPosting}
                style={{ flex: 1, padding: '10px', border: 'none', background: '#4f46e5', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit', opacity: isPosting ? 0.7 : 1 }}>
                {isPosting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />} Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT QUESTION MODAL */}
      {editingQuestion && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setEditingQuestion(null)}>
          <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.12)', width: '100%', maxWidth: 520 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Edit Question</h2>
              <button onClick={() => setEditingQuestion(null)} style={{ padding: 6, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={16} /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Category</label>
                <div style={{ position: 'relative' }}>
                  <select value={editQuestionForm.category} onChange={e => setEditQuestionForm(p => ({ ...p, category: e.target.value }))}
                    style={{ appearance: 'none', width: '100%', padding: '10px 32px 10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, background: 'white', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
                    {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={14} color="#9ca3af" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Question <span style={{ color: '#f87171' }}>*</span></label>
                <input type="text" value={editQuestionForm.title} onChange={e => setEditQuestionForm(p => ({ ...p, title: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Details <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
                <textarea value={editQuestionForm.content} onChange={e => setEditQuestionForm(p => ({ ...p, content: e.target.value }))}
                  rows={3} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
              <button onClick={() => setEditingQuestion(null)}
                style={{ flex: 1, padding: '10px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#6b7280', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleSaveEditQuestion} disabled={isSavingEdit || !editQuestionForm.title.trim()}
                style={{ flex: 1, padding: '10px', border: 'none', background: '#4f46e5', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit', opacity: isSavingEdit || !editQuestionForm.title.trim() ? 0.5 : 1 }}>
                {isSavingEdit ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />} Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <ProfileViewModal userId={profileViewUserId} onClose={() => setProfileViewUserId(null)} currentUserId={user?.id}
        onStartDM={(dmUser) => { router.push(`/home?openDM=${dmUser.id}&dmName=${encodeURIComponent(dmUser.firstName + ' ' + dmUser.lastName)}`) }} />

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}