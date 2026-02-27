'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, Users, Calendar, LayoutList, Megaphone, MessageSquare, Home, LogOut,
  Bell, Loader2, Pencil, Camera, X, Save, MessageCircle, CheckCircle,
  Lock, AlertCircle, Sparkles, ChevronDown,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import { UTA_MAJORS } from '@/lib/majors'

// ─── Types ───────────────────────────────────────────────────────
interface User {
  id: string; email: string; firstName: string; lastName: string
  university?: string; major?: string; degree?: string; semester?: string; year?: string
  funFact?: string; profileImage?: string; hometown?: string; bio?: string; minor?: string
  academicStanding?: string; interests?: string; onboardingComplete?: boolean
}

interface Stats { questionsAsked: number; answersGiven: number }

// ─── Constants ───────────────────────────────────────────────────
const INTEREST_OPTIONS = [
  'AI & ML', 'Web Dev', 'Data Science', 'Photography', 'Music',
  'Gaming', 'Sports', 'Reading', 'Travel', 'Cooking',
  'Art', 'Robotics', 'Entrepreneurship', 'Biology', 'Finance',
  'Design', 'Film', 'Yoga', 'Hiking', 'Cybersecurity',
  'Cloud Computing', 'Blockchain', 'IoT', 'Mobile Dev',
]

const YEARS = Array.from({ length: 11 }, (_, i) => (2020 + i).toString())

const UG_STANDINGS = ['Incoming Freshman', 'Freshman', 'Sophomore', 'Junior', 'Senior', 'Alumni']
const GRAD_STANDINGS = ['Junior', 'Senior', 'Alumni']

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

