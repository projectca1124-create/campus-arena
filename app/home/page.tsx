'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  Plus,
  AlertCircle,
  Loader2,
  LogOut,
  Bell,
  MessageCircle,
  Users,
  Calendar,
  Home,
  Send,
  LayoutList,
} from 'lucide-react'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  university?: string
  major?: string
  semester?: string
  year?: string
}

interface Group {
  id: string
  name: string
  description?: string
  members: any[]
  type?: string
  isDefault?: boolean
}

interface Message {
  id: string
  content: string
  groupId: string
  user: {
    firstName: string
    lastName: string
  }
  createdAt: string
}

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedChat, setSelectedChat] = useState<Group | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMessage, setIsLoadingMessage] = useState(false)
  const [activeTab, setActiveTab] = useState<'groups' | 'dms'>('groups')
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupForm, setGroupForm] = useState({ name: '', description: '' })
  const [groupErrors, setGroupErrors] = useState<Record<string, string>>({})
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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

          if (groupsData.groups?.length > 0) {
            setSelectedChat(groupsData.groups[0])
            loadMessages(groupsData.groups[0].id)
          }
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router])

  const loadMessages = async (groupId: string) => {
    try {
      const res = await fetch(`/api/messages?groupId=${groupId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error('Error loading messages:', err)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedChat || !user) return

    setIsLoadingMessage(true)
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
      setIsLoadingMessage(false)
    }
  }

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
        const newGroup = await res.json()
        setGroups(prev => [...prev, newGroup.group])
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

  const handleSelectChat = (group: Group) => {
    setSelectedChat(group)
    loadMessages(group.id)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/auth')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Campus Arena...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* ===== LEFT SIDEBAR - PLATFORM NAV ===== */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo Section */}
        <div className="px-6 py-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CA</span>
            </div>
            <span className="font-bold text-gray-900">Campus Arena</span>
          </div>
        </div>

        {/* CAMP Section - Simple */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2 text-gray-600 hover:text-gray-900 cursor-pointer">
            <div className="w-5 h-5 flex items-center justify-center">
              <LayoutList className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">CAMP</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <NavLink icon={<Home className="w-5 h-5" />} label="Dashboard" />
          <NavLink icon={<LayoutList className="w-5 h-5" />} label="Chat" active />
          <NavLink icon={<Users className="w-5 h-5" />} label="Campus Talks" />
          <NavLink icon={<Calendar className="w-5 h-5" />} label="Events" />
          <NavLink icon={<Users className="w-5 h-5" />} label="Clubs" />
          <NavLink icon={<Search className="w-5 h-5" />} label="Lost & Found" />
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          {user && (
            <div className="bg-blue-50 rounded-lg p-3 text-sm">
              <p className="font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-gray-600 mt-1">{user.email}</p>
              {user.university && (
                <p className="text-xs text-blue-600 font-medium mt-2">🏫 {user.university}</p>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* ===== MIDDLE SIDEBAR - CHAT LIST ===== */}
      <aside className="w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Chat</h2>

          {/* Tabs */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setActiveTab('groups')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === 'groups'
                  ? 'bg-white text-indigo-600 border border-gray-300'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              Groups
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-indigo-600 text-white">
                {groups.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('dms')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === 'dms'
                  ? 'bg-white text-indigo-600 border border-gray-300'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              DMs
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-indigo-600 text-white">
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
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'groups' && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-3 px-1">GROUPS <span className="text-gray-400 font-normal">{groups.length}</span></p>
              <div className="space-y-2">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleSelectChat(group)}
                    className={`w-full text-left p-3 rounded-lg transition-all flex items-start gap-3 ${
                      selectedChat?.id === group.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-semibold ${
                      selectedChat?.id === group.id
                        ? 'bg-indigo-700'
                        : 'bg-indigo-600'
                    } text-white`}>
                      <Users className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${
                        selectedChat?.id === group.id ? 'text-white' : 'text-gray-900'
                      }`}>
                        {group.name}
                      </p>
                      <p className={`text-xs truncate ${
                        selectedChat?.id === group.id ? 'text-indigo-100' : 'text-gray-600'
                      }`}>
                        {group.description}
                      </p>
                    </div>

                    {/* Badge */}
                    <span className={`text-xs font-bold rounded-full px-2.5 py-1 flex-shrink-0 ${
                      selectedChat?.id === group.id
                        ? 'bg-indigo-700'
                        : 'bg-indigo-600'
                    } text-white`}>
                      {group.members?.length || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'dms' && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-3 px-1">DIRECT MESSAGES</p>
              <p className="text-sm text-gray-500 text-center py-8">No messages yet</p>
            </div>
          )}
        </div>
      </aside>

      {/* ===== MAIN CHAT AREA ===== */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Top Bar */}
        <div className="h-16 border-b border-gray-200 px-8 flex items-center justify-between bg-gray-50">
          <div>
            {selectedChat ? (
              <div>
                <h1 className="text-base font-semibold text-gray-900">{selectedChat.name}</h1>
                <p className="text-xs text-gray-600">{selectedChat.description}</p>
              </div>
            ) : (
              <h1 className="text-base font-semibold text-gray-900">Select a conversation</h1>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 transition-all">
                <Bell className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-sm">
                {user.firstName[0]}{user.lastName[0]}
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6">
          {selectedChat ? (
            messages.length > 0 ? (
              messages.map((msg) => (
                <div key={msg.id} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0 text-sm">
                    {msg.user.firstName[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 text-sm">
                        {msg.user.firstName} {msg.user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(msg.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="text-gray-700 text-sm">{msg.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Send className="w-16 h-16 mb-4 text-gray-300" />
                <p className="text-lg font-semibold">No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Send className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-semibold">Select a conversation</p>
              <p className="text-sm">Choose a group or DM to start chatting</p>
            </div>
          )}
        </div>

        {/* Message Input */}
        {selectedChat && (
          <div className="border-t border-gray-200 px-8 py-4 bg-gray-50">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 text-sm"
                disabled={isLoadingMessage}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isLoadingMessage}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoadingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ===== CREATE GROUP MODAL ===== */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create a Group</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Group Name</label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) => {
                    setGroupForm(prev => ({ ...prev, name: e.target.value }))
                    if (groupErrors.name) setGroupErrors(prev => ({ ...prev, name: '' }))
                  }}
                  placeholder="e.g., Study Group"
                  className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 ${groupErrors.name ? 'border-red-300' : 'border-gray-300'}`}
                />
                {groupErrors.name && (
                  <p className="text-sm text-red-500 flex items-center mt-1">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {groupErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => {
                    setGroupForm(prev => ({ ...prev, description: e.target.value }))
                    if (groupErrors.description) setGroupErrors(prev => ({ ...prev, description: '' }))
                  }}
                  placeholder="What's this group about?"
                  className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 resize-none ${groupErrors.description ? 'border-red-300' : 'border-gray-300'}`}
                  rows={3}
                />
                {groupErrors.description && (
                  <p className="text-sm text-red-500 flex items-center mt-1">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {groupErrors.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateGroup(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition-all font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={isCreating}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
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

function NavLink({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
        active
          ? 'bg-blue-50 text-indigo-600'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}