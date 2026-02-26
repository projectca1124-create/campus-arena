'use client'


import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import NotificationBell from '@/components/NotificationBell'
import {
  Search, Plus, AlertCircle, Loader2, LogOut, Bell, Users, Calendar, Send,
  LayoutList, Megaphone, MessageSquare, Home, X, Paperclip, Image as ImageIcon,
  Smile, Info, MoreVertical, MessageCircle,
} from 'lucide-react'


// ─── Types ───────────────────────────────────────────────────────
interface User {
  id: string; email: string; firstName: string; lastName: string
  university?: string; major?: string; semester?: string; year?: string; profileImage?: string
}
interface GroupMember {
  id: string; userId: string; role: string
  user: { id: string; email: string; firstName: string; lastName: string; university?: string; profileImage?: string; major?: string; semester?: string; year?: string }
}
interface Reaction { id: string; emoji: string; messageId: string; userId: string; user: { id: string; firstName: string; lastName: string } }
interface Message {
  id: string; content: string; groupId: string; userId: string
  user: { id: string; firstName: string; lastName: string; email?: string; profileImage?: string }
  reactions?: Reaction[]; createdAt: string
}
interface Group {
  id: string; name: string; description?: string; icon?: string; type?: string
  isDefault?: boolean; university?: string; members: GroupMember[]; messages: Message[]
}
interface DMConversation {
  user: { id: string; firstName: string; lastName: string; profileImage?: string; major?: string; year?: string }
  lastMessage: string; lastMessageAt: string; unreadCount: number
}
interface DMMessage {
  id: string; content: string; senderId: string; receiverId: string; createdAt: string
  sender: { id: string; firstName: string; lastName: string; profileImage?: string }
  receiver: { id: string; firstName: string; lastName: string; profileImage?: string }
}
interface Classmate {
  id: string; firstName: string; lastName: string; major?: string; semester?: string
  year?: string; funFact?: string; profileImage?: string; university?: string
}


const EMOJI_OPTIONS = ['👍', '❤️', '🤗', '😂', '🔥', '👏']


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


function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
}


// ─── Group Initials (for info panel icon) ────────────────────────
function getGroupInitials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}


