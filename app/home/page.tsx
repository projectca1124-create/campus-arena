'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import NotificationBell from '@/components/NotificationBell'
import ProfileViewModal from '@/components/ProfileViewModal'
import EmojiKeyboard from '@/components/EmojiKeyboard'
import GifPicker from '@/components/GifPicker'
import { getPusherClient, getDMChannelName, getGroupChannelName } from '@/lib/pusher-client'
import { playSendSound, playReceiveSound, initSounds } from '@/lib/sounds'
import {
  Search, Plus, AlertCircle, Loader2, LogOut, Users, Send,
  Megaphone, MessageSquare, X, Paperclip, Image as ImageIcon,
  Smile, Info, MoreVertical, MessageCircle, Download, FileText, File,
  BellOff, BellRing, VolumeX, Reply, Sticker, ChevronDown,
  Forward, Pencil, Trash2, Copy, Check, CheckCheck, Circle,
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
interface ReplyTo { id: string; content: string; imageUrl?: string; user?: { id: string; firstName: string; lastName: string }; sender?: { id: string; firstName: string; lastName: string } }
interface Message {
  id: string; content: string; groupId: string; userId: string
  fileUrl?: string; fileName?: string; fileType?: string; imageUrl?: string
  replyToId?: string; replyTo?: ReplyTo | null
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
  fileUrl?: string; fileName?: string; fileType?: string; imageUrl?: string
  replyToId?: string; replyTo?: ReplyTo | null
  reactions?: Reaction[]
  read?: boolean
  sender: { id: string; firstName: string; lastName: string; profileImage?: string }
  receiver: { id: string; firstName: string; lastName: string; profileImage?: string }
}
interface Classmate {
  id: string; firstName: string; lastName: string; major?: string; semester?: string
  year?: string; funFact?: string; profileImage?: string; university?: string
}

const EMOJI_OPTIONS = ['👍', '❤️', '🤗', '😂', '🔥', '👏']

// ─── Avatar ──────────────────────────────────────────────────────
function UserAvatar({ src, firstName, lastName, size = 36, className = '', onClick }: {
  src?: string | null; firstName?: string; lastName?: string; size?: number; className?: string; onClick?: () => void
}) {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`
  const clickClass = onClick ? 'cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all' : ''
  if (src) return <img src={src} alt="" onClick={onClick} className={`rounded-full object-cover flex-shrink-0 ${clickClass} ${className}`} style={{ width: size, height: size }} />
  return (
    <div onClick={onClick} className={`rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0 ${clickClass} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}>{initials}</div>
  )
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
}
function formatDateSeparator(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
function getGroupInitials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}
function getFileIcon(fileType?: string) {
  if (!fileType) return <File className="w-5 h-5" />
  if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />
  if (fileType.includes('word') || fileType.includes('document')) return <FileText className="w-5 h-5 text-blue-500" />
  if (fileType.includes('sheet') || fileType.includes('excel')) return <FileText className="w-5 h-5 text-green-500" />
  return <File className="w-5 h-5 text-gray-500" />
}

