'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, Loader2 } from 'lucide-react'
import ProfileViewModal from '@/components/ProfileViewModal'

interface User {
  id: string; email: string; firstName: string; lastName: string
  university?: string; major?: string; semester?: string; year?: string; profileImage?: string
}
interface Classmate {
  id: string; firstName: string; lastName: string; major?: string; semester?: string
  year?: string; funFact?: string; interests?: string; profileImage?: string; university?: string
  academicStanding?: string
}

// Single standard color for all academic standings
function StandingBadge({ standing }: { standing: string }) {
  const s = standing.toLowerCase()
  const key = ['freshman', 'sophomore', 'junior', 'senior', 'alumni', 'graduate'].find(k => s.includes(k))
  const label = key ? key.charAt(0).toUpperCase() + key.slice(1) : standing
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: '0.03em', textTransform: 'uppercase' as const, opacity: 0.85 }}>
      {label}
    </span>
  )
}

function UserAvatar({ src, firstName, lastName, size = 60, className = '' }: {
  src?: string | null; firstName?: string; lastName?: string; size?: number; className?: string
}) {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`
  if (src) return <img src={src} alt={`${firstName} ${lastName}`} className={`rounded-full object-cover flex-shrink-0 ${className}`} style={{ width: size, height: size }} />
  return (
    <div className={`rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}>{initials}</div>
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
    } catch (err) { console.error('Error:', err) }
    finally { setIsLoading(false) }
  }

  useEffect(() => {
    if (!user) return
    const timeout = setTimeout(() => loadClassmates(user.id, searchQuery, majorFilter, yearFilter), 300)
    return () => clearTimeout(timeout)
  }, [searchQuery, majorFilter, yearFilter])

  const handleConnect = (classmate: Classmate) => {
    sessionStorage.setItem('openDM', JSON.stringify({
      id: classmate.id, firstName: classmate.firstName, lastName: classmate.lastName,
      profileImage: classmate.profileImage, major: classmate.major, year: classmate.year,
    }))
    router.push('/home?openDM=' + classmate.id + '&tab=dms')
  }

  const getInterests = (classmate: Classmate) => {
    const source = classmate.interests || classmate.funFact || ''
    if (!source) return []
    return source.split(/[,;]/).map(s => s.trim()).filter(Boolean).slice(0, 4)
  }

  const chevronSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 sm:px-6 py-4 sm:py-6">

        {/* Header */}
        <div className="mb-5">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Explore Classmates</h2>
          <p className="text-gray-500 text-sm mt-1">Find students with shared interests</p>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, major, or interest..."
              className="w-full pl-10 pr-4 bg-white border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              style={{ height: 44, fontSize: 16, colorScheme: 'light', color: '#111827', backgroundColor: 'white' }}
            />
          </div>
          <div className="flex gap-2 sm:gap-3">
            <select
              value={majorFilter}
              onChange={(e) => setMajorFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 sm:px-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none"
              style={{
                colorScheme: 'light', color: '#111827', backgroundColor: 'white',
                height: 44, fontSize: 16, minWidth: 0,
                paddingRight: 28,
                backgroundImage: chevronSvg,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
              }}
            >
              <option value="">All Majors</option>
              {availableMajors.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 sm:px-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none"
              style={{
                colorScheme: 'light', color: '#111827', backgroundColor: 'white',
                height: 44, fontSize: 16, minWidth: 0,
                paddingRight: 28,
                backgroundImage: chevronSvg,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
              }}
            >
              <option value="">All Years</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Count */}
        <p className="text-sm text-gray-500 mb-4">
          Showing <span className="font-bold text-gray-900">{classmates.length}</span> students
        </p>

        {/* Cards */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
        ) : classmates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {classmates.map((c) => {
              const interests = getInterests(c)
              return (
                <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <button onClick={() => setProfileViewUserId(c.id)} className="flex-shrink-0">
                      <UserAvatar src={c.profileImage} firstName={c.firstName} lastName={c.lastName} size={48}
                        className="cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => setProfileViewUserId(c.id)}
                        className="text-sm font-bold text-gray-900 hover:text-indigo-600 transition-colors text-left leading-tight w-full truncate block"
                      >
                        {c.firstName} {c.lastName}
                      </button>
                      <div style={{display:'flex',alignItems:'baseline',gap:5,marginTop:2}}>
                        {c.major && <span className="text-xs text-gray-500 truncate">{c.major}</span>}
                        {c.major && c.academicStanding && <span style={{color:'#d1d5db',fontSize:10,lineHeight:1}}>·</span>}
                        {c.academicStanding && <StandingBadge standing={c.academicStanding} />}
                      </div>
                    </div>
                  </div>

                  {interests.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3 min-h-[24px]">
                      {interests.map((tag, i) => (
                        <span key={i} className="text-xs text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">{tag}</span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => handleConnect(c)}
                    className="w-full bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-all mt-auto flex items-center justify-center"
                    style={{ minHeight: 40 }}
                  >
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

        <div style={{ height: 'max(16px, env(safe-area-inset-bottom))' }} />
      </div>

      <ProfileViewModal
        userId={profileViewUserId}
        onClose={() => setProfileViewUserId(null)}
        currentUserId={user?.id}
        onStartDM={(dmUser) => {
          sessionStorage.setItem('openDM', JSON.stringify({
            id: dmUser.id, firstName: dmUser.firstName,
            lastName: dmUser.lastName, profileImage: dmUser.profileImage,
          }))
          router.push(`/home?openDM=${dmUser.id}&tab=dms`)
        }}
      />
    </div>
  )
}