// ─── Main Component ──────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)


  const [user, setUser] = useState<User | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedChat, setSelectedChat] = useState<Group | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [activeTab, setActiveTab] = useState<'groups' | 'dms'>('groups')
  const [searchQuery, setSearchQuery] = useState('')


  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupForm, setGroupForm] = useState({ name: '', description: '' })
  const [groupErrors, setGroupErrors] = useState<Record<string, string>>({})
  const [isCreating, setIsCreating] = useState(false)


  const [dmConversations, setDmConversations] = useState<DMConversation[]>([])
  const [selectedDM, setSelectedDM] = useState<DMConversation | null>(null)
  const [dmMessages, setDmMessages] = useState<DMMessage[]>([])
  const [newDMMessage, setNewDMMessage] = useState('')
  const [isSendingDM, setIsSendingDM] = useState(false)


  const [showPingModal, setShowPingModal] = useState(false)
  const [pingSearchQuery, setPingSearchQuery] = useState('')
  const [pingClassmates, setPingClassmates] = useState<Classmate[]>([])
  const [isLoadingPing, setIsLoadingPing] = useState(false)


  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)


  // Group Info panel
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberYearFilter, setMemberYearFilter] = useState('')
  const [memberSemesterFilter, setMemberSemesterFilter] = useState('')
  const [showLogoutModal, setShowLogoutModal] = useState(false)


  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, dmMessages])


  useEffect(() => {
    const loadData = async () => {
      try {
        const userStr = localStorage.getItem('user')
        if (!userStr) { router.push('/auth'); return }
        const currentUser = JSON.parse(userStr) as User
        setUser(currentUser)
        const groupsRes = await fetch(`/api/groups?userId=${currentUser.id}`)
        if (groupsRes.ok) { const d = await groupsRes.json(); setGroups(d.groups || []) }
        const dmRes = await fetch(`/api/dm?userId=${currentUser.id}`)
        if (dmRes.ok) { const d = await dmRes.json(); setDmConversations(d.conversations || []) }
      } catch (err) { console.error('Error:', err) }
      finally { setIsLoading(false) }
    }
    loadData()
  }, [router])


  const loadMessages = async (groupId: string) => {
    setIsLoadingMessages(true)
    try { const res = await fetch(`/api/messages?groupId=${groupId}`); if (res.ok) { const d = await res.json(); setMessages(d.messages || []) } }
    catch (err) { console.error('Error:', err) }
    finally { setIsLoadingMessages(false) }
  }


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedChat || !user) return
    setIsSendingMessage(true)
    try {
      const res = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage, groupId: selectedChat.id, userId: user.id }) })
      if (res.ok) { setNewMessage(''); loadMessages(selectedChat.id) }
    } catch (err) { console.error('Error:', err) }
    finally { setIsSendingMessage(false) }
  }


  const handleCreateGroup = async () => {
    const errs: Record<string, string> = {}
    if (!groupForm.name.trim()) errs.name = 'Required.'
    if (!groupForm.description.trim()) errs.description = 'Required.'
    setGroupErrors(errs)
    if (Object.keys(errs).length > 0) return
    setIsCreating(true)
    try {
      const res = await fetch('/api/groups/create', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupForm.name, description: groupForm.description, userId: user?.id }) })
      if (res.ok) { const d = await res.json(); setGroups(p => [...p, d.group]); setShowCreateGroup(false); setGroupForm({ name: '', description: '' }); setGroupErrors({}) }
    } catch (err) { console.error('Error:', err) }
    finally { setIsCreating(false) }
  }


  const handleSelectChat = (group: Group) => {
    setSelectedChat(group); setSelectedDM(null); setShowGroupInfo(false); loadMessages(group.id)
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return; setShowEmojiPicker(null)
    try {
      const res = await fetch('/api/messages/reactions', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, userId: user.id, emoji }) })
      if (res.ok && selectedChat) { loadMessages(selectedChat.id) }
    } catch (err) { console.error('Error:', err) }
  }


  const loadDMMessages = async (otherUserId: string) => {
    if (!user) return; setIsLoadingMessages(true)
    try { const res = await fetch(`/api/dm?userId=${user.id}&otherUserId=${otherUserId}`); if (res.ok) { const d = await res.json(); setDmMessages(d.messages || []) } }
    catch (err) { console.error('Error:', err) }
    finally { setIsLoadingMessages(false) }
  }
  const handleSelectDM = (conv: DMConversation) => {
    setSelectedDM(conv); setSelectedChat(null); setShowGroupInfo(false); loadDMMessages(conv.user.id)
    setDmConversations(p => p.map(c => c.user.id === conv.user.id ? { ...c, unreadCount: 0 } : c))
  }
  const handleSendDM = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDMMessage.trim() || !selectedDM || !user) return; setIsSendingDM(true)
    try {
      const res = await fetch('/api/dm', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newDMMessage, senderId: user.id, receiverId: selectedDM.user.id }) })
      if (res.ok) { setNewDMMessage(''); loadDMMessages(selectedDM.user.id) }
    } catch (err) { console.error('Error:', err) }
    finally { setIsSendingDM(false) }
  }
  const handleStartDM = (classmate: Classmate) => {
    setShowPingModal(false); setActiveTab('dms')
    const existing = dmConversations.find(c => c.user.id === classmate.id)
    if (existing) { handleSelectDM(existing) } else {
      setSelectedDM({ user: { id: classmate.id, firstName: classmate.firstName, lastName: classmate.lastName, profileImage: classmate.profileImage, major: classmate.major, year: classmate.year }, lastMessage: '', lastMessageAt: new Date().toISOString(), unreadCount: 0 })
      setSelectedChat(null); setDmMessages([])
    }
  }


  const openPingModal = () => { setShowPingModal(true); setPingSearchQuery(''); loadPingClassmates('') }
  const loadPingClassmates = async (search: string) => {
    if (!user) return; setIsLoadingPing(true)
    try { const res = await fetch(`/api/classmates?userId=${user.id}&search=${encodeURIComponent(search)}`); if (res.ok) { const d = await res.json(); setPingClassmates(d.students || []) } }
    catch (err) { console.error('Error:', err) }
    finally { setIsLoadingPing(false) }
  }
  useEffect(() => { if (showPingModal) { const t = setTimeout(() => loadPingClassmates(pingSearchQuery), 300); return () => clearTimeout(t) } }, [pingSearchQuery, showPingModal])


  const handleLogout = () => { setShowLogoutModal(true) }
  const confirmLogout = () => { localStorage.removeItem('user'); router.push('/auth') }
  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredDMs = dmConversations.filter(c => `${c.user.firstName} ${c.user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()))
  const totalUnread = dmConversations.reduce((s, c) => s + c.unreadCount, 0)


  const groupReactions = (reactions: Reaction[] = []) => {
    const map: Record<string, { count: number; userReacted: boolean }> = {}
    for (const r of reactions) { if (!map[r.emoji]) map[r.emoji] = { count: 0, userReacted: false }; map[r.emoji].count++; if (r.userId === user?.id) map[r.emoji].userReacted = true }
    return map
  }


  // ─── Group Info helpers ──────────────────────────────────────
  const getGroupMembers = () => {
    if (!selectedChat) return []
    let members = selectedChat.members || []
    if (memberSearch) {
      const q = memberSearch.toLowerCase()
      members = members.filter(m =>
        `${m.user.firstName} ${m.user.lastName}`.toLowerCase().includes(q) ||
        m.user.major?.toLowerCase().includes(q)
      )
    }
    if (memberYearFilter) { members = members.filter(m => m.user.year === memberYearFilter) }
    if (memberSemesterFilter) { members = members.filter(m => m.user.semester === memberSemesterFilter) }
    return members
  }


  const getAvailableYears = () => {
    if (!selectedChat) return []
    return [...new Set(selectedChat.members?.map(m => m.user.year).filter(Boolean) as string[])]
  }


  const getAvailableSemesters = () => {
    if (!selectedChat) return []
    return [...new Set(selectedChat.members?.map(m => m.user.semester).filter(Boolean) as string[])]
  }


  const toggleGroupInfo = () => {
    setShowGroupInfo(p => !p)
    setMemberSearch('')
    setMemberYearFilter('')
    setMemberSemesterFilter('')
  }


  if (isLoading) return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500 text-sm">Loading Campus Arena...</p>
      </div>
    </div>
  )


  const isGroupMode = selectedChat !== null
  const isDMMode = selectedDM !== null
  const filteredMembers = getGroupMembers()


  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" onClick={() => setShowEmojiPicker(null)}>


      {/* ===== LEFT SIDEBAR ===== */}
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
          <NavItem icon={<MessageSquare className="w-[18px] h-[18px]" />} label="Chat" active />
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


      {/* ===== MIDDLE PANEL ===== */}
      <aside className="w-[340px] bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-5 pt-5 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Chat</h2>
          <div className="relative flex mb-4 bg-gray-100 rounded-xl p-1">
            <div className="absolute top-1 bottom-1 rounded-lg bg-indigo-600 shadow-md transition-all duration-300 ease-in-out" style={{ width: 'calc(50% - 4px)', left: activeTab === 'groups' ? '4px' : 'calc(50% + 0px)' }}></div>
            <button onClick={() => setActiveTab('groups')} className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-300 ${activeTab === 'groups' ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              Groups{groups.reduce((sum, g) => sum + (g.messages?.length || 0), 0) > 0 ? ` (${groups.reduce((sum, g) => sum + (g.messages?.length || 0), 0)})` : ''}
            </button>
            <button onClick={() => setActiveTab('dms')} className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-300 ${activeTab === 'dms' ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              DMs{totalUnread > 0 ? ` (${totalUnread})` : ''}
            </button>
          </div>
        
        </div>
        <div className="px-5 py-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeTab === 'groups' && (
            <div>
           <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">GROUPS ({filteredGroups.length})</p>
                <button onClick={() => setShowCreateGroup(true)} className="text-[12px] text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-0.5"><Plus className="w-3.5 h-3.5" />Group</button>
              </div>
              <div className="space-y-2">
                {filteredGroups.map(group => {
                  const isSel = selectedChat?.id === group.id
                  return (
                    <button key={group.id} onClick={() => handleSelectChat(group)} className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${isSel ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-gray-900 border border-gray-200 hover:border-indigo-300 hover:shadow-sm'}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isSel ? 'bg-indigo-500' : 'bg-indigo-600'}`}><Users className="w-5 h-5 text-white" /></div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${isSel ? 'text-white' : 'text-gray-900'}`}>{group.name}</p>
                        <p className={`text-xs truncate mt-0.5 ${isSel ? 'text-indigo-200' : 'text-gray-500'}`}>{group.description || 'No description'}</p>
                      </div>
                    {(group.messages?.length || 0) > 0 && !isSel && (
                            <span className="text-[11px] font-bold rounded-full min-w-[28px] h-[28px] flex items-center justify-center flex-shrink-0 bg-indigo-600 text-white">{group.messages?.length || 0}</span>
                     )}                    </button>
                  )
                })}
                {filteredGroups.length === 0 && <p className="text-center text-gray-400 text-sm py-8">{searchQuery ? 'No groups match' : 'No groups yet'}</p>}
              </div>
            </div>
          )}
          {activeTab === 'dms' && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">DMs ({filteredDMs.length})</p>
                <button onClick={() => router.push('/home/explore')} className="text-[12px] text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1"><Search className="w-3.5 h-3.5" />Classmates</button>
              </div>
              <div className="space-y-2">
                {filteredDMs.map(conv => {
                  const isSel = selectedDM?.user.id === conv.user.id
                  return (
                    <button key={conv.user.id} onClick={() => handleSelectDM(conv)} className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${isSel ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-gray-900 border border-gray-200 hover:border-indigo-300 hover:shadow-sm'}`}>
                      <UserAvatar src={conv.user.profileImage} firstName={conv.user.firstName} lastName={conv.user.lastName} size={40} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${isSel ? 'text-white' : 'text-gray-900'}`}>{conv.user.firstName} {conv.user.lastName}</p>
                        <p className={`text-xs truncate mt-0.5 ${isSel ? 'text-indigo-200' : 'text-gray-500'}`}>{conv.lastMessage || 'No messages yet'}</p>
                      </div>
                      {conv.unreadCount > 0 && <span className="text-[11px] font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center flex-shrink-0 bg-indigo-600 text-white">{conv.unreadCount}</span>}
                    </button>
                  )
                })}
                {filteredDMs.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No conversations yet</p>}
              </div>
            </div>
          )}
        </div>
      </aside>


      {/* ===== MAIN CHAT AREA ===== */}
      <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
        {/* Chat Header */}
        <div className="h-[64px] border-b border-gray-200 px-6 flex items-center justify-between flex-shrink-0 bg-white">
          <div className="flex items-center gap-3">
            {isGroupMode && selectedChat && (
              <>
                <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center"><Users className="w-5 h-5 text-white" /></div>
                <div><h1 className="text-[15px] font-bold text-gray-900">{selectedChat.name}</h1><p className="text-xs text-gray-500">{selectedChat.members?.length || 0} members</p></div>
              </>
            )}
            {isDMMode && selectedDM && (
              <>
                <UserAvatar src={selectedDM.user.profileImage} firstName={selectedDM.user.firstName} lastName={selectedDM.user.lastName} size={40} />
                <div><h1 className="text-[15px] font-bold text-gray-900">{selectedDM.user.firstName} {selectedDM.user.lastName}</h1>{selectedDM.user.major && <p className="text-xs text-gray-500">{selectedDM.user.major}{selectedDM.user.year ? ` • ${selectedDM.user.year}` : ''}</p>}</div>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isGroupMode && (
              <>
                <button onClick={toggleGroupInfo} className={`p-2 rounded-lg transition-all ${showGroupInfo ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-100 text-gray-400'}`}><Info className="w-[18px] h-[18px]" /></button>
                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-all"><MoreVertical className="w-[18px] h-[18px]" /></button>
              </>
            )}
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            <NotificationBell userId={user?.id || ''} />
             {user && <button onClick={() => router.push('/home/profile')}><UserAvatar src={user.profileImage} firstName={user.firstName} lastName={user.lastName} size={36} className="border-2 border-gray-100 ml-1 cursor-pointer" /></button>}          </div>
        </div>


        {/* Messages + Info Panel wrapper */}
        <div className="flex-1 flex overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {isGroupMode && selectedChat && (
                isLoadingMessages ? <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
                : messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map(msg => {
                      const isOwn = msg.userId === user?.id
                      const reactions = groupReactions(msg.reactions)
                      const reactionEntries = Object.entries(reactions)
                      return (
                        <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                          {!isOwn && <p className="text-xs font-semibold text-gray-500 mb-1 ml-12">{msg.user.firstName} {msg.user.lastName}</p>}
                          <div className={`flex gap-2.5 max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                            {!isOwn && <UserAvatar src={msg.user.profileImage} firstName={msg.user.firstName} lastName={msg.user.lastName} size={36} className="mt-1" />}
                            <div className="relative group/msg">
                              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isOwn ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'}`}>{msg.content}</div>
                              {reactionEntries.length > 0 && (
                                <div className={`flex gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                  {reactionEntries.map(([emoji, data]) => (
                                    <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji) }}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${data.userReacted ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                                      <span>{emoji}</span><span className="font-semibold">{data.count}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                              <div className={`absolute top-0 ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} opacity-0 group-hover/msg:opacity-100 transition-opacity px-1`}>
                                <button onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id) }}
                                  className="p-1 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-400 hover:text-gray-600"><Smile className="w-4 h-4" /></button>
                              </div>
                              {showEmojiPicker === msg.id && (
                                <div className={`absolute top-8 z-10 ${isOwn ? 'right-0' : 'left-0'} bg-white border border-gray-200 rounded-xl shadow-lg p-2 flex gap-1`} onClick={(e) => e.stopPropagation()}>
                                  {EMOJI_OPTIONS.map(emoji => (
                                    <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg transition-all">{emoji}</button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <p className={`text-[10px] text-gray-400 mt-1 ${isOwn ? 'mr-1' : 'ml-12'}`}>{formatTime(msg.createdAt)}</p>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                ) : <EmptyChat title="No messages yet" subtitle="Start the conversation!" />
              )}
              {isDMMode && selectedDM && (
                isLoadingMessages ? <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
                : dmMessages.length > 0 ? (
                  <div className="space-y-4">
                    {dmMessages.map(msg => {
                      const isOwn = msg.senderId === user?.id
                      return (
                        <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                          {!isOwn && <p className="text-xs font-semibold text-gray-500 mb-1 ml-12">{msg.sender.firstName} {msg.sender.lastName}</p>}
                          <div className={`flex gap-2.5 max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                            {!isOwn && <UserAvatar src={msg.sender.profileImage} firstName={msg.sender.firstName} lastName={msg.sender.lastName} size={36} className="mt-1" />}
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isOwn ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'}`}>{msg.content}</div>
                          </div>
                          <p className={`text-[10px] text-gray-400 mt-1 ${isOwn ? 'mr-1' : 'ml-12'}`}>{formatTime(msg.createdAt)}</p>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                ) : <EmptyChat title="No messages yet" subtitle={`Send a message to ${selectedDM.user.firstName}!`} />
              )}
              {!isGroupMode && !isDMMode && <EmptyChat title="Select a conversation" subtitle="Choose a group or DM to start chatting" />}
            </div>


            {/* Message Input */}
            {(isGroupMode || isDMMode) && (
              <div className="border-t border-gray-200 px-6 py-3 flex-shrink-0 bg-white">
                <form onSubmit={isGroupMode ? handleSendMessage : handleSendDM} className="flex items-center gap-2">
                  <button type="button" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"><Paperclip className="w-[18px] h-[18px]" /></button>
                  <button type="button" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"><ImageIcon className="w-[18px] h-[18px]" /></button>
                  <input type="text" value={isGroupMode ? newMessage : newDMMessage}
                    onChange={(e) => isGroupMode ? setNewMessage(e.target.value) : setNewDMMessage(e.target.value)}
                    placeholder={isDMMode && selectedDM ? `Message ${selectedDM.user.firstName}...` : 'Type a message...'}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition-all"
                    disabled={isSendingMessage || isSendingDM} />
                  <button type="button" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"><Smile className="w-[18px] h-[18px]" /></button>
                  <button type="submit" disabled={isGroupMode ? (!newMessage.trim() || isSendingMessage) : (!newDMMessage.trim() || isSendingDM)}
                    className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-all disabled:opacity-50">
                    {(isSendingMessage || isSendingDM) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              </div>
            )}
          </div>


          {/* ===== GROUP INFO PANEL ===== */}
          {showGroupInfo && isGroupMode && selectedChat && (
            <div className="w-[300px] bg-white border-l border-gray-200 flex flex-col flex-shrink-0 overflow-hidden">
              {/* Header */}
              <div className="h-[64px] border-b border-gray-200 px-5 flex items-center justify-between flex-shrink-0">
                <h3 className="text-sm font-bold text-gray-900">Group Info</h3>
                <button onClick={() => setShowGroupInfo(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-all"><X className="w-4 h-4" /></button>
              </div>


              {/* Group icon + name */}
              <div className="px-5 py-6 flex flex-col items-center border-b border-gray-200">
                <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center mb-3">
                  <span className="text-white font-bold text-lg">{getGroupInitials(selectedChat.name)}</span>
                </div>
                <h4 className="text-base font-bold text-gray-900 text-center">{selectedChat.name}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{selectedChat.members?.length || 0} members</p>
              </div>


              {/* Search members */}
              <div className="px-5 pt-4 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input type="text" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search members..."
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white" />
                </div>
              </div>


              {/* Filters */}
              <div className="px-5 py-2 flex gap-2">
                <select value={memberYearFilter} onChange={(e) => setMemberYearFilter(e.target.value)}
                  className="flex-1 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  style={{ appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: 24 }}>
                  <option value="">All Years</option>
                  {getAvailableYears().map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={memberSemesterFilter} onChange={(e) => setMemberSemesterFilter(e.target.value)}
                  className="flex-1 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  style={{ appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: 24 }}>
                  <option value="">All Semesters</option>
                  {getAvailableSemesters().map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>


              {/* Members list */}
              <div className="px-5 pt-2 pb-1">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">MEMBERS ({filteredMembers.length})</p>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-4">
                <div className="space-y-1">
                  {filteredMembers.map(member => (
                    <div key={member.id} className="flex items-center gap-3 py-2.5 rounded-lg hover:bg-gray-50 px-1 transition-all">
                      <UserAvatar src={member.user.profileImage} firstName={member.user.firstName} lastName={member.user.lastName} size={40} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{member.user.firstName} {member.user.lastName}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {member.user.major}{member.user.semester && member.user.year ? ` • ${member.user.semester} ${member.user.year}` : member.user.year ? ` • ${member.user.year}` : ''}
                        </p>
                      </div>
                      {member.user.id !== user?.id && (
                        <button onClick={() => handleStartDM({ id: member.user.id, firstName: member.user.firstName, lastName: member.user.lastName, profileImage: member.user.profileImage, major: member.user.major, year: member.user.year } as Classmate)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {filteredMembers.length === 0 && <p className="text-center text-gray-400 text-xs py-6">No members match</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* ===== CREATE GROUP MODAL ===== */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateGroup(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-5">Create a Group</h2>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Group Name</label>
              <input type="text" value={groupForm.name} onChange={e => { setGroupForm(p => ({ ...p, name: e.target.value })); if (groupErrors.name) setGroupErrors(p => ({ ...p, name: '' })) }}
                placeholder="e.g., Study Group" className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${groupErrors.name ? 'border-red-300' : 'border-gray-300'}`} />
              {groupErrors.name && <p className="text-xs text-red-500 flex items-center gap-1 mt-1.5"><AlertCircle className="w-3.5 h-3.5" />{groupErrors.name}</p>}
            </div>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
              <textarea value={groupForm.description} onChange={e => { setGroupForm(p => ({ ...p, description: e.target.value })); if (groupErrors.description) setGroupErrors(p => ({ ...p, description: '' })) }}
                placeholder="What's this group about?" rows={3} className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none ${groupErrors.description ? 'border-red-300' : 'border-gray-300'}`} />
              {groupErrors.description && <p className="text-xs text-red-500 flex items-center gap-1 mt-1.5"><AlertCircle className="w-3.5 h-3.5" />{groupErrors.description}</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowCreateGroup(false); setGroupErrors({}); setGroupForm({ name: '', description: '' }) }} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 font-semibold text-sm">Cancel</button>
              <button onClick={handleCreateGroup} disabled={isCreating} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ===== PING CLASSMATES MODAL ===== */}
      {showPingModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPingModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[500px] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Ping Classmates</h2>
              <button onClick={() => setShowPingModal(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={pingSearchQuery} onChange={e => setPingSearchQuery(e.target.value)} placeholder="Search students to message..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white" />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {isLoadingPing ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
              : pingClassmates.length > 0 ? pingClassmates.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-all">
                  <UserAvatar src={c.profileImage} firstName={c.firstName} lastName={c.lastName} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-gray-500">{c.major}{c.year ? ` • ${c.year}` : ''}</p>
                  </div>
                  <button onClick={() => handleStartDM(c)} className="px-4 py-1.5 border border-indigo-200 text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-all">Message</button>
                </div>
              )) : <p className="text-center text-gray-400 text-sm py-8">No classmates found</p>}
            </div>
          </div>
        </div>
      )}

      {/* ===== LOGOUT CONFIRMATION MODAL ===== */}
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
      
   


function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}>
      <span className="flex items-center justify-center w-5 h-5">{icon}</span><span>{label}</span>
    </button>
  )
}


function EmptyChat({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <Send className="w-14 h-14 mb-4 text-gray-200" /><p className="text-base font-semibold text-gray-500">{title}</p><p className="text-sm text-gray-400 mt-1">{subtitle}</p>
    </div>
  )
}