// ─── Main Component ──────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [user, setUser] = useState<User | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedChat, setSelectedChat] = useState<Group | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
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

  const [showPingModal, setShowPingModal] = useState(false)
  const [pingSearchQuery, setPingSearchQuery] = useState('')
  const [pingClassmates, setPingClassmates] = useState<Classmate[]>([])
  const [isLoadingPing, setIsLoadingPing] = useState(false)

  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  const [showInputEmoji, setShowInputEmoji] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)

  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberYearFilter, setMemberYearFilter] = useState('')
  const [memberSemesterFilter, setMemberSemesterFilter] = useState('')
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const [uploadingFile, setUploadingFile] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string; type: string } | null>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const [profileViewUserId, setProfileViewUserId] = useState<string | null>(null)
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)
  const [mutedChats, setMutedChats] = useState<Set<string>>(new Set())
  const headerMenuRef = useRef<HTMLDivElement>(null)
  const [sidebarMenuId, setSidebarMenuId] = useState<string | null>(null)

  // Reply state
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; userName: string; imageUrl?: string } | null>(null)

  // Message actions state
  const [messageActionId, setMessageActionId] = useState<string | null>(null)
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null)
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)
  const [forwardingMessage, setForwardingMessage] = useState<{ content: string; imageUrl?: string } | null>(null)

  // ─── Real-time: Typing, Presence, Read Receipts ───
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; timeout: NodeJS.Timeout }>>({})
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [dmReadStatus, setDmReadStatus] = useState<boolean>(false) // true = recipient has read our latest messages
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTypingSentRef = useRef<number>(0)

  // Group unread tracking (localStorage-based)
  const [groupLastRead, setGroupLastRead] = useState<Record<string, string>>({})
  useEffect(() => {
    try { const stored = localStorage.getItem('groupLastRead'); if (stored) setGroupLastRead(JSON.parse(stored)) } catch {}
  }, [])
  const markGroupRead = (groupId: string) => {
    setGroupLastRead(prev => {
      const next = { ...prev, [groupId]: new Date().toISOString() }
      localStorage.setItem('groupLastRead', JSON.stringify(next))
      return next
    })
  }
  const getGroupUnread = (group: Group): number => {
    if (!user) return 0
    const lastRead = groupLastRead[group.id]
    if (!lastRead) return group.messages?.filter(m => m.userId !== user.id).length || 0
    return group.messages?.filter(m => m.userId !== user.id && new Date(m.createdAt) > new Date(lastRead)).length || 0
  }

  // Scroll state
  const [showScrollDown, setShowScrollDown] = useState(false)

  // Polling refs
  const selectedChatRef = useRef<Group | null>(null)
  const selectedDMRef = useRef<DMConversation | null>(null)
  const messagesRef = useRef<Message[]>([])
  const dmMessagesRef = useRef<DMMessage[]>([])

  useEffect(() => { selectedChatRef.current = selectedChat }, [selectedChat])
  useEffect(() => { selectedDMRef.current = selectedDM }, [selectedDM])
  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { dmMessagesRef.current = dmMessages }, [dmMessages])

  // Auto scroll to bottom on new messages
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])
  useEffect(() => { scrollToBottom(); if (selectedChat && messages.length > 0) markGroupRead(selectedChat.id) }, [messages, dmMessages])

  // Track scroll position for "scroll down" button
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollDown(fromBottom > 200)
  }, [])

  // Load muted chats
  useEffect(() => {
    try { const stored = localStorage.getItem('mutedChats'); if (stored) setMutedChats(new Set(JSON.parse(stored))) } catch {}
  }, [])
  const toggleMute = (chatId: string) => {
    setMutedChats(prev => {
      const next = new Set(prev); if (next.has(chatId)) next.delete(chatId); else next.add(chatId)
      localStorage.setItem('mutedChats', JSON.stringify([...next])); return next
    })
    setShowHeaderMenu(false); setSidebarMenuId(null)
  }
  const getCurrentChatId = () => { if (selectedChat) return `group_${selectedChat.id}`; if (selectedDM) return `dm_${selectedDM.user.id}`; return '' }
  const isMuted = (chatId: string) => mutedChats.has(chatId)

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) setShowHeaderMenu(false)
      const target = e.target as HTMLElement
      if (!target.closest('[data-sidebar-menu]')) setSidebarMenuId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ─── Initial load ───
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
        let convs: DMConversation[] = []
        if (dmRes.ok) { const d = await dmRes.json(); convs = d.conversations || []; setDmConversations(convs) }

        // Check if we should open a DM (from Explore Classmates "Connect" button or profile modal)
        try {
          const params = new URLSearchParams(window.location.search)
          const openDMId = params.get('openDM')
          if (openDMId) {
            // Try sessionStorage first (from Explore Classmates)
            const dmDataStr = sessionStorage.getItem('openDM')
            let dmData: any = null
            if (dmDataStr) {
              dmData = JSON.parse(dmDataStr)
              sessionStorage.removeItem('openDM')
            } else {
              // Fallback: use URL params (from Campus Talks / Profile modal)
              const dmName = params.get('dmName') || ''
              const nameParts = dmName.split(' ')
              dmData = { id: openDMId, firstName: nameParts[0] || '', lastName: nameParts.slice(1).join(' ') || '' }
            }
            // Switch to DMs tab and open the conversation
            setActiveTab('dms')
            const existing = convs.find(c => c.user.id === dmData.id || c.user.id === openDMId)
            if (existing) {
              setSelectedDM(existing); setSelectedChat(null)
            } else {
              setSelectedDM({ user: dmData, lastMessage: '', lastMessageAt: new Date().toISOString(), unreadCount: 0 })
              setSelectedChat(null); setDmMessages([])
            }
            // Clean URL
            window.history.replaceState({}, '', '/home')
          }
        } catch {}
      } catch (err) { console.error('Error:', err) }
      finally { setIsLoading(false) }
    }
    loadData()
  }, [router])

  // ─── Pusher Real-time Subscriptions ───
  // Subscribe to group/DM channels when chat selection changes
  useEffect(() => {
    if (!user) return
    const pusher = getPusherClient()
    const subscriptions: string[] = []

    // ── Subscribe to selected GROUP channel ──
    if (selectedChat) {
      const groupChannel = getGroupChannelName(selectedChat.id)
      const ch = pusher.subscribe(groupChannel)
      subscriptions.push(groupChannel)

      ch.bind('new-message', (data: { message: Message }) => {
        // Don't duplicate our own optimistic messages
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev
          // Replace temp message if it was ours
          const tempIdx = prev.findIndex(m => m.id.startsWith('temp_') && m.userId === data.message.userId && m.content === data.message.content)
          if (tempIdx >= 0) { const next = [...prev]; next[tempIdx] = data.message; return next }
          // Play receive sound for messages from others
          if (data.message.userId !== user.id) playReceiveSound()
          return [...prev, data.message]
        })
      })

      ch.bind('message-deleted', (data: { messageId: string }) => {
        setMessages(prev => prev.filter(m => m.id !== data.messageId))
      })

      ch.bind('message-edited', (data: { messageId: string; content: string }) => {
        setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, content: data.content } : m))
      })

      ch.bind('typing', (data: { userId: string; userName: string; isTyping: boolean }) => {
        if (data.userId === user.id) return // Ignore own typing
        setTypingUsers(prev => {
          const next = { ...prev }
          if (data.isTyping) {
            if (next[data.userId]?.timeout) clearTimeout(next[data.userId].timeout)
            const timeout = setTimeout(() => {
              setTypingUsers(p => { const n = { ...p }; delete n[data.userId]; return n })
            }, 3000)
            next[data.userId] = { name: data.userName, timeout }
          } else {
            if (next[data.userId]?.timeout) clearTimeout(next[data.userId].timeout)
            delete next[data.userId]
          }
          return next
        })
      })
    }

    // ── Subscribe to selected DM channel ──
    if (selectedDM) {
      const dmChannel = getDMChannelName(user.id, selectedDM.user.id)
      const ch = pusher.subscribe(dmChannel)
      subscriptions.push(dmChannel)

      ch.bind('new-message', (data: { message: DMMessage }) => {
        setDmMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev
          const tempIdx = prev.findIndex(m => m.id.startsWith('temp_') && m.senderId === data.message.senderId && m.content === data.message.content)
          if (tempIdx >= 0) { const next = [...prev]; next[tempIdx] = data.message; return next }
          // Play receive sound for messages from the other person
          if (data.message.senderId !== user.id) playReceiveSound()
          return [...prev, data.message]
        })
        // Update conversation list
        setDmConversations(prev => {
          const existing = prev.find(c => c.user.id === selectedDM.user.id)
          if (existing) return prev.map(c => c.user.id === selectedDM.user.id ? { ...c, lastMessage: data.message.content || '📎 Attachment', lastMessageAt: data.message.createdAt, unreadCount: 0 } : c)
          return prev
        })
      })

      ch.bind('message-deleted', (data: { messageId: string }) => {
        setDmMessages(prev => prev.filter(m => m.id !== data.messageId))
      })

      ch.bind('message-edited', (data: { messageId: string; content: string }) => {
        setDmMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, content: data.content } : m))
      })

      ch.bind('messages-read', (data: { readBy: string; readAt: string }) => {
        if (data.readBy !== user.id) {
          // The other person read our messages
          setDmReadStatus(true)
          setDmMessages(prev => prev.map(m => m.senderId === user.id ? { ...m, read: true } : m))
        }
      })

      ch.bind('typing', (data: { userId: string; userName: string; isTyping: boolean }) => {
        if (data.userId === user.id) return
        setTypingUsers(prev => {
          const next = { ...prev }
          if (data.isTyping) {
            if (next[data.userId]?.timeout) clearTimeout(next[data.userId].timeout)
            const timeout = setTimeout(() => {
              setTypingUsers(p => { const n = { ...p }; delete n[data.userId]; return n })
            }, 3000)
            next[data.userId] = { name: data.userName, timeout }
          } else {
            if (next[data.userId]?.timeout) clearTimeout(next[data.userId].timeout)
            delete next[data.userId]
          }
          return next
        })
      })
    }

    // ── Subscribe to personal notifications channel (DM updates from any user) ──
    const userChannel = `user-${user.id}`
    const uch = pusher.subscribe(userChannel)
    subscriptions.push(userChannel)

    uch.bind('new-dm-notification', (data: { from: any; preview: string; timestamp: string }) => {
      // Play notification sound if not currently viewing that DM and not muted
      const isCurrentDM = selectedDMRef.current?.user.id === data.from.id
      const dmChatId = `dm_${data.from.id}`
      if (!isCurrentDM && !mutedChats.has(dmChatId)) playReceiveSound()
      // Update conversation list sidebar with new message
      setDmConversations(prev => {
        const idx = prev.findIndex(c => c.user.id === data.from.id)
        if (idx >= 0) {
          const updated = [...prev]
          const isCurrentDM = selectedDMRef.current?.user.id === data.from.id
          updated[idx] = { ...updated[idx], lastMessage: data.preview, lastMessageAt: data.timestamp, unreadCount: isCurrentDM ? 0 : updated[idx].unreadCount + 1 }
          return updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
        }
        // New conversation
        return [{ user: data.from, lastMessage: data.preview, lastMessageAt: data.timestamp, unreadCount: 1 }, ...prev]
      })
    })

    // Cleanup: unsubscribe on unmount or when selection changes
    return () => {
      setTypingUsers({})
      setDmReadStatus(false)
      subscriptions.forEach(ch => pusher.unsubscribe(ch))
    }
  }, [selectedChat?.id, selectedDM?.user.id, user?.id])

  // ── Presence: Track online/offline users ──
  useEffect(() => {
    if (!user) return
    const pusher = getPusherClient()

    // Subscribe to presence channel
    const presenceCh = pusher.subscribe('presence-updates')

    presenceCh.bind('status-change', (data: { userId: string; status: string }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev)
        if (data.status === 'online') next.add(data.userId)
        else next.delete(data.userId)
        return next
      })
    })

    // Report ourselves as online
    const reportOnline = () => {
      fetch('/api/pusher/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, status: 'online' }) }).catch(() => {})
    }
    reportOnline()
    const heartbeat = setInterval(reportOnline, 30000) // Every 30s

    // Report offline on page unload
    const handleUnload = () => {
      navigator.sendBeacon('/api/pusher/presence', JSON.stringify({ userId: user.id, status: 'offline' }))
    }
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      clearInterval(heartbeat)
      window.removeEventListener('beforeunload', handleUnload)
      pusher.unsubscribe('presence-updates')
      handleUnload()
    }
  }, [user?.id])

  // ── Typing indicator: send typing event with throttle ──
  const sendTypingEvent = useCallback(() => {
    if (!user) return
    const now = Date.now()
    if (now - lastTypingSentRef.current < 2000) return // Throttle: max once per 2s
    lastTypingSentRef.current = now

    const body: any = { userId: user.id, userName: `${user.firstName} ${user.lastName}`, isTyping: true }
    if (selectedChat) {
      body.channelType = 'group'
      body.channelId = selectedChat.id
    } else if (selectedDM) {
      body.channelType = 'dm'
      body.channelId = selectedDM.user.id
      body.otherUserId = selectedDM.user.id
    } else return

    fetch('/api/pusher/typing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {})

    // Auto-stop typing after 3s of inactivity
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      fetch('/api/pusher/typing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, isTyping: false }) }).catch(() => {})
    }, 3000)
  }, [user, selectedChat, selectedDM])

  // ── Light polling fallback (every 15s) as safety net ──
  useEffect(() => {
    const poll = async () => {
      try {
        if (selectedChatRef.current && messagesRef.current.length > 0) {
          const lastMsg = messagesRef.current[messagesRef.current.length - 1]
          if (lastMsg.id.startsWith('temp_')) return
          const res = await fetch(`/api/messages?groupId=${selectedChatRef.current.id}&after=${encodeURIComponent(lastMsg.createdAt)}`)
          if (res.ok) {
            const data = await res.json()
            if (data.messages?.length > 0) {
              setMessages(prev => { const ids = new Set(prev.map(m => m.id)); const n = data.messages.filter((m: Message) => !ids.has(m.id)); return n.length > 0 ? [...prev, ...n] : prev })
            }
          }
        }
        if (selectedDMRef.current && dmMessagesRef.current.length > 0) {
          const userStr = localStorage.getItem('user')
          if (!userStr) return
          const cu = JSON.parse(userStr)
          const lastMsg = dmMessagesRef.current[dmMessagesRef.current.length - 1]
          if (lastMsg.id.startsWith('temp_')) return
          const res = await fetch(`/api/dm?userId=${cu.id}&otherUserId=${selectedDMRef.current.user.id}&after=${encodeURIComponent(lastMsg.createdAt)}`)
          if (res.ok) {
            const data = await res.json()
            if (data.messages?.length > 0) {
              setDmMessages(prev => { const ids = new Set(prev.map(m => m.id)); const n = data.messages.filter((m: DMMessage) => !ids.has(m.id)); return n.length > 0 ? [...prev, ...n] : prev })
            }
          }
        }
      } catch { /* silent */ }
    }
    const interval = setInterval(poll, 15000) // 15s fallback (Pusher handles real-time)
    return () => clearInterval(interval)
  }, [])

  const loadMessages = async (groupId: string) => {
    setIsLoadingMessages(true)
    try { const res = await fetch(`/api/messages?groupId=${groupId}`); if (res.ok) { const d = await res.json(); setMessages(d.messages || []) } }
    catch (err) { console.error('Error:', err) }
    finally { setIsLoadingMessages(false) }
  }

  // File handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('File must be under 5MB'); return }
    setUploadingFile(true)
    const reader = new FileReader()
    reader.onload = () => { setPendingFile({ url: reader.result as string, name: file.name, type: file.type }); setUploadingFile(false) }
    reader.readAsDataURL(file); e.target.value = ''
  }
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return }
    setUploadingFile(true)
    const reader = new FileReader()
    reader.onload = () => { setImagePreview(reader.result as string); setUploadingFile(false) }
    reader.readAsDataURL(file); e.target.value = ''
  }
  const clearAttachments = () => { setImagePreview(null); setPendingFile(null) }

  // ─── Send Message (Group) with reply support ───
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && !imagePreview && !pendingFile) || !selectedChat || !user) return
    const tempId = `temp_${Date.now()}`
    const optimisticMsg: Message = {
      id: tempId, content: newMessage, groupId: selectedChat.id, userId: user.id,
      imageUrl: imagePreview || undefined, fileUrl: pendingFile?.url, fileName: pendingFile?.name, fileType: pendingFile?.type,
      replyToId: replyingTo?.id, replyTo: replyingTo ? { id: replyingTo.id, content: replyingTo.content, imageUrl: replyingTo.imageUrl, user: { id: '', firstName: replyingTo.userName.split(' ')[0], lastName: replyingTo.userName.split(' ').slice(1).join(' ') } } : null,
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, profileImage: user.profileImage },
      reactions: [], createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticMsg])
    playSendSound()
    const savedMsg = newMessage; const savedImg = imagePreview; const savedFile = pendingFile; const savedReply = replyingTo
    setNewMessage(''); clearAttachments(); setShowInputEmoji(false); setShowGifPicker(false); setReplyingTo(null)
    if (inputRef.current) { inputRef.current.style.height = 'auto' }
    try {
      const body: any = { content: savedMsg, groupId: selectedChat.id, userId: user.id }
      if (savedImg) body.imageUrl = savedImg
      if (savedFile) { body.fileUrl = savedFile.url; body.fileName = savedFile.name; body.fileType = savedFile.type }
      if (savedReply) body.replyToId = savedReply.id
      const res = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { const data = await res.json(); setMessages(prev => prev.map(m => m.id === tempId ? data.message : m)) }
      else { setMessages(prev => prev.filter(m => m.id !== tempId)) }
    } catch { setMessages(prev => prev.filter(m => m.id !== tempId)) }
  }

  // ─── Send Message (DM) with reply support ───
  const handleSendDM = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newDMMessage.trim() && !imagePreview && !pendingFile) || !selectedDM || !user) return
    const tempId = `temp_${Date.now()}`
    const optimisticMsg: DMMessage = {
      id: tempId, content: newDMMessage, senderId: user.id, receiverId: selectedDM.user.id,
      imageUrl: imagePreview || undefined, fileUrl: pendingFile?.url, fileName: pendingFile?.name, fileType: pendingFile?.type,
      replyToId: replyingTo?.id, replyTo: replyingTo ? { id: replyingTo.id, content: replyingTo.content, imageUrl: replyingTo.imageUrl, sender: { id: '', firstName: replyingTo.userName.split(' ')[0], lastName: replyingTo.userName.split(' ').slice(1).join(' ') } } : null,
      createdAt: new Date().toISOString(),
      sender: { id: user.id, firstName: user.firstName, lastName: user.lastName, profileImage: user.profileImage },
      receiver: { id: selectedDM.user.id, firstName: selectedDM.user.firstName, lastName: selectedDM.user.lastName, profileImage: selectedDM.user.profileImage },
    }
    setDmMessages(prev => [...prev, optimisticMsg])
    playSendSound()
    const savedMsg = newDMMessage; const savedImg = imagePreview; const savedFile = pendingFile; const savedReply = replyingTo
    setNewDMMessage(''); clearAttachments(); setShowInputEmoji(false); setShowGifPicker(false); setReplyingTo(null)
    if (inputRef.current) { inputRef.current.style.height = 'auto' }
    try {
      const body: any = { content: savedMsg, senderId: user.id, receiverId: selectedDM.user.id }
      if (savedImg) body.imageUrl = savedImg
      if (savedFile) { body.fileUrl = savedFile.url; body.fileName = savedFile.name; body.fileType = savedFile.type }
      if (savedReply) body.replyToId = savedReply.id
      const res = await fetch('/api/dm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { const data = await res.json(); setDmMessages(prev => prev.map(m => m.id === tempId ? data.message : m)) }
      else { setDmMessages(prev => prev.filter(m => m.id !== tempId)) }
    } catch { setDmMessages(prev => prev.filter(m => m.id !== tempId)) }
  }

  // ─── GIF/Sticker send ───
  const handleGifSelect = (url: string, type: 'gif' | 'sticker') => {
    if (type === 'sticker') {
      // Stickers are emoji - send as message content
      if (selectedChat) { setNewMessage(url); setTimeout(() => { const form = document.getElementById('chat-form') as HTMLFormElement; form?.requestSubmit() }, 50) }
      else if (selectedDM) { setNewDMMessage(url); setTimeout(() => { const form = document.getElementById('chat-form') as HTMLFormElement; form?.requestSubmit() }, 50) }
    } else {
      // GIFs - send as image
      if (selectedChat && user) {
        setImagePreview(url)
        setTimeout(() => { const form = document.getElementById('chat-form') as HTMLFormElement; form?.requestSubmit() }, 50)
      } else if (selectedDM && user) {
        setImagePreview(url)
        setTimeout(() => { const form = document.getElementById('chat-form') as HTMLFormElement; form?.requestSubmit() }, 50)
      }
    }
    setShowGifPicker(false)
  }

  const handleCreateGroup = async () => {
    const errs: Record<string, string> = {}
    if (!groupForm.name.trim()) errs.name = 'Required.'
    if (!groupForm.description.trim()) errs.description = 'Required.'
    setGroupErrors(errs); if (Object.keys(errs).length > 0) return
    setIsCreating(true)
    try {
      const res = await fetch('/api/groups/create', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupForm.name, description: groupForm.description, userId: user?.id }) })
      if (res.ok) { const d = await res.json(); setGroups(p => [...p, d.group]); setShowCreateGroup(false); setGroupForm({ name: '', description: '' }); setGroupErrors({}) }
    } catch (err) { console.error('Error:', err) }
    finally { setIsCreating(false) }
  }

  const handleSelectChat = (group: Group) => {
    setSelectedChat(group); setSelectedDM(null); setShowGroupInfo(false); clearAttachments()
    setShowInputEmoji(false); setShowGifPicker(false); setShowHeaderMenu(false); setReplyingTo(null)
    markGroupRead(group.id)
    loadMessages(group.id)
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return; setShowEmojiPicker(null)
    try {
      const res = await fetch('/api/messages/reactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId, userId: user.id, emoji }) })
      if (res.ok && selectedChat) loadMessages(selectedChat.id)
    } catch (err) { console.error('Error:', err) }
  }

  const handleDMReaction = async (messageId: string, emoji: string) => {
    if (!user || !selectedDM) return; setShowEmojiPicker(null)
    try {
      const res = await fetch('/api/dm/reactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId, userId: user.id, emoji }) })
      if (res.ok) loadDMMessages(selectedDM.user.id)
    } catch (err) { console.error('Error:', err) }
  }

  const loadDMMessages = async (otherUserId: string) => {
    if (!user) return; setIsLoadingMessages(true)
    try { const res = await fetch(`/api/dm?userId=${user.id}&otherUserId=${otherUserId}`); if (res.ok) { const d = await res.json(); setDmMessages(d.messages || []) } }
    catch (err) { console.error('Error:', err) }
    finally { setIsLoadingMessages(false) }
  }
  const handleSelectDM = (conv: DMConversation) => {
    setSelectedDM(conv); setSelectedChat(null); setShowGroupInfo(false); clearAttachments()
    setShowInputEmoji(false); setShowGifPicker(false); setShowHeaderMenu(false); setReplyingTo(null)
    loadDMMessages(conv.user.id)
    setDmConversations(p => p.map(c => c.user.id === conv.user.id ? { ...c, unreadCount: 0 } : c))
  }
  const handleStartDM = (classmate: { id: string; firstName: string; lastName: string; profileImage?: string; major?: string; year?: string }) => {
    setShowPingModal(false); setActiveTab('dms')
    const existing = dmConversations.find(c => c.user.id === classmate.id)
    if (existing) { handleSelectDM(existing) } else {
      setSelectedDM({ user: classmate, lastMessage: '', lastMessageAt: new Date().toISOString(), unreadCount: 0 })
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

  const handleLogout = () => setShowLogoutModal(true)
  const confirmLogout = () => { localStorage.removeItem('user'); router.push('/auth') }
  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredDMs = dmConversations.filter(c => `${c.user.firstName} ${c.user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()))
  const totalUnread = dmConversations.reduce((s, c) => s + c.unreadCount, 0)

  const groupReactions = (reactions: Reaction[] = []) => {
    const map: Record<string, { count: number; userReacted: boolean }> = {}
    for (const r of reactions) { if (!map[r.emoji]) map[r.emoji] = { count: 0, userReacted: false }; map[r.emoji].count++; if (r.userId === user?.id) map[r.emoji].userReacted = true }
    return map
  }

  const insertEmoji = (emoji: string) => {
    if (selectedChat) setNewMessage(p => p + emoji)
    else if (selectedDM) setNewDMMessage(p => p + emoji)
  }

  const getGroupMembers = () => {
    if (!selectedChat) return []
    let members = selectedChat.members || []
    if (memberSearch) { const q = memberSearch.toLowerCase(); members = members.filter(m => `${m.user.firstName} ${m.user.lastName}`.toLowerCase().includes(q) || m.user.major?.toLowerCase().includes(q)) }
    if (memberYearFilter) members = members.filter(m => m.user.year === memberYearFilter)
    if (memberSemesterFilter) members = members.filter(m => m.user.semester === memberSemesterFilter)
    return members
  }
  const getAvailableYears = () => { if (!selectedChat) return []; return [...new Set(selectedChat.members?.map(m => m.user.year).filter(Boolean) as string[])] }
  const getAvailableSemesters = () => { if (!selectedChat) return []; return [...new Set(selectedChat.members?.map(m => m.user.semester).filter(Boolean) as string[])] }
  const toggleGroupInfo = () => { setShowGroupInfo(p => !p); setMemberSearch(''); setMemberYearFilter(''); setMemberSemesterFilter('') }

  // Reply handler
  const handleReply = (msg: Message | DMMessage) => {
    const isGroupMsg = 'userId' in msg
    const userName = isGroupMsg ? `${(msg as Message).user.firstName} ${(msg as Message).user.lastName}` : `${(msg as DMMessage).sender.firstName} ${(msg as DMMessage).sender.lastName}`
    setReplyingTo({ id: msg.id, content: msg.content, userName, imageUrl: msg.imageUrl })
    setMessageActionId(null)
    inputRef.current?.focus()
  }

  // Copy message
  const handleCopyMessage = (msg: Message | DMMessage) => {
    navigator.clipboard.writeText(msg.content || '').then(() => {
      setCopiedMsgId(msg.id); setMessageActionId(null)
      setTimeout(() => setCopiedMsgId(null), 2000)
    })
  }

  // Delete message
  const handleDeleteMessage = async (msg: Message | DMMessage) => {
    setMessageActionId(null)
    const isGroupMsg = 'groupId' in msg
    try {
      const res = await fetch(`/api/messages/${msg.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id }) })
      if (res.ok) {
        if (isGroupMsg) setMessages(prev => prev.filter(m => m.id !== msg.id))
        else setDmMessages(prev => prev.filter(m => m.id !== msg.id))
      }
    } catch (err) { console.error('Delete error:', err) }
  }

  // Edit message
  const handleStartEdit = (msg: Message | DMMessage) => {
    setEditingMessage({ id: msg.id, content: msg.content })
    setMessageActionId(null)
  }
  const handleSaveEdit = async () => {
    if (!editingMessage || !editingMessage.content.trim()) return
    const isGroupMsg = messages.some(m => m.id === editingMessage.id)
    try {
      const res = await fetch(`/api/messages/${editingMessage.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: editingMessage.content, userId: user?.id }) })
      if (res.ok) {
        if (isGroupMsg) setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, content: editingMessage.content } : m))
        else setDmMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, content: editingMessage.content } : m))
      }
    } catch (err) { console.error('Edit error:', err) }
    setEditingMessage(null)
  }

  // Forward message
  const handleForwardMessage = (msg: Message | DMMessage) => {
    setForwardingMessage({ content: msg.content, imageUrl: msg.imageUrl })
    setMessageActionId(null)
  }
  const forwardToChat = (group: Group) => {
    if (!forwardingMessage || !user) return
    const body: any = { content: forwardingMessage.content || '', groupId: group.id, userId: user.id }
    if (forwardingMessage.imageUrl) body.imageUrl = forwardingMessage.imageUrl
    fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setForwardingMessage(null)
  }
  const forwardToDM = (conv: DMConversation) => {
    if (!forwardingMessage || !user) return
    const body: any = { content: forwardingMessage.content || '', senderId: user.id, receiverId: conv.user.id }
    if (forwardingMessage.imageUrl) body.imageUrl = forwardingMessage.imageUrl
    fetch('/api/dm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setForwardingMessage(null)
  }

  // Date separator helper
  const shouldShowDateSeparator = (msgs: { createdAt: string }[], idx: number) => {
    if (idx === 0) return true
    const prev = new Date(msgs[idx - 1].createdAt).toDateString()
    const curr = new Date(msgs[idx].createdAt).toDateString()
    return prev !== curr
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen" >
      <div className="text-center"><div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="text-gray-500 text-sm font-medium">Loading Campus Arena...</p></div>
    </div>
  )

  const isGroupMode = selectedChat !== null
  const isDMMode = selectedDM !== null
  const filteredMembers = getGroupMembers()
  const currentChatId = getCurrentChatId()
  const currentMuted = isMuted(currentChatId)

  // ─── Attachment Renderer ───
  const renderAttachment = (msg: { imageUrl?: string; fileUrl?: string; fileName?: string; fileType?: string }, isOwn: boolean) => (
    <>
      {msg.imageUrl && (
        <button onClick={() => setLightboxImage(msg.imageUrl!)} className="block mt-1.5 mb-1 max-w-[280px] rounded-xl overflow-hidden">
          <img src={msg.imageUrl} alt="" className="w-full rounded-xl hover:opacity-90 transition-opacity" style={{ maxHeight: 220, objectFit: 'cover' }} />
        </button>
      )}
      {msg.fileUrl && msg.fileName && (
        <a href={msg.fileUrl} download={msg.fileName}
          className={`flex items-center gap-3 mt-1.5 mb-1 px-3 py-2.5 rounded-xl border transition-all ${isOwn ? 'border-indigo-500/30 bg-indigo-50 hover:bg-indigo-600/25' : 'border-gray-700 bg-gray-50 hover:bg-gray-100'}`}>
          {getFileIcon(msg.fileType)}
          <div className="flex-1 min-w-0"><p className={`text-xs font-semibold truncate ${isOwn ? 'text-white' : 'text-gray-900'}`}>{msg.fileName}</p><p className={`text-[10px] ${isOwn ? 'text-indigo-200' : 'text-gray-500'}`}>Tap to download</p></div>
          <Download className={`w-4 h-4 flex-shrink-0 ${isOwn ? 'text-indigo-200' : 'text-gray-500'}`} />
        </a>
      )}
    </>
  )

  // ─── Reply Preview (in message bubble) ───
  const renderReplyPreview = (replyTo: ReplyTo | null | undefined, isOwn: boolean) => {
    if (!replyTo) return null
    const replyName = replyTo.user ? `${replyTo.user.firstName} ${replyTo.user.lastName}` : replyTo.sender ? `${replyTo.sender.firstName} ${replyTo.sender.lastName}` : 'Unknown'
    return (
      <div className={`mb-2 px-3 py-2 rounded-lg border-l-3 ${isOwn ? 'bg-indigo-600/20 border-l-indigo-300' : 'bg-gray-700/40 border-l-indigo-500'}`} style={{ borderLeftWidth: 3 }}>
        <p className={`text-[11px] font-bold ${isOwn ? 'text-indigo-200' : 'text-indigo-500'}`}>{replyName}</p>
        <p className={`text-[11px] ${isOwn ? 'text-indigo-100/70' : 'text-gray-400'} line-clamp-1`}>{replyTo.content || (replyTo.imageUrl ? '📷 Photo' : 'Message')}</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50"
      onClick={() => { initSounds(); setShowEmojiPicker(null); setShowInputEmoji(false); setSidebarMenuId(null); setMessageActionId(null) }}>
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" />
      <input ref={imageInputRef} type="file" className="hidden" onChange={handleImageSelect} accept="image/*" />

      {/* ===== LEFT SIDEBAR ===== */}
      <aside className="w-[220px] flex flex-col flex-shrink-0 border-r" style={{ background: 'white', borderColor: '#e5e7eb' }}>
        <div className="px-5 py-5"><div className="flex items-center gap-2.5"><div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center"><span className="text-white font-bold text-xs">CA</span></div><span className="font-bold text-[15px] text-gray-900 tracking-tight">Campus Arena</span></div></div>
        <nav className="flex-1 overflow-y-auto px-3 pt-2 space-y-1">
          <NavItem icon={<MessageSquare className="w-[18px] h-[18px]" />} label="Chat" active />
          <NavItem icon={<Megaphone className="w-[18px] h-[18px]" />} label="Campus Talks" onClick={() => router.push('/home/campus-talks')} />
        </nav>
        <div className="px-3 py-4" style={{ borderTop: '1px solid #e5e7eb' }}><button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all text-sm font-medium"><LogOut className="w-[18px] h-[18px]" /><span>Log out</span></button></div>
      </aside>

      {/* ===== MIDDLE PANEL (Chat List) ===== */}
      <aside className="w-[340px] flex flex-col flex-shrink-0 border-r" style={{ background: 'white', borderColor: '#e5e7eb' }}>
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Chat</h2>
          {/* Groups / DMs toggle */}
          <div className="relative flex rounded-xl p-1" style={{ background: '#f3f4f6' }}>
            <div className="absolute top-1 bottom-1 rounded-lg shadow-lg transition-all duration-300 ease-out" style={{ background: '#4f46e5', width: 'calc(50% - 4px)', left: activeTab === 'groups' ? '4px' : 'calc(50%)' }}></div>
            <button onClick={() => setActiveTab('groups')} className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold rounded-lg transition-colors duration-300 ${activeTab === 'groups' ? 'text-white' : 'text-gray-500 hover:text-gray-600'}`}>
              Groups{groups.reduce((sum, g) => sum + getGroupUnread(g), 0) > 0 ? ` (${groups.reduce((sum, g) => sum + getGroupUnread(g), 0)})` : ''}
            </button>
            <button onClick={() => setActiveTab('dms')} className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold rounded-lg transition-colors duration-300 ${activeTab === 'dms' ? 'text-white' : 'text-gray-500 hover:text-gray-600'}`}>
              DMs{totalUnread > 0 ? ` (${totalUnread})` : ''}
            </button>
          </div>
        </div>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid #e5e7eb' }}><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search conversations..." className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 transition-all text-gray-900" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }} /></div></div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeTab === 'groups' && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1"><p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Groups ({filteredGroups.length})</p><button onClick={() => setShowCreateGroup(true)} className="text-[12px] text-indigo-500 font-bold hover:text-indigo-300 flex items-center gap-0.5"><Plus className="w-3.5 h-3.5" />Group</button></div>
              <div className="space-y-1.5">
                {filteredGroups.map(group => {
                  const isSel = selectedChat?.id === group.id
                  const chatId = `group_${group.id}`
                  const muted = isMuted(chatId)
                  return (
                    <div key={group.id} className="relative group/item" data-sidebar-menu>
                      <button onClick={() => handleSelectChat(group)} className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${isSel ? 'shadow-lg shadow-indigo-600/10' : 'hover:bg-gray-50'}`}
                        style={isSel ? { background: '#4f46e5' } : {}}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isSel ? 'bg-white/60' : 'bg-indigo-50'}`}><Users className={`w-5 h-5 ${isSel ? 'text-white' : 'text-indigo-500'}`} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5"><p className={`text-sm font-bold truncate ${isSel ? 'text-white' : 'text-gray-900'}`}>{group.name}</p>{muted && <VolumeX className={`w-3 h-3 flex-shrink-0 ${isSel ? 'text-indigo-200' : 'text-gray-600'}`} />}</div>
                          <p className={`text-xs truncate mt-0.5 ${isSel ? 'text-indigo-100' : 'text-gray-500'}`}>{group.description || 'No description'}</p>
                        </div>
                        {getGroupUnread(group) > 0 && !isSel && <span className="text-[10px] font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center flex-shrink-0 bg-indigo-600 text-white">{getGroupUnread(group)}</span>}
                      </button>
                      <button onClick={e => { e.stopPropagation(); setSidebarMenuId(sidebarMenuId === chatId ? null : chatId) }}
                        className={`absolute top-2 right-2 p-1 rounded-md transition-all ${isSel ? 'text-indigo-200 hover:text-white hover:bg-gray-100' : 'text-gray-600 hover:text-gray-400 hover:bg-gray-50'} ${sidebarMenuId === chatId ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}>
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                      {sidebarMenuId === chatId && (
                        <div className="absolute top-8 right-2 rounded-xl shadow-xl py-1 w-48 z-20" style={{ background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => toggleMute(chatId)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            {muted ? <BellRing className="w-4 h-4 text-gray-500" /> : <BellOff className="w-4 h-4 text-gray-500" />}
                            <span>{muted ? 'Unmute' : 'Mute'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {filteredGroups.length === 0 && <p className="text-center text-gray-600 text-sm py-8">{searchQuery ? 'No groups match' : 'No groups yet'}</p>}
              </div>
            </div>
          )}
          {activeTab === 'dms' && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1"><p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">DMs ({filteredDMs.length})</p><button onClick={() => router.push('/home/explore')} className="text-[12px] text-indigo-500 font-bold hover:text-indigo-300 flex items-center gap-1"><Search className="w-3.5 h-3.5" />Classmates</button></div>
              <div className="space-y-1.5">
                {filteredDMs.map(conv => {
                  const isSel = selectedDM?.user.id === conv.user.id
                  const chatId = `dm_${conv.user.id}`
                  const muted = isMuted(chatId)
                  return (
                    <div key={conv.user.id} className="relative group/item" data-sidebar-menu>
                      <button onClick={() => handleSelectDM(conv)} className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${isSel ? 'shadow-lg shadow-indigo-600/10' : 'hover:bg-gray-50'}`}
                        style={isSel ? { background: '#4f46e5' } : {}}>
                        <div className="relative flex-shrink-0">
                          <UserAvatar src={conv.user.profileImage} firstName={conv.user.firstName} lastName={conv.user.lastName} size={40} />
                          {onlineUsers.has(conv.user.id) && (
                            <span className={`absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ${isSel ? 'border-2 border-indigo-600' : 'border-2 border-white'}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5"><p className={`text-sm font-bold truncate ${isSel ? 'text-white' : 'text-gray-900'}`}>{conv.user.firstName} {conv.user.lastName}</p>{muted && <VolumeX className={`w-3 h-3 flex-shrink-0 ${isSel ? 'text-indigo-200' : 'text-gray-600'}`} />}</div>
                          <p className={`text-xs truncate mt-0.5 ${isSel ? 'text-indigo-100' : 'text-gray-500'}`}>{conv.lastMessage || 'No messages yet'}</p>
                        </div>
                        {conv.unreadCount > 0 && !isSel && <span className="text-[10px] font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center flex-shrink-0 bg-indigo-600 text-white">{conv.unreadCount}</span>}
                      </button>
                      <button onClick={e => { e.stopPropagation(); setSidebarMenuId(sidebarMenuId === chatId ? null : chatId) }}
                        className={`absolute top-2 right-2 p-1 rounded-md transition-all ${isSel ? 'text-indigo-200 hover:text-white hover:bg-gray-100' : 'text-gray-600 hover:text-gray-400 hover:bg-gray-50'} ${sidebarMenuId === chatId ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}>
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                      {sidebarMenuId === chatId && (
                        <div className="absolute top-8 right-2 rounded-xl shadow-xl py-1 w-48 z-20" style={{ background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => toggleMute(chatId)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            {muted ? <BellRing className="w-4 h-4 text-gray-500" /> : <BellOff className="w-4 h-4 text-gray-500" />}
                            <span>{muted ? 'Unmute' : 'Mute'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {filteredDMs.length === 0 && <p className="text-center text-gray-600 text-sm py-8">No conversations yet</p>}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ===== MAIN CHAT AREA ===== */}
      <div className="flex-1 flex flex-col min-w-0" >
        {/* Chat Header */}
        <div className="h-[64px] px-6 flex items-center justify-between flex-shrink-0" style={{ background: 'white', borderBottom: '1px solid #e5e7eb' }}>
          <div className="flex items-center gap-3">
            {isGroupMode && selectedChat && (<><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#4f46e5' }}><Users className="w-5 h-5 text-white" /></div><div><div className="flex items-center gap-2"><h1 className="text-[15px] font-bold text-gray-900">{selectedChat.name}</h1>{currentMuted && <VolumeX className="w-3.5 h-3.5 text-gray-600" />}</div><p className="text-xs text-gray-500">{selectedChat.members?.length || 0} members</p></div></>)}
            {isDMMode && selectedDM && (<>
              <div className="relative">
                <UserAvatar src={selectedDM.user.profileImage} firstName={selectedDM.user.firstName} lastName={selectedDM.user.lastName} size={40} onClick={() => setProfileViewUserId(selectedDM.user.id)} />
                {onlineUsers.has(selectedDM.user.id) && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              <div><div className="flex items-center gap-2"><h1 className="text-[15px] font-bold text-gray-900">{selectedDM.user.firstName} {selectedDM.user.lastName}</h1>{currentMuted && <VolumeX className="w-3.5 h-3.5 text-gray-600" />}</div><p className="text-xs text-gray-500">{onlineUsers.has(selectedDM.user.id) ? <span className="text-green-600 font-medium">Online</span> : selectedDM.user.major ? `${selectedDM.user.major}${selectedDM.user.year ? ` • ${selectedDM.user.year}` : ''}` : 'Offline'}</p></div>
            </>)}
          </div>
          <div className="flex items-center gap-1">
            {isGroupMode && <button onClick={toggleGroupInfo} className={`p-2 rounded-lg transition-all ${showGroupInfo ? 'bg-indigo-50 text-indigo-500' : 'hover:bg-gray-50 text-gray-500'}`}><Info className="w-[18px] h-[18px]" /></button>}
            {(isGroupMode || isDMMode) && (
              <div ref={headerMenuRef} className="relative">
                <button onClick={() => setShowHeaderMenu(!showHeaderMenu)} className={`p-2 rounded-lg transition-all ${showHeaderMenu ? 'bg-gray-100 text-gray-700' : 'hover:bg-gray-50 text-gray-500'}`}><MoreVertical className="w-[18px] h-[18px]" /></button>
                {showHeaderMenu && (
                  <div className="absolute top-10 right-0 rounded-xl shadow-xl py-1.5 w-52 z-20" style={{ background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                    <button onClick={() => toggleMute(currentChatId)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      {currentMuted ? <><BellRing className="w-4 h-4 text-gray-500" /><span>Unmute</span></> : <><BellOff className="w-4 h-4 text-gray-500" /><span>Mute</span></>}
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="w-px h-6 mx-1" style={{ background: '#e5e7eb' }}></div>
            <NotificationBell userId={user?.id || ''} />
            {user && <button onClick={() => router.push('/home/profile')}><UserAvatar src={user.profileImage} firstName={user.firstName} lastName={user.lastName} size={36} className="border-2 ml-1 cursor-pointer" /></button>}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0">
            {/* Messages Area */}
            <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-4 relative" style={{ background: 'linear-gradient(160deg, #f0f0ff 0%, #e8eeff 40%, #f5f0ff 70%, #eef0ff 100%)' }}>
              {/* GROUP MESSAGES */}
              {isGroupMode && selectedChat && (
                isLoadingMessages ? <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
                : messages.length > 0 ? (
                  <div className="space-y-1">
                    {messages.map((msg, idx) => {
                      const isOwn = msg.userId === user?.id
                      const isTemp = msg.id.startsWith('temp_')
                      const reactions = groupReactions(msg.reactions)
                      const reactionEntries = Object.entries(reactions)
                      const showDate = shouldShowDateSeparator(messages, idx)
                      const prevMsg = idx > 0 ? messages[idx - 1] : null
                      const isConsecutive = prevMsg && prevMsg.userId === msg.userId && !showDate && (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 120000)
                      return (
                        <React.Fragment key={msg.id}>
                          {showDate && (
                            <div className="flex items-center justify-center my-4">
                              <span className="text-[11px] font-semibold text-indigo-400/70 uppercase tracking-wider px-4 py-1.5 rounded-full"
                                style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.6)' }}>
                                {formatDateSeparator(msg.createdAt)}
                              </span>
                            </div>
                          )}
                          <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} ${isTemp ? 'opacity-60' : ''} ${isConsecutive ? 'mt-0.5' : 'mt-3'}`}>
                            {!isOwn && !isConsecutive && <p className="text-[11px] font-bold text-gray-500 mb-1 ml-12">{msg.user.firstName} {msg.user.lastName}</p>}
                            <div className={`flex gap-2 max-w-[65%] ${isOwn ? 'flex-row-reverse' : ''} group/msg`}>
                              {!isOwn && !isConsecutive && <UserAvatar src={msg.user.profileImage} firstName={msg.user.firstName} lastName={msg.user.lastName} size={32} className="mt-1" onClick={() => setProfileViewUserId(msg.userId)} />}
                              {!isOwn && isConsecutive && <div className="w-8 flex-shrink-0"></div>}
                              <div className="relative">
                                <div className={`px-4 py-2.5 text-sm leading-relaxed ${isOwn ? 'text-white' : 'text-gray-900'}`}
                                  style={isOwn
                                    ? { background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', borderRadius: '20px 20px 6px 20px', boxShadow: '0 2px 12px rgba(99,102,241,0.25)' }
                                    : { background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '20px 20px 20px 6px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }
                                  }>
                                  {renderReplyPreview(msg.replyTo, isOwn)}
                                  {editingMessage?.id === msg.id ? (
                                    <div className="flex flex-col gap-1.5">
                                      <input type="text" value={editingMessage.content} onChange={e => setEditingMessage({ ...editingMessage, content: e.target.value })}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingMessage(null) }}
                                        autoFocus className={`w-full px-2 py-1 text-sm rounded-lg outline-none ${isOwn ? 'bg-white/20 text-white placeholder-white/50' : 'bg-gray-50 text-gray-900'}`} />
                                      <div className="flex gap-2 justify-end text-[11px]"><button onClick={() => setEditingMessage(null)} className="opacity-70 hover:opacity-100">Cancel</button><button onClick={handleSaveEdit} className="font-bold opacity-70 hover:opacity-100">Save ↵</button></div>
                                    </div>
                                  ) : msg.content ? <p className="whitespace-pre-wrap break-words">{msg.content}</p> : null}
                                  {renderAttachment(msg, isOwn)}
                                </div>
                                {reactionEntries.length > 0 && (
                                  <div className={`flex gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                    {reactionEntries.map(([emoji, data]) => (
                                      <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji) }}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${data.userReacted ? 'bg-indigo-600/20 text-indigo-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} style={{ border: data.userReacted ? '1px solid #a5b4fc' : '1px solid #e5e7eb' }}>
                                        <span>{emoji}</span><span className="font-bold">{data.count}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {/* Hover actions */}
                                {!isTemp && (
                                  <div className={`absolute top-0 ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} opacity-0 group-hover/msg:opacity-100 transition-all px-1 flex gap-0.5`}>
                                    <button onClick={() => handleReply(msg)} className="p-1 rounded-lg text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 transition-all" title="Reply"><Reply className="w-3.5 h-3.5" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id) }}
                                      className="p-1 rounded-lg text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 transition-all" title="React"><Smile className="w-3.5 h-3.5" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setMessageActionId(messageActionId === msg.id ? null : msg.id) }}
                                      className="p-1 rounded-lg text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 transition-all" title="More"><MoreVertical className="w-3.5 h-3.5" /></button>
                                  </div>
                                )}
                                {/* Emoji picker */}
                                {showEmojiPicker === msg.id && (
                                  <div className={`absolute top-8 z-10 ${isOwn ? 'right-0' : 'left-0'} rounded-xl shadow-lg p-1.5 flex gap-0.5`} style={{ background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
                                    {EMOJI_OPTIONS.map(emoji => (<button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg transition-all">{emoji}</button>))}
                                  </div>
                                )}
                                {/* Message action menu */}
                                {messageActionId === msg.id && (
                                  <div className={`absolute top-8 z-20 ${isOwn ? 'right-0' : 'left-0'} rounded-xl py-1.5 w-44`} style={{ background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
                                    {msg.content && <button onClick={() => handleCopyMessage(msg)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">{copiedMsgId === msg.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}<span>{copiedMsgId === msg.id ? 'Copied!' : 'Copy'}</span></button>}
                                    <button onClick={() => handleForwardMessage(msg)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"><Forward className="w-4 h-4 text-gray-400" /><span>Forward</span></button>
                                    {isOwn && <button onClick={() => handleStartEdit(msg)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"><Pencil className="w-4 h-4 text-gray-400" /><span>Edit</span></button>}
                                    {isOwn && <button onClick={() => handleDeleteMessage(msg)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4 text-red-400" /><span>Delete</span></button>}
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className={`text-[10px] text-gray-600 mt-0.5 ${isOwn ? 'mr-1' : isConsecutive ? 'ml-12' : 'ml-12'}`}>{isTemp ? 'Sending...' : formatTime(msg.createdAt)}</p>
                          </div>
                        </React.Fragment>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                ) : <EmptyChat title="No messages yet" subtitle="Start the conversation!" />
              )}
              {/* DM MESSAGES */}
              {isDMMode && selectedDM && (
                isLoadingMessages ? <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
                : dmMessages.length > 0 ? (
                  <div className="space-y-1">
                    {dmMessages.map((msg, idx) => {
                      const isOwn = msg.senderId === user?.id
                      const isTemp = msg.id.startsWith('temp_')
                      const showDate = shouldShowDateSeparator(dmMessages, idx)
                      const prevMsg = idx > 0 ? dmMessages[idx - 1] : null
                      const isConsecutive = prevMsg && prevMsg.senderId === msg.senderId && !showDate && (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 120000)
                      const dmReactionEntries = Object.entries(groupReactions(msg.reactions))
                      return (
                        <React.Fragment key={msg.id}>
                          {showDate && (
                            <div className="flex items-center justify-center my-4">
                              <span className="text-[11px] font-semibold text-indigo-400/70 uppercase tracking-wider px-4 py-1.5 rounded-full"
                                style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.6)' }}>
                                {formatDateSeparator(msg.createdAt)}
                              </span>
                            </div>
                          )}
                          <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} ${isTemp ? 'opacity-60' : ''} ${isConsecutive ? 'mt-0.5' : 'mt-3'}`}>
                            {!isOwn && !isConsecutive && <p className="text-[11px] font-bold text-gray-500 mb-1 ml-10">{msg.sender.firstName} {msg.sender.lastName}</p>}
                            <div className={`flex gap-2 max-w-[65%] ${isOwn ? 'flex-row-reverse' : ''} group/msg`}>
                              {!isOwn && !isConsecutive && <UserAvatar src={msg.sender.profileImage} firstName={msg.sender.firstName} lastName={msg.sender.lastName} size={32} className="mt-1" onClick={() => setProfileViewUserId(msg.senderId)} />}
                              {!isOwn && isConsecutive && <div className="w-8 flex-shrink-0"></div>}
                              <div className="relative">
                                <div className={`px-4 py-2.5 text-sm leading-relaxed ${isOwn ? 'text-white' : 'text-gray-900'}`}
                                  style={isOwn
                                    ? { background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', borderRadius: '20px 20px 6px 20px', boxShadow: '0 2px 12px rgba(99,102,241,0.25)' }
                                    : { background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '20px 20px 20px 6px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }
                                  }>
                                  {renderReplyPreview(msg.replyTo, isOwn)}
                                  {editingMessage?.id === msg.id ? (
                                    <div className="flex flex-col gap-1.5">
                                      <input type="text" value={editingMessage.content} onChange={e => setEditingMessage({ ...editingMessage, content: e.target.value })}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingMessage(null) }}
                                        autoFocus className={`w-full px-2 py-1 text-sm rounded-lg outline-none ${isOwn ? 'bg-white/20 text-white placeholder-white/50' : 'bg-gray-50 text-gray-900'}`} />
                                      <div className="flex gap-2 justify-end text-[11px]"><button onClick={() => setEditingMessage(null)} className="opacity-70 hover:opacity-100">Cancel</button><button onClick={handleSaveEdit} className="font-bold opacity-70 hover:opacity-100">Save ↵</button></div>
                                    </div>
                                  ) : msg.content ? <p className="whitespace-pre-wrap break-words">{msg.content}</p> : null}
                                  {renderAttachment(msg, isOwn)}
                                </div>
                                {/* DM Reactions display */}
                                {dmReactionEntries.length > 0 && (
                                  <div className={`flex gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                    {dmReactionEntries.map(([emoji, data]) => (
                                      <button key={emoji} onClick={(e) => { e.stopPropagation(); handleDMReaction(msg.id, emoji) }}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${data.userReacted ? 'bg-indigo-600/20 text-indigo-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} style={{ border: data.userReacted ? '1px solid #a5b4fc' : '1px solid #e5e7eb' }}>
                                        <span>{emoji}</span><span className="font-bold">{data.count}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {/* Hover actions */}
                                {!isTemp && (
                                  <div className={`absolute top-0 ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} opacity-0 group-hover/msg:opacity-100 transition-all px-1 flex gap-0.5`}>
                                    <button onClick={() => handleReply(msg)} className="p-1 rounded-lg text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 transition-all" title="Reply"><Reply className="w-3.5 h-3.5" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id) }}
                                      className="p-1 rounded-lg text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 transition-all" title="React"><Smile className="w-3.5 h-3.5" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setMessageActionId(messageActionId === msg.id ? null : msg.id) }}
                                      className="p-1 rounded-lg text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 transition-all" title="More"><MoreVertical className="w-3.5 h-3.5" /></button>
                                  </div>
                                )}
                                {/* Emoji picker */}
                                {showEmojiPicker === msg.id && (
                                  <div className={`absolute top-8 z-10 ${isOwn ? 'right-0' : 'left-0'} rounded-xl shadow-lg p-1.5 flex gap-0.5`} style={{ background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
                                    {EMOJI_OPTIONS.map(emoji => (<button key={emoji} onClick={() => handleDMReaction(msg.id, emoji)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg transition-all">{emoji}</button>))}
                                  </div>
                                )}
                                {/* Message action menu */}
                                {messageActionId === msg.id && (
                                  <div className={`absolute top-8 z-20 ${isOwn ? 'right-0' : 'left-0'} rounded-xl py-1.5 w-44`} style={{ background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
                                    {msg.content && <button onClick={() => handleCopyMessage(msg)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">{copiedMsgId === msg.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}<span>{copiedMsgId === msg.id ? 'Copied!' : 'Copy'}</span></button>}
                                    <button onClick={() => handleForwardMessage(msg)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"><Forward className="w-4 h-4 text-gray-400" /><span>Forward</span></button>
                                    {isOwn && <button onClick={() => handleStartEdit(msg)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"><Pencil className="w-4 h-4 text-gray-400" /><span>Edit</span></button>}
                                    {isOwn && <button onClick={() => handleDeleteMessage(msg)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4 text-red-400" /><span>Delete</span></button>}
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className={`text-[10px] text-gray-600 mt-0.5 flex items-center gap-1 ${isOwn ? 'mr-1 justify-end' : isConsecutive ? 'ml-10' : 'ml-10'}`}>
                              {isTemp ? 'Sending...' : formatTime(msg.createdAt)}
                              {isOwn && !isTemp && (
                                msg.read
                                  ? <CheckCheck className="w-3.5 h-3.5 text-blue-500" /> /* Read */
                                  : <CheckCheck className="w-3.5 h-3.5 text-gray-400" /> /* Delivered */
                              )}
                            </p>
                          </div>
                        </React.Fragment>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                ) : <EmptyChat title="No messages yet" subtitle={`Send a message to ${selectedDM.user.firstName}!`} />
              )}
              {!isGroupMode && !isDMMode && <EmptyChat title="Select a conversation" subtitle="Choose a group or DM to start chatting" />}

              {/* Scroll to bottom button */}
              {showScrollDown && (
                <button onClick={() => scrollToBottom()} className="fixed bottom-24 right-8 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-10" style={{ background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                  <ChevronDown className="w-5 h-5 text-indigo-500" />
                </button>
              )}
            </div>

            {/* Message Input */}
            {(isGroupMode || isDMMode) && (
              <div className="flex-shrink-0" style={{ background: 'white', borderTop: '1px solid #e5e7eb' }}>
                {/* Typing indicator */}
                {Object.keys(typingUsers).length > 0 && (
                  <div className="px-6 pt-2 pb-0">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="flex gap-0.5">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                      <span className="font-medium text-indigo-600">
                        {(() => {
                          const names = Object.values(typingUsers).map(t => t.name.split(' ')[0])
                          if (names.length === 1) return `${names[0]} is typing...`
                          if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`
                          return `${names[0]} and ${names.length - 1} others are typing...`
                        })()}
                      </span>
                    </div>
                  </div>
                )}
                {/* Reply preview bar */}
                {replyingTo && (
                  <div className="px-6 pt-3 pb-1 flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: '#f3f4f6', borderLeft: '3px solid #6366f1' }}>
                      <Reply className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0"><p className="text-[11px] font-bold text-indigo-500">{replyingTo.userName}</p><p className="text-[11px] text-gray-500 truncate">{replyingTo.content || '📷 Photo'}</p></div>
                      <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-500 hover:text-gray-600 rounded-lg hover:bg-gray-50"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                )}
                {/* Attachment preview */}
                {(imagePreview || pendingFile) && (
                  <div className="px-6 pt-3 pb-1 flex items-center gap-3">
                    {imagePreview && (<div className="relative"><img src={imagePreview} alt="" className="h-16 w-16 object-cover rounded-xl" style={{ border: '1px solid #e5e7eb' }} /><button onClick={() => setImagePreview(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"><X className="w-3 h-3" /></button></div>)}
                    {pendingFile && (<div className="relative flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>{getFileIcon(pendingFile.type)}<span className="text-xs font-medium text-gray-700 max-w-[150px] truncate">{pendingFile.name}</span><button onClick={() => setPendingFile(null)} className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 ml-1"><X className="w-3 h-3" /></button></div>)}
                  </div>
                )}
                <div className="px-6 py-3" style={{ background: 'rgba(240,240,255,0.6)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.5)' }}>
                  <form id="chat-form" onSubmit={isGroupMode ? handleSendMessage : handleSendDM} className="flex items-end gap-2">
                    <div className="flex items-center gap-0.5">
                      <button type="button" onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }} className={`p-2 rounded-xl transition-all ${pendingFile ? 'text-indigo-500 bg-indigo-600/10' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`} disabled={uploadingFile}><Paperclip className="w-[18px] h-[18px]" /></button>
                      <button type="button" onClick={e => { e.stopPropagation(); imageInputRef.current?.click() }} className={`p-2 rounded-xl transition-all ${imagePreview ? 'text-indigo-500 bg-indigo-600/10' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`} disabled={uploadingFile}><ImageIcon className="w-[18px] h-[18px]" /></button>
                    </div>
                    <div className="flex-1 relative">
                      <textarea ref={inputRef} value={isGroupMode ? newMessage : newDMMessage}
                        onChange={e => {
                          isGroupMode ? setNewMessage(e.target.value) : setNewDMMessage(e.target.value)
                          // Auto resize
                          if (inputRef.current) { inputRef.current.style.height = 'auto'; inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px' }
                          // Trigger typing indicator
                          if (e.target.value.length > 0) sendTypingEvent()
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            const form = document.getElementById('chat-form') as HTMLFormElement; form?.requestSubmit()
                          }
                        }}
                        placeholder={isDMMode && selectedDM ? `Message ${selectedDM.user.firstName}...` : 'Type a message...'}
                        rows={1}
                        className="w-full px-4 py-2.5 rounded-2xl text-sm resize-none placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-gray-900"
                        style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minHeight: 42, maxHeight: 120, backdropFilter: 'blur(8px)' }} />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <div className="relative">
                        <button type="button" onClick={e => { e.stopPropagation(); setShowGifPicker(!showGifPicker); setShowInputEmoji(false) }} className={`p-2 rounded-xl transition-all ${showGifPicker ? 'text-indigo-500 bg-indigo-600/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Sticker className="w-[18px] h-[18px]" /></button>
                        {showGifPicker && <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifPicker(false)} />}
                      </div>
                      <div className="relative">
                        <button type="button" onClick={e => { e.stopPropagation(); setShowInputEmoji(!showInputEmoji); setShowGifPicker(false) }} className={`p-2 rounded-xl transition-all ${showInputEmoji ? 'text-indigo-500 bg-indigo-600/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Smile className="w-[18px] h-[18px]" /></button>
                        {showInputEmoji && <EmojiKeyboard onSelect={insertEmoji} onClose={() => setShowInputEmoji(false)} />}
                      </div>
                      <button type="submit"
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 hover:shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', boxShadow: '0 2px 10px rgba(99,102,241,0.3)' }}
                        disabled={isGroupMode ? (!newMessage.trim() && !imagePreview && !pendingFile) : (!newDMMessage.trim() && !imagePreview && !pendingFile)}>
                        <Send className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* GROUP INFO PANEL */}
          {showGroupInfo && isGroupMode && selectedChat && (
            <div className="w-[300px] flex flex-col flex-shrink-0 overflow-hidden" style={{ background: 'white', borderLeft: '1px solid #e5e7eb' }}>
              <div className="h-[64px] px-5 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid #e5e7eb' }}><h3 className="text-sm font-bold text-gray-900">Group Info</h3><button onClick={() => setShowGroupInfo(false)} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-500 hover:text-gray-600 transition-all"><X className="w-4 h-4" /></button></div>
              <div className="px-5 py-6 flex flex-col items-center" style={{ borderBottom: '1px solid #e5e7eb' }}><div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#4f46e5' }}><span className="text-white font-bold text-lg">{getGroupInitials(selectedChat.name)}</span></div><h4 className="text-base font-bold text-gray-900 text-center">{selectedChat.name}</h4><p className="text-xs text-gray-500 mt-0.5">{selectedChat.members?.length || 0} members</p></div>
              <div className="px-5 pt-4 pb-2"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" /><input type="text" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search members..." className="w-full pl-9 pr-3 py-2 rounded-lg text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-600/30 text-gray-900" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }} /></div></div>
              <div className="px-5 py-2 flex gap-2">
                <select value={memberYearFilter} onChange={e => setMemberYearFilter(e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg text-xs text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-600/30" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', appearance: 'none' }}><option value="">All Years</option>{getAvailableYears().map(y => <option key={y} value={y}>{y}</option>)}</select>
                <select value={memberSemesterFilter} onChange={e => setMemberSemesterFilter(e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg text-xs text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-600/30" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', appearance: 'none' }}><option value="">All Semesters</option>{getAvailableSemesters().map(s => <option key={s} value={s}>{s}</option>)}</select>
              </div>
              <div className="px-5 pt-2 pb-1"><p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Members ({filteredMembers.length})</p></div>
              <div className="flex-1 overflow-y-auto px-5 pb-4">
                <div className="space-y-1">
                  {filteredMembers.map(member => (
                    <div key={member.id} className="flex items-center gap-3 py-2.5 rounded-lg hover:bg-gray-50 px-1 transition-all">
                      <UserAvatar src={member.user.profileImage} firstName={member.user.firstName} lastName={member.user.lastName} size={38} onClick={() => setProfileViewUserId(member.user.id)} />
                      <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900 truncate">{member.user.firstName} {member.user.lastName}</p><p className="text-xs text-gray-500 truncate">{member.user.major}{member.user.semester && member.user.year ? ` • ${member.user.semester} ${member.user.year}` : member.user.year ? ` • ${member.user.year}` : ''}</p></div>
                      {member.user.id !== user?.id && (
                        <button onClick={() => handleStartDM({ id: member.user.id, firstName: member.user.firstName, lastName: member.user.lastName, profileImage: member.user.profileImage, major: member.user.major, year: member.user.year })}
                          className="p-1.5 text-gray-500 hover:text-indigo-500 hover:bg-indigo-600/10 rounded-lg transition-all"><MessageCircle className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
                  {filteredMembers.length === 0 && <p className="text-center text-gray-600 text-xs py-6">No members match</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== MODALS ===== */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowCreateGroup(false)}>
          <div className="rounded-2xl shadow-2xl max-w-md w-full p-6" style={{ background: 'white', border: '1px solid #e5e7eb' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-5">Create a Group</h2>
            <div className="mb-4"><label className="block text-sm font-semibold text-gray-700 mb-2">Group Name</label><input type="text" value={groupForm.name} onChange={e => { setGroupForm(p => ({ ...p, name: e.target.value })); if (groupErrors.name) setGroupErrors(p => ({ ...p, name: '' })) }} placeholder="e.g., Study Group" className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/30 text-gray-900 placeholder-gray-400 ${groupErrors.name ? 'ring-1 ring-red-500' : ''}`} style={{ background: 'white', border: '1px solid #e5e7eb' }} />{groupErrors.name && <p className="text-xs text-red-400 flex items-center gap-1 mt-1.5"><AlertCircle className="w-3.5 h-3.5" />{groupErrors.name}</p>}</div>
            <div className="mb-6"><label className="block text-sm font-semibold text-gray-700 mb-2">Description</label><textarea value={groupForm.description} onChange={e => { setGroupForm(p => ({ ...p, description: e.target.value })); if (groupErrors.description) setGroupErrors(p => ({ ...p, description: '' })) }} placeholder="What's this group about?" rows={3} className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/30 resize-none text-gray-900 placeholder-gray-400 ${groupErrors.description ? 'ring-1 ring-red-500' : ''}`} style={{ background: 'white', border: '1px solid #e5e7eb' }} />{groupErrors.description && <p className="text-xs text-red-400 flex items-center gap-1 mt-1.5"><AlertCircle className="w-3.5 h-3.5" />{groupErrors.description}</p>}</div>
            <div className="flex gap-3"><button onClick={() => { setShowCreateGroup(false); setGroupErrors({}); setGroupForm({ name: '', description: '' }) }} className="flex-1 px-4 py-2.5 rounded-xl text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-all" style={{ border: '1px solid #d1d5db' }}>Cancel</button><button onClick={handleCreateGroup} disabled={isCreating} className="flex-1 px-4 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: '#4f46e5' }}>{isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Group'}</button></div>
          </div>
        </div>
      )}

      {showPingModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowPingModal(false)}>
          <div className="rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[500px] flex flex-col" style={{ background: 'white', border: '1px solid #e5e7eb' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-gray-900">Ping Classmates</h2><button onClick={() => setShowPingModal(false)} className="p-1 hover:bg-gray-50 rounded-lg text-gray-500"><X className="w-5 h-5" /></button></div>
            <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" /><input type="text" value={pingSearchQuery} onChange={e => setPingSearchQuery(e.target.value)} placeholder="Search students..." className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 text-gray-700" style={{ background: 'white', border: '1px solid #e5e7eb' }} /></div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {isLoadingPing ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>
              : pingClassmates.length > 0 ? pingClassmates.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all">
                  <UserAvatar src={c.profileImage} firstName={c.firstName} lastName={c.lastName} size={40} onClick={() => setProfileViewUserId(c.id)} />
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900">{c.firstName} {c.lastName}</p><p className="text-xs text-gray-500">{c.major}{c.year ? ` • ${c.year}` : ''}</p></div>
                  <button onClick={() => handleStartDM(c)} className="px-4 py-1.5 text-indigo-500 rounded-lg text-sm font-semibold hover:bg-indigo-600/10 transition-all" style={{ border: '1px solid rgba(99,102,241,0.3)' }}>Message</button>
                </div>
              )) : <p className="text-center text-gray-600 text-sm py-8">No classmates found</p>}
            </div>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)}>
          <div className="rounded-2xl shadow-2xl max-w-sm w-full p-6" style={{ background: 'white', border: '1px solid #e5e7eb' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Leaving Campus Arena?</h2><p className="text-sm text-gray-500 mb-6">You're leaving Campus Arena. Are you sure?</p>
            <div className="flex gap-3"><button onClick={() => setShowLogoutModal(false)} className="flex-1 px-4 py-2.5 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50" style={{ border: '1px solid #d1d5db' }}>No, Stay Here</button><button onClick={confirmLogout} className="flex-1 px-4 py-2.5 text-white rounded-xl font-semibold text-sm" style={{ background: '#4f46e5' }}>Yes, Log Out</button></div>
          </div>
        </div>
      )}

      {/* Forward Message Modal */}
      {forwardingMessage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setForwardingMessage(null)}>
          <div className="rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[500px] flex flex-col" style={{ background: 'white', border: '1px solid #e5e7eb' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-gray-900">Forward Message</h2><button onClick={() => setForwardingMessage(null)} className="p-1 hover:bg-gray-50 rounded-lg text-gray-500"><X className="w-5 h-5" /></button></div>
            <div className="mb-4 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200"><p className="text-sm text-gray-600 line-clamp-2">{forwardingMessage.content || '📷 Photo'}</p></div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Forward to:</p>
            <div className="flex-1 overflow-y-auto space-y-1">
              {groups.map(g => (
                <button key={g.id} onClick={() => forwardToChat(g)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center"><Users className="w-4 h-4 text-indigo-600" /></div>
                  <span className="text-sm font-medium text-gray-900">{g.name}</span>
                </button>
              ))}
              {dmConversations.map(c => (
                <button key={c.user.id} onClick={() => forwardToDM(c)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all">
                  <UserAvatar src={c.user.profileImage} firstName={c.user.firstName} lastName={c.user.lastName} size={36} />
                  <span className="text-sm font-medium text-gray-900">{c.user.firstName} {c.user.lastName}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8 backdrop-blur-sm" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-white/60 rounded-full text-white transition-all"><X className="w-6 h-6" /></button>
          <img src={lightboxImage} alt="" className="max-w-full max-h-full rounded-xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <ProfileViewModal userId={profileViewUserId} onClose={() => setProfileViewUserId(null)} currentUserId={user?.id} onStartDM={handleStartDM} />
    </div>
  )
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (<button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`} ><span className="flex items-center justify-center w-5 h-5">{icon}</span><span>{label}</span></button>)
}

function EmptyChat({ title, subtitle }: { title: string; subtitle: string }) {
  return (<div className="flex flex-col items-center justify-center h-full" style={{ background: 'linear-gradient(160deg, #f0f0ff 0%, #e8eeff 40%, #f5f0ff 70%, #eef0ff 100%)' }}><div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 16px rgba(99,102,241,0.08)' }}><Send className="w-7 h-7 text-indigo-400" /></div><p className="text-base font-bold text-gray-400">{title}</p><p className="text-sm text-gray-500 mt-1">{subtitle}</p></div>)
}