// ─── Searchable Major Dropdown ───────────────────────────────────
function MajorDropdown({ value, onChange, error }: {
  value: string; onChange: (val: string) => void; error?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const allOptions = [...UTA_MAJORS, 'Other']
  const filtered = search
    ? allOptions.filter(m => m.toLowerCase().includes(search.toLowerCase()))
    : allOptions

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus()
  }, [isOpen])

  const handleSelect = (major: string) => {
    onChange(major)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 border rounded-lg text-sm text-left focus:outline-none focus:ring-1 transition-all flex items-center justify-between ${
          error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
        } ${value ? 'text-gray-900' : 'text-gray-400'}`}>
        <span className="truncate">{value || 'Search or select your major'}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input ref={inputRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to search majors..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white" />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-[240px] overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map(major => (
                <button key={major} type="button" onClick={() => handleSelect(major)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 hover:text-indigo-600 transition-colors ${
                    value === major ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-gray-700'
                  } ${major === 'Other' ? 'border-t border-gray-100 font-medium text-gray-900' : ''}`}>
                  {major}
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                No majors match "{search}"
                <button type="button" onClick={() => { handleSelect('Other'); setSearch('') }}
                  className="block mx-auto mt-2 text-indigo-600 font-semibold hover:underline">
                  Select "Other" to enter manually
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isOnboarding = searchParams.get('onboarding') === 'true'

  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<Stats>({ questionsAsked: 0, answersGiven: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'activity' | 'edit'>(isOnboarding ? 'edit' : 'activity')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [onboardingMode, setOnboardingMode] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Edit form
  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', degree: '', customDegree: '',
    major: '', customMajor: '', minor: '', semester: '', year: '',
    academicStanding: '', bio: '', hometown: '',
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

          // Only check onboarding from server data
          if (isOnboarding || !data.user.onboardingComplete) {
            setOnboardingMode(true)
            setActiveTab('edit')
          }

          const interests = data.user.interests
            ? data.user.interests.split(',').map((s: string) => s.trim()).filter(Boolean)
            : data.user.funFact
              ? data.user.funFact.split(',').map((s: string) => s.trim()).filter(Boolean)
              : []

          // Check if the saved major is in the dropdown list or custom
          const savedMajor = data.user.major || ''
          const isKnownMajor = UTA_MAJORS.includes(savedMajor)

          setEditForm({
            firstName: data.user.firstName || '',
            lastName: data.user.lastName || '',
            degree: data.user.degree || '',
            customDegree: '',
            major: isKnownMajor ? savedMajor : (savedMajor ? 'Other' : ''),
            customMajor: isKnownMajor ? '' : savedMajor,
            minor: data.user.minor || '',
            semester: data.user.semester || '',
            year: data.user.year || '',
            academicStanding: data.user.academicStanding || '',
            bio: data.user.bio || '',
            hometown: data.user.hometown || '',
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
  }, [router, isOnboarding])

  // ─── Validate & Save ────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return
    const errs: Record<string, string> = {}

    // Always validate required fields
    if (!editForm.firstName.trim()) errs.firstName = 'Required'
    if (!editForm.lastName.trim()) errs.lastName = 'Required'
    if (!editForm.degree) errs.degree = 'Required'
    if (editForm.degree === 'Other' && !editForm.customDegree.trim()) errs.customDegree = 'Enter your degree'
    if (!editForm.major) errs.major = 'Required'
    if (editForm.major === 'Other' && !editForm.customMajor.trim()) errs.customMajor = 'Enter your major'
    if (!editForm.year) errs.year = 'Required'
    if (!editForm.semester) errs.semester = 'Required'
    if ((editForm.degree === 'Undergraduate' || editForm.degree === 'Graduate') && !editForm.academicStanding) errs.academicStanding = 'Required'
    if (selectedInterests.length < 2) errs.interests = 'Select at least 2 interests'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setIsSaving(true)
    setSaveSuccess(false)

    // Resolve the actual major value
    const resolvedMajor = editForm.major === 'Other' ? editForm.customMajor.trim() : editForm.major

    try {
      const endpoint = onboardingMode ? '/api/profile/complete-onboarding' : '/api/profile'
      const method = onboardingMode ? 'POST' : 'PUT'

      const body = onboardingMode ? {
        userId: user.id,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        degree: editForm.degree === 'Other' ? editForm.customDegree : editForm.degree,
        customDegree: editForm.customDegree,
        major: resolvedMajor,
        minor: editForm.minor,
        year: editForm.year,
        semester: editForm.semester,
        academicStanding: editForm.academicStanding,
        bio: editForm.bio,
        interests: selectedInterests,
      } : {
        userId: user.id,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        degree: editForm.degree === 'Other' ? editForm.customDegree : editForm.degree,
        major: resolvedMajor,
        minor: editForm.minor,
        semester: editForm.semester,
        year: editForm.year,
        academicStanding: editForm.academicStanding,
        hometown: editForm.hometown,
        bio: editForm.bio,
        interests: selectedInterests,
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        const stored = JSON.parse(localStorage.getItem('user') || '{}')
        localStorage.setItem('user', JSON.stringify({ ...stored, ...data.user }))

        if (onboardingMode) {
          router.push('/home')
        } else {
          setSaveSuccess(true)
          setTimeout(() => {
            setSaveSuccess(false)
            setActiveTab('activity')
          }, 1500)
        }
      } else {
        const data = await res.json()
        setErrors({ general: data.error || 'Failed to save' })
      }
    } catch (err) {
      console.error('Error:', err)
      setErrors({ general: 'Something went wrong' })
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
    if (errors.interests) setErrors(p => ({ ...p, interests: '' }))
  }

  const handleLogout = () => { setShowLogoutModal(true) }
  const confirmLogout = () => { localStorage.removeItem('user'); router.push('/auth') }

  const displayInterests = user?.interests
    ? user.interests.split(',').map(s => s.trim()).filter(Boolean)
    : user?.funFact
      ? user.funFact.split(',').map(s => s.trim()).filter(Boolean)
      : []

  const standingOptions = editForm.degree === 'Graduate' ? GRAD_STANDINGS : UG_STANDINGS

  const updateField = (field: string, value: string) => {
    setEditForm(p => ({ ...p, [field]: value }))
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }))
  }

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
          <NavItem icon={<MessageSquare className="w-[18px] h-[18px]" />} label="Chat"
            disabled={onboardingMode} onClick={() => !onboardingMode && router.push('/home')} />
          <NavItem icon={<Megaphone className="w-[18px] h-[18px]" />} label="Campus Talks"
            disabled={onboardingMode} onClick={() => !onboardingMode && router.push('/home/campus-talks')} />
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
          <h1 className="text-[15px] font-semibold text-gray-900">
            {onboardingMode ? 'Complete Your Profile' : 'My Profile'}
          </h1>
          {user && !onboardingMode && (
            <div className="flex items-center gap-3">
              <NotificationBell userId={user?.id || ''} />
              <UserAvatar src={user.profileImage} firstName={user.firstName} lastName={user.lastName} size={36} className="border-2 border-gray-100" />
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6">

            {/* ─── ONBOARDING BANNER + PHOTO ──────────────────── */}
            {onboardingMode && (
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 mb-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Sparkles className="w-6 h-6" />
                      <h2 className="text-xl font-bold">Let's get a few details to personalize your experience</h2>
                    </div>
                    <p className="text-indigo-100 text-sm ml-9">Fill in the required fields below, then you're all set!</p>
                  </div>
                  <div className="relative flex-shrink-0 ml-6">
                    <UserAvatar src={user?.profileImage} firstName={user?.firstName || '?'} lastName="" size={80} className="border-4 border-white/30" />
                    <button onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-8 h-8 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-md hover:bg-gray-100 transition-all border-2 border-indigo-400">
                      <Camera className="w-4 h-4" />
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <p className="text-[10px] text-indigo-200 text-center mt-1">Add photo</p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── PROFILE BANNER (non-onboarding) ────────────── */}
            {!onboardingMode && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
                <div className="h-[120px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-400"></div>
                <div className="px-8 pb-6 relative">
                  <div className="relative -mt-14 mb-4 inline-block">
                    <UserAvatar src={user?.profileImage} firstName={user?.firstName} lastName={user?.lastName} size={100} className="border-4 border-white shadow-lg" />
                    <button onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-1 right-1 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-indigo-700 transition-all border-2 border-white">
                      <Camera className="w-4 h-4" />
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </div>
                  <button onClick={() => setActiveTab('edit')}
                    className="absolute top-4 right-8 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all flex items-center gap-2">
                    <Pencil className="w-4 h-4" /> Edit Profile
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900">{user?.firstName} {user?.lastName}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 flex-wrap">
                    {user?.major && <span className="flex items-center gap-1.5"><span className="text-gray-400">🎓</span> {user.major}</span>}
                    {user?.semester && user?.year && <span className="flex items-center gap-1.5"><span className="text-gray-400">📋</span> {user.semester} {user.year}</span>}
                    {user?.hometown && <span className="flex items-center gap-1.5"><span className="text-gray-400">📍</span> {user.hometown}</span>}
                  </div>
                  {user?.bio && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{user.bio}</p>}
                  {displayInterests.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {displayInterests.map((tag, i) => (
                        <span key={i} className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1 font-medium">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tabs (hidden during onboarding) */}
            {!onboardingMode && (
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
            )}

            {/* ─── ACTIVITY TAB ─────────────────────────────────── */}
            {activeTab === 'activity' && !onboardingMode && (
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => router.push('/home/campus-talks?tab=my')} className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center text-center hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-3"><MessageCircle className="w-6 h-6 text-orange-500" /></div>
                  <p className="text-3xl font-bold text-gray-900">{stats.questionsAsked}</p>
                  <p className="text-sm text-gray-500 mt-1">Questions Asked</p>
                </button>
                <button onClick={() => router.push('/home/campus-talks?tab=answered')} className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center text-center hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mb-3"><CheckCircle className="w-6 h-6 text-teal-500" /></div>
                  <p className="text-3xl font-bold text-gray-900">{stats.answersGiven}</p>
                  <p className="text-sm text-gray-500 mt-1">My Responses</p>
                </button>
              </div>
            )}

            {/* ─── EDIT / ONBOARDING FORM ───────────────────────── */}
            {activeTab === 'edit' && (
              <div className="bg-white border border-gray-200 rounded-xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">
                    {onboardingMode ? 'Your Academic Profile' : 'Edit Your Information'}
                  </h3>
                  <div className="flex items-center gap-3">
                    {!onboardingMode && (
                      <button onClick={() => setActiveTab('activity')}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1.5 transition-all">
                        <X className="w-4 h-4" /> Cancel
                      </button>
                    )}
                    <button onClick={handleSave} disabled={isSaving}
                      className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : onboardingMode ? <Sparkles className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                      {onboardingMode ? 'Save & Enter' : 'Save Changes'}
                    </button>
                  </div>
                </div>

                {errors.general && (
                  <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {errors.general}
                  </div>
                )}

                {saveSuccess && (
                  <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Profile updated successfully!
                  </div>
                )}

                {/* Row 1: First Name, Last Name */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <FormField label="First Name" required error={errors.firstName}>
                    <input type="text" value={editForm.firstName} onChange={(e) => updateField('firstName', e.target.value)}
                      placeholder="John" className={inputClass(errors.firstName)} />
                  </FormField>
                  <FormField label="Last Name" required error={errors.lastName}>
                    <input type="text" value={editForm.lastName} onChange={(e) => updateField('lastName', e.target.value)}
                      placeholder="Doe" className={inputClass(errors.lastName)} />
                  </FormField>
                </div>

                {/* Row 2: Degree, Major */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <FormField label="Degree" required error={errors.degree}>
                    <select value={editForm.degree} onChange={(e) => { updateField('degree', e.target.value); updateField('academicStanding', '') }}
                      className={inputClass(errors.degree) + ' bg-white'}>
                      <option value="">Select degree</option>
                      <option value="Undergraduate">Undergraduate</option>
                      <option value="Graduate">Graduate</option>
                      <option value="Other">Other</option>
                    </select>
                  </FormField>
                  <FormField label="Major" required error={errors.major}>
                    <MajorDropdown
                      value={editForm.major}
                      onChange={(val) => {
                        updateField('major', val)
                        if (val !== 'Other') updateField('customMajor', '')
                      }}
                      error={errors.major}
                    />
                  </FormField>
                </div>

                {/* Custom degree field */}
                {editForm.degree === 'Other' && (
                  <div className="mb-6">
                    <FormField label="Enter your degree" required error={errors.customDegree}>
                      <input type="text" value={editForm.customDegree} onChange={(e) => updateField('customDegree', e.target.value)}
                        placeholder="e.g., Doctorate, Post-Baccalaureate" className={inputClass(errors.customDegree)} />
                    </FormField>
                  </div>
                )}

                {/* Custom major field */}
                {editForm.major === 'Other' && (
                  <div className="mb-6">
                    <FormField label="Enter your major" required error={errors.customMajor}>
                      <input type="text" value={editForm.customMajor} onChange={(e) => updateField('customMajor', e.target.value)}
                        placeholder="Enter full abbreviation of your major" className={inputClass(errors.customMajor)} />
                    </FormField>
                  </div>
                )}

                {/* Row 3: Minor */}
                <div className="mb-6">
                  <FormField label="Minor" optional>
                    <input type="text" value={editForm.minor} onChange={(e) => updateField('minor', e.target.value)}
                      placeholder="e.g., Statistics" className={inputClass()} />
                  </FormField>
                </div>

                {/* Row 4: Semester, Year, Standing */}
                <div className="grid grid-cols-3 gap-6 mb-6">
                  <FormField label="Enrollment Semester" required error={errors.semester}>
                    <select value={editForm.semester} onChange={(e) => updateField('semester', e.target.value)}
                      className={inputClass(errors.semester) + ' bg-white'}>
                      <option value="">Select</option>
                      <option value="Fall">Fall</option>
                      <option value="Spring">Spring</option>
                      <option value="Summer">Summer</option>
                    </select>
                  </FormField>
                  <FormField label="Enrollment Year" required error={errors.year}>
                    <select value={editForm.year} onChange={(e) => updateField('year', e.target.value)}
                      className={inputClass(errors.year) + ' bg-white'}>
                      <option value="">Select</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </FormField>
                  {(editForm.degree === 'Undergraduate' || editForm.degree === 'Graduate') && (
                    <FormField label="Academic Standing" required error={errors.academicStanding}>
                      <select value={editForm.academicStanding} onChange={(e) => updateField('academicStanding', e.target.value)}
                        className={inputClass(errors.academicStanding) + ' bg-white'}>
                        <option value="">Select</option>
                        {standingOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </FormField>
                  )}
                </div>

                {/* Hometown */}
                <div className="mb-6">
                  <FormField label="Hometown" optional>
                    <input type="text" value={editForm.hometown} onChange={(e) => updateField('hometown', e.target.value)}
                      placeholder="City, Country" className={inputClass()} />
                  </FormField>
                </div>

                {/* Bio */}
                <div className="mb-8">
                  <FormField label="Bio" optional>
                    <textarea value={editForm.bio} onChange={(e) => updateField('bio', e.target.value)}
                      placeholder="I am good at music, love hiking on weekends..." rows={3}
                      className={inputClass() + ' resize-none'} />
                  </FormField>
                </div>

                {/* Interests */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-sm font-semibold text-gray-700">💡 Interests</label>
                    <span className="text-xs text-red-500">*</span>
                    <span className="text-xs text-gray-400">(select at least 2)</span>
                  </div>
                  {errors.interests && <p className="text-xs text-red-500 mb-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.interests}</p>}
                  <div className="flex flex-wrap gap-2 mt-2">
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

      {/* LOGOUT MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowLogoutModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Leaving Campus Arena?</h2>
            <p className="text-sm text-gray-500 mb-6">You're leaving Campus Arena. Are you sure?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 font-semibold text-sm">No, Stay Here</button>
              <button onClick={confirmLogout} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm">Yes, Log Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helper Components ───────────────────────────────────────────
function FormField({ label, required, optional, error, children }: {
  label: string; required?: boolean; optional?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
        {optional && <span className="text-xs text-gray-400 font-normal ml-1">(optional)</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  )
}

function inputClass(error?: string) {
  return `w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-1 transition-all ${
    error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
  }`
}

function NavItem({ icon, label, active, disabled, onClick }: {
  icon: React.ReactNode; label: string; active?: boolean; disabled?: boolean; onClick?: () => void
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
        disabled ? 'text-gray-300 cursor-not-allowed' :
        active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'
      }`}>
      <span className="flex items-center justify-center w-5 h-5">{icon}</span>
      <span>{label}</span>
      {disabled && <Lock className="w-3 h-3 ml-auto text-gray-300" />}
    </button>
  )
}