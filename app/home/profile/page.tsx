'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, Loader2, Pencil, Camera, X, Save, MessageCircle, CheckCircle,
  AlertCircle, Sparkles, ChevronDown,
} from 'lucide-react'
import { UTA_MAJORS } from '@/lib/majors'

// ─── Types ───────────────────────────────────────────────────────
interface User {
  id: string; email: string; firstName: string; lastName: string
  university?: string; major?: string; degree?: string; semester?: string; year?: string
  funFact?: string; profileImage?: string; hometown?: string; bio?: string; minor?: string
  academicStanding?: string; interests?: string; onboardingComplete?: boolean
}
interface Stats { questionsAsked: number; answersGiven: number }

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

function compressImage(file: File | Blob, maxWidth = 800, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX_DIMENSION = 4096
        const scaleByWidth = maxWidth / img.width
        const scaleByMaxDim = Math.min(MAX_DIMENSION / img.width, MAX_DIMENSION / img.height)
        const scale = Math.min(1, scaleByWidth, scaleByMaxDim)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas not supported')); return }
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        let dataUrl = canvas.toDataURL('image/jpeg', quality)
        if (dataUrl.length > 1.5 * 1024 * 1024 * 1.37) dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        if (dataUrl.length > 1.5 * 1024 * 1024 * 1.37) dataUrl = canvas.toDataURL('image/jpeg', 0.5)
        resolve(dataUrl)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

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
    onChange(major); setIsOpen(false); setSearch('')
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 border rounded-lg text-sm text-left focus:outline-none focus:ring-1 transition-all flex items-center justify-between ${
          error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
        } ${value ? 'text-gray-900' : 'text-gray-400'}`}
        style={{ minHeight: 44 }}>
        <span className="truncate">{value || 'Search or select your major'}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input ref={inputRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to search majors..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                style={{ fontSize: 16, colorScheme: 'light', color: '#111827', backgroundColor: 'white' }} />
            </div>
          </div>
          <div className="max-h-[240px] overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map(major => (
                <button key={major} type="button" onClick={() => handleSelect(major)}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 hover:text-indigo-600 transition-colors ${
                    value === major ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-gray-700'
                  } ${major === 'Other' ? 'border-t border-gray-100 font-medium text-gray-900' : ''}`}
                  style={{ minHeight: 44 }}>
                  {major}
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                No majors match &ldquo;{search}&rdquo;
                <button type="button" onClick={() => { handleSelect('Other'); setSearch('') }}
                  className="block mx-auto mt-2 text-indigo-600 font-semibold hover:underline">
                  Select &ldquo;Other&rdquo; to enter manually
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
  const onboardingFileInputRef = useRef<HTMLInputElement>(null)
  const profileFileInputRef = useRef<HTMLInputElement>(null)

  const isOnboarding = searchParams.get('onboarding') === 'true'

  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<Stats>({ questionsAsked: 0, answersGiven: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'activity' | 'edit'>(isOnboarding ? 'edit' : 'activity')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imageUploadError, setImageUploadError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [onboardingMode, setOnboardingMode] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', degree: '', customDegree: '',
    major: '', customMajor: '', minor: '', semester: '', year: '',
    academicStanding: '', bio: '', hometown: '',
  })
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])

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
          if (isOnboarding || !data.user.onboardingComplete) {
            setOnboardingMode(true); setActiveTab('edit')
          }
          const interests = data.user.interests
            ? data.user.interests.split(',').map((s: string) => s.trim()).filter(Boolean)
            : data.user.funFact
              ? data.user.funFact.split(',').map((s: string) => s.trim()).filter(Boolean)
              : []
          const savedMajor = data.user.major || ''
          const isKnownMajor = UTA_MAJORS.includes(savedMajor)
          setEditForm({
            firstName: data.user.firstName || '', lastName: data.user.lastName || '',
            degree: data.user.degree || '', customDegree: '',
            major: isKnownMajor ? savedMajor : (savedMajor ? 'Other' : ''),
            customMajor: isKnownMajor ? '' : savedMajor,
            minor: data.user.minor || '', semester: data.user.semester || '',
            year: data.user.year || '', academicStanding: data.user.academicStanding || '',
            bio: data.user.bio || '', hometown: data.user.hometown || '',
          })
          setSelectedInterests(interests.filter((i: string) => INTEREST_OPTIONS.includes(i)))
        }
      } catch (err) { console.error('Error:', err) }
      finally { setIsLoading(false) }
    }
    loadProfile()
  }, [router, isOnboarding])

  const handleSave = async () => {
    if (!user) return
    const errs: Record<string, string> = {}
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
    setIsSaving(true); setSaveSuccess(false)
    const resolvedMajor = editForm.major === 'Other' ? editForm.customMajor.trim() : editForm.major
    try {
      const endpoint = onboardingMode ? '/api/profile/complete-onboarding' : '/api/profile'
      const method = onboardingMode ? 'POST' : 'PUT'
      const body = onboardingMode ? {
        userId: user.id, firstName: editForm.firstName, lastName: editForm.lastName,
        degree: editForm.degree === 'Other' ? editForm.customDegree : editForm.degree,
        customDegree: editForm.customDegree, major: resolvedMajor, minor: editForm.minor,
        year: editForm.year, semester: editForm.semester, academicStanding: editForm.academicStanding,
        bio: editForm.bio, hometown: editForm.hometown, interests: selectedInterests,
      } : {
        userId: user.id, firstName: editForm.firstName, lastName: editForm.lastName,
        degree: editForm.degree === 'Other' ? editForm.customDegree : editForm.degree,
        major: resolvedMajor, minor: editForm.minor, semester: editForm.semester,
        year: editForm.year, academicStanding: editForm.academicStanding,
        hometown: editForm.hometown, bio: editForm.bio, interests: selectedInterests,
      }
      const res = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        const data = await res.json(); setUser(data.user)
        const stored = JSON.parse(localStorage.getItem('user') || '{}')
        localStorage.setItem('user', JSON.stringify({ ...stored, ...data.user }))
        if (onboardingMode) { router.push('/home') }
        else { setSaveSuccess(true); setTimeout(() => { setSaveSuccess(false); setActiveTab('activity') }, 1500) }
      } else {
        const data = await res.json(); setErrors({ general: data.error || 'Failed to save' })
      }
    } catch (err) { console.error('Error:', err); setErrors({ general: 'Something went wrong' }) }
    finally { setIsSaving(false) }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    e.target.value = ''
    setIsUploadingImage(true); setImageUploadError(null)
    try {
      let fileToCompress: File | Blob = file
      const isHEIC = file.type === 'image/heic' || file.type === 'image/heif'
        || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')
      if (isHEIC) {
        let converted = false
        try {
          const heic2any = (await import('heic2any')).default
          const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
          fileToCompress = Array.isArray(result) ? result[0] : result; converted = true
        } catch {}
        if (!converted) {
          try {
            const objectUrl = URL.createObjectURL(file)
            const img = new Image()
            await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('')); img.src = objectUrl })
            const canvas = document.createElement('canvas')
            const MAX = 800; const scale = Math.min(1, MAX / img.width, MAX / img.height)
            canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale)
            const ctx = canvas.getContext('2d')!
            ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            URL.revokeObjectURL(objectUrl)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
            const res = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, profileImage: dataUrl }) })
            if (res.ok) {
              const data = await res.json()
              setUser(prev => prev ? { ...prev, profileImage: data.user.profileImage } : prev)
              const stored = JSON.parse(localStorage.getItem('user') || '{}')
              localStorage.setItem('user', JSON.stringify({ ...stored, profileImage: data.user.profileImage }))
              window.dispatchEvent(new Event('userUpdated'))
            } else { setImageUploadError('Upload failed. Please try again.') }
            return
          } catch {
            setImageUploadError("This image format isn't supported. Please screenshot the photo and upload that instead.")
            return
          }
        }
      }
      const compressed = await compressImage(fileToCompress, 800, 0.85)
      const res = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, profileImage: compressed }) })
      if (res.ok) {
        const data = await res.json()
        setUser(prev => prev ? { ...prev, profileImage: data.user.profileImage } : prev)
        const stored = JSON.parse(localStorage.getItem('user') || '{}')
        localStorage.setItem('user', JSON.stringify({ ...stored, profileImage: data.user.profileImage }))
        window.dispatchEvent(new Event('userUpdated'))
      } else {
        const data = await res.json().catch(() => ({}))
        setImageUploadError(data.error || 'Upload failed. Please try again.')
      }
    } catch (err) { console.error('Image upload error:', err); setImageUploadError('Something went wrong. Please try a different image.') }
    finally { setIsUploadingImage(false) }
  }

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest])
    if (errors.interests) setErrors(p => ({ ...p, interests: '' }))
  }

  const displayInterests = user?.interests
    ? user.interests.split(',').map(s => s.trim()).filter(Boolean)
    : user?.funFact ? user.funFact.split(',').map(s => s.trim()).filter(Boolean) : []

  const standingOptions = editForm.degree === 'Graduate' ? GRAD_STANDINGS : UG_STANDINGS
  const updateField = (field: string, value: string) => {
    setEditForm(p => ({ ...p, [field]: value }))
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }))
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500 text-sm">Loading profile...</p>
      </div>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto">
      {/* ✅ Responsive padding: tight on mobile, generous on desktop */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">

        {imageUploadError && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{imageUploadError}</div>
            <button onClick={() => setImageUploadError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ONBOARDING BANNER */}
        {onboardingMode && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 sm:p-6 mb-5 text-white">
            {/* ✅ Stack vertically on mobile, side-by-side on sm+ */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              {/* Avatar — centered on mobile, right-aligned on desktop */}
              <div className="flex flex-col items-center flex-shrink-0 order-first sm:order-last" style={{ width: 88 }}>
                <div className="relative">
                  <UserAvatar src={user?.profileImage} firstName={user?.firstName || '?'} lastName="" size={72} className="border-4 border-white/30" />
                  <button
                    onClick={() => onboardingFileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-md hover:bg-gray-100 transition-all border-2 border-indigo-400 disabled:opacity-60">
                    {isUploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  </button>
                  <input ref={onboardingFileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </div>
                <p className="text-[11px] text-indigo-200 text-center mt-1.5">
                  {isUploadingImage ? 'Uploading...' : 'Add photo'}
                </p>
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
                  <Sparkles className="w-5 h-5 flex-shrink-0" />
                  <h2 className="text-base sm:text-lg font-bold leading-snug">Let&apos;s personalize your experience</h2>
                </div>
                <p className="text-indigo-100 text-sm">Fill in the required fields below, then you&apos;re all set!</p>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE BANNER (non-onboarding) */}
        {!onboardingMode && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
            <div className="h-[100px] sm:h-[120px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-400"></div>
            <div className="px-4 sm:px-8 pb-5 relative">
              {/* ✅ Edit Profile button anchored to top-right of white card — clear of the banner overlap */}
              <div className="absolute top-3 right-4 sm:right-8">
                <button onClick={() => setActiveTab('edit')}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /><span className="hidden sm:inline">Edit Profile</span><span className="sm:hidden">Edit</span>
                </button>
              </div>
              {/* Avatar pulls up over banner, Edit button is now independent */}
              <div className="relative -mt-12 sm:-mt-14 mb-3 w-fit">
                <UserAvatar src={user?.profileImage} firstName={user?.firstName} lastName={user?.lastName} size={88} className="border-4 border-white shadow-lg" />
                <button
                  onClick={() => profileFileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="absolute bottom-1 right-1 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-indigo-700 transition-all border-2 border-white disabled:opacity-60">
                  {isUploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                </button>
                <input ref={profileFileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>
              {isUploadingImage && (
                <p className="text-xs text-indigo-500 mb-2 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Uploading photo...
                </p>
              )}
              <h2 className="text-xl font-bold text-gray-900">{user?.firstName} {user?.lastName}</h2>
              <p className="text-sm text-gray-500 mt-0.5 break-all">{user?.email}</p>
              {/* ✅ Info chips — wrap on mobile */}
              <div className="flex items-center gap-3 mt-3 text-sm text-gray-600 flex-wrap">
                {user?.degree && <span className="flex items-center gap-1"><span>🎓</span> {user.degree}</span>}
                {user?.major && <span className="flex items-center gap-1"><span>📚</span> {user.major}</span>}
                {user?.academicStanding && <span className="flex items-center gap-1"><span>📊</span> {user.academicStanding}</span>}
                {user?.hometown && <span className="flex items-center gap-1"><span>📍</span> {user.hometown}</span>}
              </div>
              {user?.bio && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{user.bio}</p>}
              {displayInterests.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {displayInterests.map((tag, i) => (
                    <span key={i} className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1 font-medium">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        {!onboardingMode && (
          <div className="flex gap-1 mb-5 border-b border-gray-200">
            <button onClick={() => setActiveTab('activity')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${activeTab === 'activity' ? 'text-gray-900 border-gray-900' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
              style={{ minHeight: 44 }}>
              Activity
            </button>
            <button onClick={() => setActiveTab('edit')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${activeTab === 'edit' ? 'text-gray-900 border-gray-900' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
              style={{ minHeight: 44 }}>
              Edit Info
            </button>
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && !onboardingMode && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button onClick={() => router.push('/home/campus-talks?tab=my')} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 flex flex-col items-center text-center hover:shadow-md hover:border-indigo-200 transition-all">
              <div className="w-11 h-11 rounded-full bg-orange-50 flex items-center justify-center mb-3"><MessageCircle className="w-5 h-5 text-orange-500" /></div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.questionsAsked}</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Questions Asked</p>
            </button>
            <button onClick={() => router.push('/home/campus-talks?tab=answered')} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 flex flex-col items-center text-center hover:shadow-md hover:border-indigo-200 transition-all">
              <div className="w-11 h-11 rounded-full bg-teal-50 flex items-center justify-center mb-3"><CheckCircle className="w-5 h-5 text-teal-500" /></div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.answersGiven}</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">My Responses</p>
            </button>
          </div>
        )}

        {/* EDIT / ONBOARDING FORM */}
        {activeTab === 'edit' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            {/* ✅ Header — stack on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                {onboardingMode ? 'Your Academic Profile' : 'Edit Your Information'}
              </h3>
              <div className="flex items-center gap-2">
                {!onboardingMode && (
                  <button onClick={() => setActiveTab('activity')}
                    className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1.5 transition-all border border-gray-200 rounded-lg"
                    style={{ minHeight: 40 }}>
                    <X className="w-4 h-4" /> Cancel
                  </button>
                )}
                <button onClick={handleSave} disabled={isSaving}
                  className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ minHeight: 40 }}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : onboardingMode ? <Sparkles className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {onboardingMode ? 'Save & Enter' : 'Save Changes'}
                </button>
              </div>
            </div>

            {errors.general && (
              <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errors.general}
              </div>
            )}
            {saveSuccess && (
              <div className="mb-5 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" /> Profile updated successfully!
              </div>
            )}

            {/* ✅ All grids use grid-cols-1 on mobile, 2-col on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <FormField label="First Name" required error={errors.firstName}>
                <input type="text" value={editForm.firstName} onChange={(e) => updateField('firstName', e.target.value)}
                  placeholder="John" className={inputClass(errors.firstName)} style={{ fontSize: 16, colorScheme: 'light', color: '#111827', backgroundColor: 'white' }} />
              </FormField>
              <FormField label="Last Name" required error={errors.lastName}>
                <input type="text" value={editForm.lastName} onChange={(e) => updateField('lastName', e.target.value)}
                  placeholder="Doe" className={inputClass(errors.lastName)} style={{ fontSize: 16, colorScheme: 'light', color: '#111827', backgroundColor: 'white' }} />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <FormField label="Degree" required error={errors.degree}>
                <select value={editForm.degree} onChange={(e) => { updateField('degree', e.target.value); updateField('academicStanding', '') }}
                  className={inputClass(errors.degree) + ' bg-white'} style={{ fontSize: 16, colorScheme: 'light', color: '#111827', backgroundColor: 'white' }}>
                  <option value="">Select degree</option>
                  <option value="Undergraduate">Undergraduate</option>
                  <option value="Graduate">Graduate</option>
                  <option value="Other">Other</option>
                </select>
              </FormField>
              <FormField label="Major" required error={errors.major}>
                <MajorDropdown value={editForm.major} onChange={(val) => { updateField('major', val); if (val !== 'Other') updateField('customMajor', '') }} error={errors.major} />
              </FormField>
            </div>

            {editForm.degree === 'Other' && (
              <div className="mb-5">
                <FormField label="Enter your degree" required error={errors.customDegree}>
                  <input type="text" value={editForm.customDegree} onChange={(e) => updateField('customDegree', e.target.value)}
                    placeholder="e.g., Doctorate, Post-Baccalaureate" className={inputClass(errors.customDegree)} style={{ fontSize: 16, colorScheme: 'light', color: '#111827', backgroundColor: 'white' }} />
                </FormField>
              </div>
            )}

            {editForm.major === 'Other' && (
              <div className="mb-5">
                <FormField label="Enter your major" required error={errors.customMajor}>
                  <input type="text" value={editForm.customMajor} onChange={(e) => updateField('customMajor', e.target.value)}
                    placeholder="Enter full abbreviation of your major" className={inputClass(errors.customMajor)} style={{ fontSize: 16, colorScheme: 'light', color: '#111827', backgroundColor: 'white' }} />
                </FormField>
              </div>
            )}

            <div className="mb-5">
              <FormField label="Minor" optional>
                <input type="text" value={editForm.minor} onChange={(e) => updateField('minor', e.target.value)}
                  placeholder="e.g., Statistics" className={inputClass()} style={{ fontSize: 16, colorScheme: 'light', color: '#111827', backgroundColor: 'white' }} />
              </FormField>
            </div>

            {/* ✅ 3-col grid → 1-col on mobile, 3-col on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <FormField label="Enrollment Semester" required error={errors.semester}>
                <select value={editForm.semester} onChange={(e) => updateField('semester', e.target.value)}
                  className={inputClass(errors.semester) + ' bg-white'} style={{ fontSize: 16, colorScheme: 'light', color: '#111827', backgroundColor: 'white' }}>
                  <option value="">Select</option>
                  <option value="Fall">Fall</option>
                  <option value="Spring">Spring</option>
                  <option value="Summer">Summer</option>
                </select>
              </FormField>
              <FormField label="Enrollment Year" required error={errors.year}>
                <select value={editForm.year} onChange={(e) => updateField('year', e.target.value)}
                  className={inputClass(errors.year) + ' bg-white'} style={{ fontSize: 16, colorScheme: 'light', color: '#111827', backgroundColor: 'white' }}>
                  <option value="">Select</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </FormField>
              {(editForm.degree === 'Undergraduate' || editForm.degree === 'Graduate') && (
                <FormField label="Academic Standing" required error={errors.academicStanding}>
                  <select value={editForm.academicStanding} onChange={(e) => updateField('academicStanding', e.target.value)}
                    className={inputClass(errors.academicStanding) + ' bg-white'} style={{ fontSize: 16, colorScheme: 'light', color: '#111827', backgroundColor: 'white' }}>
                    <option value="">Select</option>
                    {standingOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormField>
              )}
            </div>

            <div className="mb-5">
              <FormField label="Hometown" optional>
                <input type="text" value={editForm.hometown} onChange={(e) => updateField('hometown', e.target.value)}
                  placeholder="City, Country" className={inputClass()} style={{ fontSize: 16, colorScheme: 'light', color: '#111827', backgroundColor: 'white' }} />
              </FormField>
            </div>

            <div className="mb-6">
              <FormField label="Bio" optional>
                <textarea value={editForm.bio} onChange={(e) => updateField('bio', e.target.value)}
                  placeholder="I am good at music, love hiking on weekends..." rows={3}
                  className={inputClass() + ' resize-none'} style={{ fontSize: 16, colorScheme: 'light', color: '#111827', backgroundColor: 'white' }} />
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
              {/* ✅ Interest buttons — 44px+ tap targets */}
              <div className="flex flex-wrap gap-2 mt-2">
                {INTEREST_OPTIONS.map(interest => {
                  const isSelected = selectedInterests.includes(interest)
                  return (
                    <button key={interest} onClick={() => toggleInterest(interest)}
                      className={`px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                        isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                      style={{ minHeight: 40 }}>
                      {isSelected && <span className="mr-1">✓</span>}
                      {interest}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Bottom safe area padding for iPhone home bar */}
        <div style={{ height: 'max(16px, env(safe-area-inset-bottom))' }} />
      </div>
    </div>
  )
}

function FormField({ label, required, optional, error, children }: {
  label: string; required?: boolean; optional?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
        {optional && <span className="text-xs text-gray-400 font-normal ml-1">(optional)</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  )
}

function inputClass(error?: string) {
  // ✅ Explicit bg-white + text-gray-900 + color-scheme:light prevents browser dark mode
  // from making text invisible (white text on white bg or dark bg with dark text).
  // This must be hardcoded via style — Tailwind classes alone can be overridden by
  // the user's OS/browser theme if the browser injects its own color scheme.
  return `w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-1 transition-all text-gray-900 bg-white ${
    error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
  }`
}