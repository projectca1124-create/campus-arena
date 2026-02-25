'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Users, Calendar, LayoutList, Megaphone, MessageSquare, Home, LogOut,
  Bell, Loader2, Pencil, Camera, X, Save, MessageCircle, CheckCircle,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell';

// ─── Types ───────────────────────────────────────────────────────
interface User {
  id: string; email: string; firstName: string; lastName: string
  university?: string; major?: string; semester?: string; year?: string
  funFact?: string; profileImage?: string; hometown?: string; bio?: string; minor?: string
}

interface Stats {
  questionsAsked: number
  answersGiven: number
}

// ─── Interests options ───────────────────────────────────────────
const INTEREST_OPTIONS = [
  'AI & ML', 'Web Dev', 'Data Science', 'Photography', 'Music',
  'Gaming', 'Sports', 'Reading', 'Travel', 'Cooking',
  'Art', 'Robotics', 'Entrepreneurship', 'Biology', 'Finance',
  'Design', 'Film', 'Yoga', 'Hiking',
]

// ─── Avatar ──────────────────────────────────────────────────────
function UserAvatar({ src, firstName, lastName, size = 36, className = '' }: {
  src?: string | null; firstName?: string; lastName?: string; size?: number; className?: string
}) {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`
  if (src) return <img src={src} alt={`${firstName} ${lastName}`} className={`rounded-full object-cover flex-shrink-0 ${className}`} style={{ width: size, height: size }} />
  return (
    <div className={`rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}>{initials}</div>
  )
}

