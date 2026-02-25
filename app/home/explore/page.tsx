'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Users,
  Calendar,
  LayoutList,
  Megaphone,
  MessageSquare,
  Home,
  LogOut,
  Bell,
  Loader2,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell';

interface User {
  id: string; email: string; firstName: string; lastName: string
  university?: string; major?: string; semester?: string; year?: string; profileImage?: string
}

interface Classmate {
  id: string; firstName: string; lastName: string; major?: string; semester?: string
  year?: string; funFact?: string; profileImage?: string; university?: string
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

  const handleConnect = (classmate: Classmate) => { router.push('/home') }
  const handleLogout = () => { localStorage.removeItem('user'); router.push('/auth') }

  const getClassLabel = (semester?: string, year?: string) => {
    if (!semester || !year) return ''
    return `Class of ${semester} ${year}`
  }

  const getInterests = (funFact?: string) => {
    if (!funFact) return []
    return funFact.split(/[,;]/).map(s => s.trim()).filter(Boolean).slice(0, 3)
  }

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
          <h1 className="text-[15px] font-semibold text-gray-900">Explore Classmates</h1>
          {user && (
            <div className="flex items-center gap-3">
              <NotificationBell userId={user?.id || ''} />
              <button onClick={() => router.push('/home/profile')}><UserAvatar src={user.profileImage} firstName={user.firstName} lastName={user.lastName} size={36} className="border-2 border-gray-100 cursor-pointer" /></button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Explore Classmates</h2>
            <p className="text-gray-500 text-sm mt-1">Find students with shared interests</p>
          </div>

          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, major, or interest..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
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

          <p className="text-sm text-gray-500 mb-4">
            Showing <span className="font-bold text-gray-900">{classmates.length}</span> students
          </p>

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
          ) : classmates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {classmates.map((c) => {
                const interests = getInterests(c.funFact)
                const classLabel = getClassLabel(c.semester, c.year)
                return (
                  <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all">
                    <div className="flex items-start gap-4 mb-4">
                      <UserAvatar src={c.profileImage} firstName={c.firstName} lastName={c.lastName} size={56} />
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-gray-900">{c.firstName} {c.lastName}</p>
                        {c.major && <p className="text-sm text-gray-600">{c.major}</p>}
                        {classLabel && <p className="text-xs text-gray-400 mt-0.5">{classLabel}</p>}
                      </div>
                    </div>
                    {interests.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {interests.map((tag, i) => (
                          <span key={i} className="text-xs text-gray-600 bg-gray-100 rounded-full px-3 py-1">{tag}</span>
                        ))}
                      </div>
                    )}
                    <button onClick={() => handleConnect(c)}
                      className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-all">
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
        </div>
      </div>
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