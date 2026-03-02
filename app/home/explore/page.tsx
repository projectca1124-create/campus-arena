'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, Loader2 } from 'lucide-react'
import ProfileViewModal from '@/components/ProfileViewModal'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  university?: string
  major?: string
  semester?: string
  year?: string
  profileImage?: string
}

interface Classmate {
  id: string
  firstName: string
  lastName: string
  major?: string
  semester?: string
  year?: string
  funFact?: string
  interests?: string
  profileImage?: string
  university?: string
}

function UserAvatar({ src, firstName, lastName, size = 60, className = '' }: {
  src?: string | null; firstName?: string; lastName?: string; size?: number; className?: string
}) {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`
  if (src) {
    return <img src={src} alt={`${firstName} ${lastName}`} className={`rounded-full object-cover flex-shrink-0 ${className}`} style={{ width: size, height: size }} />
  }
  return (
    <div className={`rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {initials}
    </div>
  )
}

export default function ExploreClassmatesPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [classmates, setClassmates] = useState<Classmate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [majorFilter, setMajorFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [availableMajors, setAvailableMajors] = useState<string[]>([])
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [profileViewUserId, setProfileViewUserId] = useState<string | null>(null)
  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) { router.push('/auth'); return }
    const currentUser = JSON.parse(userStr) as User
    setUser(currentUser)
    loadClassmates(currentUser.id, '', '', '')
  }, [router])

  const loadClassmates = async (userId: string, search: string, major: string, year: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ userId })
      if (search) params.set('search', search)
      if (major) params.set('major', major)
      if (year) params.set('year', year)
      const res = await fetch(`/api/classmates?${params}`)
      if (res.ok) {
        const data = await res.json()
        setClassmates(data.students || [])
        setAvailableMajors(data.filters?.majors || [])
        setAvailableYears(data.filters?.years || [])
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    const timeout = setTimeout(() => loadClassmates(user.id, searchQuery, majorFilter, yearFilter), 300)
    return () => clearTimeout(timeout)
  }, [searchQuery, majorFilter, yearFilter])

  const handleConnect = (classmate: Classmate) => {
    sessionStorage.setItem('openDM', JSON.stringify({
      id: classmate.id,
      firstName: classmate.firstName,
      lastName: classmate.lastName,
      profileImage: classmate.profileImage,
      major: classmate.major,
      year: classmate.year,
    }))
    router.push('/home?openDM=' + classmate.id)
  }

  const getClassLabel = (semester?: string, year?: string) => {
    if (!semester || !year) return ''
    return `Class of ${semester} ${year}`
  }

  const getInterests = (classmate: Classmate) => {
    const source = classmate.interests || classmate.funFact || ''
    if (!source) return []
    return source.split(/[,;]/).map(s => s.trim()).filter(Boolean).slice(0, 4)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Explore Classmates</h2>
        <p className="text-gray-500 text-sm mt-1">Find students with shared interests</p>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, major, or interest..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900" />
        </div>
        <select value={majorFilter} onChange={(e) => setMajorFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none pr-8 min-w-[140px]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
          <option value="">All Majors</option>
          {availableMajors.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none pr-8 min-w-[120px]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
          <option value="">All Years</option>
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Count */}
      <p className="text-sm text-gray-500 mb-4">
        Showing <span className="font-bold text-gray-900">{classmates.length}</span> students
      </p>

      {/* Student Cards Grid — equal height tiles */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
      ) : classmates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {classmates.map((c) => {
            const interests = getInterests(c)
            const classLabel = getClassLabel(c.semester, c.year)
            return (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all flex flex-col h-full">
                <div className="flex items-start gap-4 mb-3">
                  <button onClick={() => setProfileViewUserId(c.id)} className="flex-shrink-0">
                    <UserAvatar src={c.profileImage} firstName={c.firstName} lastName={c.lastName} size={56} className="cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <button onClick={() => setProfileViewUserId(c.id)} className="text-base font-bold text-gray-900 hover:text-indigo-600 transition-colors text-left">{c.firstName} {c.lastName}</button>
                    {c.major && <p className="text-sm text-gray-600">{c.major}</p>}
                    {classLabel && <p className="text-xs text-gray-400 mt-0.5">{classLabel}</p>}
                  </div>
                </div>

                {/* Interest tags — fixed height so Connect button always aligns */}
                <div className="min-h-[36px] mb-3">
                  {interests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {interests.map((tag, i) => (
                        <span key={i} className="text-xs text-gray-600 bg-gray-100 rounded-full px-3 py-1">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={() => handleConnect(c)}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-all mt-auto">
                  Connect
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No classmates found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
        </div>
      )}

      <ProfileViewModal userId={profileViewUserId} onClose={() => setProfileViewUserId(null)} currentUserId={user?.id}
        onStartDM={(dmUser) => { router.push(`/home?openDM=${dmUser.id}&dmName=${encodeURIComponent(dmUser.firstName + ' ' + dmUser.lastName)}`) }} />
    </div>
  )
}