// ─── Main ────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<Stats>({ questionsAsked: 0, answersGiven: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'activity' | 'edit'>('activity')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Edit form
  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', major: '', minor: '',
    semester: '', year: '', hometown: '', bio: '',
  })
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])

  // ─── Load profile ────────────────────────────────────────────
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userStr = localStorage.getItem('user')
        if (!userStr) { router.push('/auth'); return }
        const currentUser = JSON.parse(userStr) as User
        setUser(currentUser)

        const res = await fetch(`/api/profile?userId=${currentUser.id}`)
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
          setStats(data.stats)

          // Parse interests from funFact
          const interests = data.user.funFact
            ? data.user.funFact.split(',').map((s: string) => s.trim()).filter(Boolean)
            : []

          setEditForm({
            firstName: data.user.firstName || '',
            lastName: data.user.lastName || '',
            major: data.user.major || '',
            minor: data.user.minor || '',
            semester: data.user.semester || '',
            year: data.user.year || '',
            hometown: data.user.hometown || '',
            bio: data.user.bio || '',
          })
          setSelectedInterests(interests.filter((i: string) => INTEREST_OPTIONS.includes(i)))
        }
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()
  }, [router])

  // ─── Save profile ───────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          major: editForm.major,
          minor: editForm.minor,
          semester: editForm.semester,
          year: editForm.year,
          hometown: editForm.hometown,
          bio: editForm.bio,
          interests: selectedInterests,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        // Update localStorage
        const stored = JSON.parse(localStorage.getItem('user') || '{}')
        localStorage.setItem('user', JSON.stringify({ ...stored, ...data.user }))
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Profile image upload ───────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      if (!user) return
      try {
        const res = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, profileImage: base64 }),
        })
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
          const stored = JSON.parse(localStorage.getItem('user') || '{}')
          localStorage.setItem('user', JSON.stringify({ ...stored, profileImage: base64 }))
        }
      } catch (err) { console.error('Error:', err) }
    }
    reader.readAsDataURL(file)
  }

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    )
  }

  const handleLogout = () => { localStorage.removeItem('user'); router.push('/auth') }

  // Parse interests from funFact for display
  const displayInterests = user?.funFact
    ? user.funFact.split(',').map(s => s.trim()).filter(Boolean)
    : []

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500 text-sm">Loading profile...</p>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* LEFT SIDEBAR */}
      <aside className="w-[210px] bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center"><span className="text-white font-bold text-xs">CA</span></div>
            <span className="font-bold text-[15px] text-gray-900">Campus Arena</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pt-2 space-y-0.5">
          {/* <NavItem icon={<LayoutList className="w-[18px] h-[18px]" />} label="CAMP" /> */}
          {/* <NavItem icon={<Home className="w-[18px] h-[18px]" />} label="Dashboard" /> */}
          <NavItem icon={<MessageSquare className="w-[18px] h-[18px]" />} label="Chat" onClick={() => router.push('/home')} />
          <NavItem icon={<Megaphone className="w-[18px] h-[18px]" />} label="Campus Talks" onClick={() => router.push('/home/campus-talks')} />
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
          <h1 className="text-[15px] font-semibold text-gray-900">My Profile</h1>
          {user && (
            <div className="flex items-center gap-3">
              <NotificationBell userId={user?.id || ''} />
              <UserAvatar src={user.profileImage} firstName={user.firstName} lastName={user.lastName} size={36} className="border-2 border-gray-100" />
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6">

            {/* Banner + Profile Section */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
              {/* Gradient banner */}
              <div className="h-[120px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-400"></div>

              {/* Profile info */}
              <div className="px-8 pb-6 relative">
                {/* Avatar */}
                <div className="relative -mt-14 mb-4 inline-block">
                  <UserAvatar src={user?.profileImage} firstName={user?.firstName} lastName={user?.lastName} size={100} className="border-4 border-white shadow-lg" />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-1 right-1 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-indigo-700 transition-all border-2 border-white">
                    <Camera className="w-4 h-4" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </div>

                {/* Edit Profile button */}
                <button onClick={() => setActiveTab('edit')}
                  className="absolute top-4 right-8 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all flex items-center gap-2">
                  <Pencil className="w-4 h-4" /> Edit Profile
                </button>

                {/* Name + Email */}
                <h2 className="text-2xl font-bold text-gray-900">{user?.firstName} {user?.lastName}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>

                {/* Tags: Major, Semester, Hometown */}
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 flex-wrap">
                  {user?.major && (
                    <span className="flex items-center gap-1.5">
                      <span className="text-gray-400">🎓</span> {user.major}
                    </span>
                  )}
                  {user?.semester && user?.year && (
                    <span className="flex items-center gap-1.5">
                      <span className="text-gray-400">📋</span> {user.semester} {user.year}
                    </span>
                  )}
                  {user?.hometown && (
                    <span className="flex items-center gap-1.5">
                      <span className="text-gray-400">📍</span> {user.hometown}
                    </span>
                  )}
                </div>

                {/* Bio */}
                {user?.bio && (
                  <p className="text-sm text-gray-600 mt-3 leading-relaxed">{user.bio}</p>
                )}

                {/* Interest tags */}
                {displayInterests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {displayInterests.map((tag, i) => (
                      <span key={i} className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1 font-medium">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-gray-200">
              <button onClick={() => setActiveTab('activity')}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${activeTab === 'activity' ? 'text-gray-900 border-gray-900' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>
                Activity
              </button>
              <button onClick={() => setActiveTab('edit')}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${activeTab === 'edit' ? 'text-gray-900 border-gray-900' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>
                Edit Info
              </button>
            </div>

            {/* ─── ACTIVITY TAB ─────────────────────────────────── */}
            {activeTab === 'activity' && (
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => router.push('/home/campus-talks?tab=my')} className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center text-center hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-3">
                    <MessageCircle className="w-6 h-6 text-orange-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.questionsAsked}</p>
                  <p className="text-sm text-gray-500 mt-1">Questions Asked</p>
                </button>
                <button onClick={() => router.push('/home/campus-talks?tab=answered')} className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center text-center hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-teal-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.answersGiven}</p>
                  <p className="text-sm text-gray-500 mt-1">My Responses</p>
                </button>
              </div>
            )}

            {/* ─── EDIT INFO TAB ────────────────────────────────── */}
            {activeTab === 'edit' && (
              <div className="bg-white border border-gray-200 rounded-xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Edit Your Information</h3>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setActiveTab('activity')}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1.5 transition-all">
                      <X className="w-4 h-4" /> Cancel
                    </button>
                    <button onClick={handleSave} disabled={isSaving}
                      className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </div>
                </div>

                {saveSuccess && (
                  <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Profile updated successfully!
                  </div>
                )}

                {/* Row 1: First Name, Last Name */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                    <input type="text" value={editForm.firstName} onChange={(e) => setEditForm(p => ({ ...p, firstName: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                    <input type="text" value={editForm.lastName} onChange={(e) => setEditForm(p => ({ ...p, lastName: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>

                {/* Row 2: Major, Minor */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Major</label>
                    <input type="text" value={editForm.major} onChange={(e) => setEditForm(p => ({ ...p, major: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Minor (optional)</label>
                    <input type="text" value={editForm.minor} onChange={(e) => setEditForm(p => ({ ...p, minor: e.target.value }))}
                      placeholder="e.g., Statistics" className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>

                {/* Row 3: Semester, Year, Hometown */}
                <div className="grid grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Semester</label>
                    <select value={editForm.semester} onChange={(e) => setEditForm(p => ({ ...p, semester: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white">
                      <option value="">Select</option>
                      <option value="Fall">Fall</option>
                      <option value="Spring">Spring</option>
                      <option value="Summer">Summer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Enrollment Year</label>
                    <input type="text" value={editForm.year} onChange={(e) => setEditForm(p => ({ ...p, year: e.target.value }))}
                      placeholder="2023" className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Hometown</label>
                    <input type="text" value={editForm.hometown} onChange={(e) => setEditForm(p => ({ ...p, hometown: e.target.value }))}
                      placeholder="City, Country" className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>

                {/* Bio */}
                <div className="mb-8">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Bio</label>
                  <textarea value={editForm.bio} onChange={(e) => setEditForm(p => ({ ...p, bio: e.target.value }))}
                    placeholder="Tell us about yourself..." rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
                </div>

                {/* Interests */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    💡 Interests <span className="text-xs text-gray-400 font-normal">(tap to select/deselect)</span>
                  </label>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {INTEREST_OPTIONS.map(interest => {
                      const isSelected = selectedInterests.includes(interest)
                      return (
                        <button key={interest} onClick={() => toggleInterest(interest)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-300 hover:text-indigo-600'
                          }`}>
                          {isSelected && <span className="mr-1">✓</span>}
                          {interest}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}>
      <span className="flex items-center justify-center w-5 h-5">{icon}</span><span>{label}</span>
    </button>
  )
}