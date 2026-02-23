'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Plus,
  AlertCircle,
  Loader2,
  LogOut,
  Bell,
  Users,
  Calendar,
  Send,
  LayoutList,
  Megaphone,
  MessageSquare,
  Home,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────
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

interface GroupMember {
  id: string
  userId: string
  role: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    university?: string
    profileImage?: string
  }
}

interface Message {
  id: string
  content: string
  groupId: string
  userId: string
  user: {
    id: string
    firstName: string
    lastName: string
    email?: string
    profileImage?: string
  }
  createdAt: string
}

interface Group {
  id: string
  name: string
  description?: string
  icon?: string
  type?: string
  isDefault?: boolean
  university?: string
  members: GroupMember[]
  messages: Message[]
}

// ─── Avatar Component (reusable) ─────────────────────────────────
function UserAvatar({
  src,
  firstName,
  lastName,
  size = 36,
  className = '',
}: {
  src?: string | null
  firstName?: string
  lastName?: string
  size?: number
  className?: string
}) {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`

  if (src) {
    return (
      <img
        src={src}
        alt={`${firstName} ${lastName}`}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  )
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
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupForm, setGroupForm] = useState({ name: '', description: '' })
  const [groupErrors, setGroupErrors] = useState<Record<string, string>>({})
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load user + groups on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const userStr = localStorage.getItem('user')
        if (!userStr) {
          router.push('/auth')
          return
        }

        const currentUser = JSON.parse(userStr) as User
        setUser(currentUser)

        const groupsRes = await fetch(`/api/groups?userId=${currentUser.id}`)
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json()
          setGroups(groupsData.groups || [])
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router])

  // Load messages for a group
  const loadMessages = async (groupId: string) => {
    setIsLoadingMessages(true)
    try {
      const res = await fetch(`/api/messages?groupId=${groupId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error('Error loading messages:', err)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedChat || !user) return

    setIsSendingMessage(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMessage,
          groupId: selectedChat.id,
          userId: user.id,
        }),
      })

      if (res.ok) {
        setNewMessage('')
        loadMessages(selectedChat.id)
      }
    } catch (err) {
      console.error('Error sending message:', err)
    } finally {
      setIsSendingMessage(false)
    }
  }

  // Create group
  const handleCreateGroup = async () => {
    const newErrors: Record<string, string> = {}
    if (!groupForm.name.trim()) newErrors.name = 'This field is required.'
    if (!groupForm.description.trim()) newErrors.description = 'This field is required.'
    setGroupErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setIsCreating(true)
    try {
      const res = await fetch('/api/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupForm.name,
          description: groupForm.description,
          userId: user?.id,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setGroups((prev) => [...prev, data.group])
        setShowCreateGroup(false)
        setGroupForm({ name: '', description: '' })
        setGroupErrors({})
      }
    } catch (err) {
      console.error('Error creating group:', err)
    } finally {
      setIsCreating(false)
    }
  }

  // Select chat
  const handleSelectChat = (group: Group) => {
    setSelectedChat(group)
    loadMessages(group.id)
  }

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/auth')
  }

  // Search filter
  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Loading screen
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading Campus Arena...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ===== LEFT SIDEBAR ===== */}
      <aside className="w-[210px] bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">CA</span>
            </div>
            <span className="font-bold text-[15px] text-gray-900">Campus Arena</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pt-2 space-y-0.5">
          <NavItem icon={<LayoutList className="w-[18px] h-[18px]" />} label="CAMP" />
          <NavItem icon={<Home className="w-[18px] h-[18px]" />} label="Dashboard" />
          <NavItem icon={<MessageSquare className="w-[18px] h-[18px]" />} label="Chat" active />
          <NavItem icon={<Megaphone className="w-[18px] h-[18px]" />} label="Campus Talks" />
          <NavItem icon={<Calendar className="w-[18px] h-[18px]" />} label="Events" />
          <NavItem icon={<Users className="w-[18px] h-[18px]" />} label="Clubs" />
          <NavItem icon={<Search className="w-[18px] h-[18px]" />} label="Lost & Found" />
        </nav>

        {/* Logout at bottom */}
        <div className="px-3 py-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all text-sm font-medium"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ===== MIDDLE PANEL ===== */}
      <aside className="w-[340px] bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Chat</h2>

          {/* Tabs */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all border ${
                activeTab === 'groups'
                  ? 'text-indigo-600 border-gray-300 bg-white'
                  : 'text-gray-500 border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              Groups
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 text-[11px] font-bold rounded-full bg-indigo-600 text-white">
                {groups.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('dms')}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all border ${
                activeTab === 'dms'
                  ? 'text-indigo-600 border-gray-300 bg-white'
                  : 'text-gray-500 border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              DMs
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 text-[11px] font-bold rounded-full bg-indigo-600 text-white">
                1
              </span>
            </button>
          </div>

          {/* Create Group Button */}
          {activeTab === 'groups' && (
            <button
              onClick={() => setShowCreateGroup(true)}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Group
            </button>
          )}
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Groups / DMs List */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeTab === 'groups' && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">GROUPS</p>
                <span className="text-[11px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 font-medium">{filteredGroups.length}</span>
              </div>

              <div className="space-y-2">
                {filteredGroups.map((group) => {
                  const isSelected = selectedChat?.id === group.id
                  return (
                    <button
                      key={group.id}
                      onClick={() => handleSelectChat(group)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                          : 'bg-white text-gray-900 border border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-indigo-500' : 'bg-indigo-600'
                      }`}>
                        <Users className="w-5 h-5 text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${
                          isSelected ? 'text-white' : 'text-gray-900'
                        }`}>
                          {group.name}
                        </p>
                        <p className={`text-xs truncate mt-0.5 ${
                          isSelected ? 'text-indigo-200' : 'text-gray-500'
                        }`}>
                          {group.description || 'No description'}
                        </p>
                      </div>

                      <span className={`text-[11px] font-bold rounded-full min-w-[28px] h-[28px] flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white'
                      }`}>
                        {group.members?.length || 0}
                      </span>
                    </button>
                  )
                })}

                {filteredGroups.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-8">
                    {searchQuery ? 'No groups match your search' : 'No groups yet. Create one!'}
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'dms' && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">DIRECT MESSAGES</p>
              </div>
              <p className="text-sm text-gray-400 text-center py-8">No messages yet</p>
            </div>
          )}
        </div>
      </aside>

      {/* ===== MAIN CHAT AREA ===== */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {/* Top Bar */}
        <div className="h-[60px] border-b border-gray-200 px-6 flex items-center justify-between flex-shrink-0">
          <div>
            {selectedChat ? (
              <div>
                <h1 className="text-[15px] font-semibold text-gray-900">{selectedChat.name}</h1>
                <p className="text-xs text-gray-500 mt-0.5">{selectedChat.description}</p>
              </div>
            ) : null}
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <button className="relative p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-all">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <UserAvatar
                src={user.profileImage}
                firstName={user.firstName}
                lastName={user.lastName}
                size={36}
                className="border-2 border-gray-100"
              />
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {selectedChat ? (
            isLoadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
            ) : messages.length > 0 ? (
              <div className="space-y-5">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex gap-3">
                    <UserAvatar
                      src={msg.user.profileImage}
                      firstName={msg.user.firstName}
                      lastName={msg.user.lastName}
                      size={36}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-sm">
                          {msg.user.firstName} {msg.user.lastName}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Send className="w-14 h-14 mb-4 text-gray-200" />
                <p className="text-base font-semibold text-gray-500">No messages yet</p>
                <p className="text-sm text-gray-400 mt-1">Start the conversation!</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Send className="w-14 h-14 mb-4 text-gray-200" />
              <p className="text-base font-semibold text-gray-500">Select a conversation</p>
              <p className="text-sm text-gray-400 mt-1">Choose a group or DM to start chatting</p>
            </div>
          )}
        </div>

        {/* Message Input */}
        {selectedChat && (
          <div className="border-t border-gray-200 px-6 py-3.5 flex-shrink-0">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm bg-white"
                disabled={isSendingMessage}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSendingMessage}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {isSendingMessage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ===== CREATE GROUP MODAL ===== */}
      {showCreateGroup && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateGroup(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-5">Create a Group</h2>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Group Name</label>
              <input
                type="text"
                value={groupForm.name}
                onChange={(e) => {
                  setGroupForm((prev) => ({ ...prev, name: e.target.value }))
                  if (groupErrors.name) setGroupErrors((prev) => ({ ...prev, name: '' }))
                }}
                placeholder="e.g., Study Group"
                className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                  groupErrors.name ? 'border-red-300 bg-red-50/50' : 'border-gray-300'
                }`}
              />
              {groupErrors.name && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {groupErrors.name}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
              <textarea
                value={groupForm.description}
                onChange={(e) => {
                  setGroupForm((prev) => ({ ...prev, description: e.target.value }))
                  if (groupErrors.description) setGroupErrors((prev) => ({ ...prev, description: '' }))
                }}
                placeholder="What's this group about?"
                rows={3}
                className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none ${
                  groupErrors.description ? 'border-red-300 bg-red-50/50' : 'border-gray-300'
                }`}
              />
              {groupErrors.description && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {groupErrors.description}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateGroup(false)
                  setGroupErrors({})
                  setGroupForm({ name: '', description: '' })
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition-all font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={isCreating}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── NavItem Component ──────────────────────────────────────────
function NavItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
        active
          ? 'bg-indigo-50 text-indigo-600'
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <span className="flex items-center justify-center w-5 h-5">{icon}</span>
      <span>{label}</span>
    </button>
  )
}