'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import NotificationBell from '@/components/NotificationBell'
import ProfileViewModal from '@/components/ProfileViewModal'
import EmojiKeyboard from '@/components/EmojiKeyboard'
import GifPicker from '@/components/GifPicker'
import { getAblyClient, getDMChannelName, getGroupChannelName } from '@/lib/ably-client'
import { usePushNotifications } from '@/lib/use-push-notifications'
import type * as Ably from 'ably'
import { playSendSound, playReceiveSound, initSounds } from '@/lib/sounds'
import {
  Search, Plus, AlertCircle, Loader2, LogOut, Users, Send,
  Megaphone, MessageSquare, X, Paperclip, Image as ImageIcon,
  Smile, Info, MoreVertical, MessageCircle, Download, FileText, File,
  BellOff, BellRing, VolumeX, Reply, Sticker, ChevronDown,
  Forward, Pencil, Trash2, Copy, Check, CheckCheck,
  Pin, PinOff, Link2, Share2, Lock, Globe, Shield, UserPlus,
  Menu, ChevronLeft, Camera, CheckCircle2,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────
interface User {
  id: string; email: string; firstName: string; lastName: string
  university?: string; major?: string; semester?: string; year?: string; profileImage?: string
  pinnedGroupId?: string
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
  isDefault?: boolean; visibility?: string; inviteCode?: string
  university?: string; identifier?: string; degree?: string; major?: string
  members: GroupMember[]; messages: Message[]
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
  if (src) return <img src={src} alt="" onClick={e => { if (onClick) { e.stopPropagation(); onClick() } }} className={`rounded-full object-cover flex-shrink-0 ${clickClass} ${className}`} style={{ width: size, height: size }} />
  return (
    <div onClick={e => { if (onClick) { e.stopPropagation(); onClick() } }} className={`rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0 ${clickClass} ${className}`}
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
function getGroupAbbr(group: Group): string {
  const name = group.name.trim()
  const nameLower = name.toLowerCase()

  // ── Arena groups: "UTA Arena", "ASU Arena", "MIT Arena" etc ──
  // Strategy: take all capital-letter words before "Arena" as the abbreviation
  // e.g. "University of Texas at Arlington Arena" → extract from identifier
  if (group.identifier && group.identifier.includes('-arena')) {
    // identifier like "uta-arena", "mit-arena", "asu-arena"
    const code = group.identifier.split('-arena')[0]
    return code.toUpperCase()
  }
  // Fallback for arena groups without identifier: first word if it's an abbreviation
  if (nameLower.includes('arena')) {
    const words = name.split(' ').filter(w => w.toLowerCase() !== 'arena')
    // If first word looks like an abbreviation (≤4 chars, all caps or short), use it
    if (words.length > 0 && words[0].length <= 5) return words[0].toUpperCase()
    // Otherwise abbreviate all words except "Arena"
    return words.map(w => w[0]).join('').toUpperCase().slice(0, 4)
  }

  // ── Major groups ──
  if (group.identifier && group.identifier.startsWith('major-')) {
    const abbrs: Record<string, string> = {
      'computer science': 'CS',
      'data science': 'DS',
      'electrical engineering': 'EE',
      'mechanical engineering': 'ME',
      'civil engineering': 'CE',
      'chemical engineering': 'ChE',
      'business administration': 'BA',
      'information technology': 'IT',
      'information systems': 'IS',
      'software engineering': 'SE',
      'computer engineering': 'CpE',
      'biomedical engineering': 'BME',
      'industrial engineering': 'IE',
      'aerospace engineering': 'AE',
      'mathematics': 'MATH',
      'math': 'MATH',
      'physics': 'PHY',
      'chemistry': 'CHEM',
      'biology': 'BIO',
      'psychology': 'PSY',
      'nursing': 'NUR',
      'finance': 'FIN',
      'accounting': 'ACCT',
      'marketing': 'MKT',
      'economics': 'ECON',
      'english': 'ENG',
      'history': 'HIST',
      'political science': 'POLS',
      'communications': 'COMM',
      'communication': 'COMM',
      'sociology': 'SOC',
      'anthropology': 'ANTH',
      'philosophy': 'PHIL',
      'architecture': 'ARCH',
      'art': 'ART',
      'music': 'MUS',
      'theatre': 'THE',
      'theater': 'THE',
      'journalism': 'JOUR',
      'public health': 'PH',
      'criminal justice': 'CJ',
      'social work': 'SW',
      'education': 'EDU',
      'kinesiology': 'KIN',
      'nutrition': 'NUT',
      'environmental science': 'ENV',
      'geoscience': 'GEO',
      'geology': 'GEO',
      'linguistics': 'LING',
      'international studies': 'IS',
      'urban planning': 'UP',
      'supply chain': 'SCM',
      'management': 'MGMT',
      'human resources': 'HR',
      'neuroscience': 'NEUR',
      'biochemistry': 'BIOC',
      'statistics': 'STAT',
    }
    const match = abbrs[nameLower]
    if (match) return match
    // Fallback: initials of each word, max 4 chars
    return name.split(' ').map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 4)
  }

  // ── Any other default group: smart initials ──
  const words = name.split(' ').filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase()
  return words.map(w => w[0]).filter(Boolean).slice(0, 3).join('').toUpperCase()
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
  const groupAvatarInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [user, setUser] = useState<User | null>(null)

  // Register service worker + request push notification permission
  // This runs once when user is loaded and sets up OS-level push notifications
  usePushNotifications(user?.id)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedChat, setSelectedChat] = useState<Group | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [activeTab, setActiveTab] = useState<'groups' | 'dms'>('groups')
  const [searchQuery, setSearchQuery] = useState('')

  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [joinRequests, setJoinRequests] = useState<any[]>([])
  const [showJoinRequests, setShowJoinRequests] = useState(false)
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false)
  const [showLeaveGroupModal, setShowLeaveGroupModal] = useState(false)
  const [isDeletingGroup, setIsDeletingGroup] = useState(false)
  const [groupForm, setGroupForm] = useState({ name: '', description: '', visibility: 'public' as 'public' | 'private', icon: '' })
  const groupImageInputRef = useRef<HTMLInputElement>(null)
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
  const [isUploadingGroupAvatar, setIsUploadingGroupAvatar] = useState(false)

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

  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; userName: string; imageUrl?: string } | null>(null)
  const [messageActionId, setMessageActionId] = useState<string | null>(null)
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null)
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)
  const [forwardingMessage, setForwardingMessage] = useState<{ content: string; imageUrl?: string } | null>(null)

  const [pinnedGroupId, setPinnedGroupId] = useState<string | null>(null)
  const [shareGroupViaDM, setShareGroupViaDM] = useState<Group | null>(null)
  const [shareDMSentTo, setShareDMSentTo] = useState<Set<string>>(new Set())
  const [shareDMSending, setShareDMSending] = useState<string | null>(null)
  const [copiedInviteLink, setCopiedInviteLink] = useState(false)
  const [copiedInviteCode, setCopiedInviteCode] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [pendingApproval, setPendingApproval] = useState<{ groupName: string } | null>(null)

  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; timeout: NodeJS.Timeout }>>({})

  // ── Mobile responsive state ──────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false)
  // mobile view: 'nav' | 'list' | 'chat'
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // ── Mobile detection ──────────────────────────────────────────────
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setMobileNavOpen(false)
      if (mobile) setMobileView(v => v === 'chat' ? 'chat' : 'list')
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [dmReadStatus, setDmReadStatus] = useState<boolean>(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTypingSentRef = useRef<number>(0)

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

  const [showScrollDown, setShowScrollDown] = useState(false)

  const selectedChatRef = useRef<Group | null>(null)
  const selectedDMRef = useRef<DMConversation | null>(null)
  const messagesRef = useRef<Message[]>([])
  const dmMessagesRef = useRef<DMMessage[]>([])
  const mutedChatsRef = useRef<Set<string>>(new Set())

  useEffect(() => { selectedChatRef.current = selectedChat }, [selectedChat])
  useEffect(() => { selectedDMRef.current = selectedDM }, [selectedDM])
  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { dmMessagesRef.current = dmMessages }, [dmMessages])
  useEffect(() => { mutedChatsRef.current = mutedChats }, [mutedChats])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])
  // Scroll to bottom on new messages. Use 'instant' on initial load so the
  // chat opens AT the last message rather than animating up from the top.
  const isInitialLoadRef = useRef(true)
  useEffect(() => {
    if (messages.length > 0 || dmMessages.length > 0) {
      // instant jump on first load of a conversation, smooth for subsequent messages
      scrollToBottom(isInitialLoadRef.current ? 'instant' : 'smooth')
      isInitialLoadRef.current = false
    }
    if (selectedChat && messages.length > 0) markGroupRead(selectedChat.id)
  }, [messages, dmMessages])

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollDown(fromBottom > 200)
  }, [])

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) setShowHeaderMenu(false)
      const target = e.target as HTMLElement
      if (!target.closest('[data-sidebar-menu]')) setSidebarMenuId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ─── Group helpers ───
  const getUserRoleInGroup = (group: Group | null): string => {
    if (!group || !user) return 'member'
    const m = group.members?.find(m => m.userId === user.id || m.user?.id === user.id)
    return m?.role || 'member'
  }
  const getInviteLink = (group: Group) => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/home?joinCode=${group.inviteCode || ''}`
  }
  const copyInviteLink = (group: Group) => {
    navigator.clipboard.writeText(getInviteLink(group)).then(() => {
      setCopiedInviteLink(true); setTimeout(() => setCopiedInviteLink(false), 2000)
    })
    setSidebarMenuId(null); setShowHeaderMenu(false)
  }
  const handlePinGroup = async (groupId: string) => {
    if (!user) return; setSidebarMenuId(null); setShowHeaderMenu(false)
    const prev = pinnedGroupId
    setPinnedGroupId(pinnedGroupId === groupId ? null : groupId)
    try {
      const res = await fetch('/api/groups/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, groupId }) })
      if (res.ok) {
        const d = await res.json(); setPinnedGroupId(d.pinnedGroupId)
        const s = localStorage.getItem('user')
        if (s) { const u = JSON.parse(s); u.pinnedGroupId = d.pinnedGroupId; localStorage.setItem('user', JSON.stringify(u)); setUser(u) }
      }
    } catch { setPinnedGroupId(prev) }
  }
  const handleShareGroupViaDM = async (conv: DMConversation, group: Group) => {
    if (!user || shareDMSending) return
    if (shareDMSentTo.has(conv.user.id)) return
    setShareDMSending(conv.user.id)
    const link = getInviteLink(group)
    try {
      const res = await fetch('/api/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `Hey! Join my group "${group.name}" on Campus Arena: ${link}`,
          // ✅ FIX 1: senderId was missing — API requires it, causing silent failure
          senderId: user.id,
          receiverId: conv.user.id,
        }),
      })
      if (res.ok) {
        // ✅ FIX 2: Track sent state per contact so user sees checkmark feedback
        setShareDMSentTo(prev => new Set(prev).add(conv.user.id))
      }
    } catch (err) {
      console.error('Share group via DM error:', err)
    } finally {
      setShareDMSending(null)
    }
  }
  const handleDeleteGroup = async () => {
    if (!selectedChat || !user) return
    setIsDeletingGroup(true)
    try {
      const res = await fetch(`/api/groups/${selectedChat.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      if (res.ok) {
        setGroups(prev => prev.filter(g => g.id !== selectedChat.id))
        setSelectedChat(null)
        setShowDeleteGroupModal(false)
        setShowHeaderMenu(false)
      }
    } catch (err) { console.error('Delete group error:', err) }
    finally { setIsDeletingGroup(false) }
  }

  const handleLeaveGroup = async () => {
    if (!selectedChat || !user) return
    try {
      const res = await fetch('/api/groups/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, groupId: selectedChat.id }),
      })
      if (res.ok) {
        setGroups(prev => prev.filter(g => g.id !== selectedChat.id))
        setSelectedChat(null)
        setShowLeaveGroupModal(false)
        setShowHeaderMenu(false)
      }
    } catch (err) { console.error('Leave group error:', err) }
  }

  // ── Upload group avatar (admin only, non-default groups) ──
  const handleGroupAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedChat || !user) return
    e.target.value = ''
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return }
    setIsUploadingGroupAvatar(true)
    try {
      // Compress via canvas before upload
      const compressed = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (ev) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            const scale = Math.min(1, 300 / img.width)
            canvas.width = img.width * scale
            canvas.height = img.height * scale
            const ctx = canvas.getContext('2d')
            if (!ctx) { reject(new Error('Canvas not supported')); return }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            resolve(canvas.toDataURL('image/jpeg', 0.82))
          }
          img.onerror = reject
          img.src = ev.target?.result as string
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch(`/api/groups/${selectedChat.id}/avatar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, icon: compressed }),
      })
      if (res.ok) {
        const data = await res.json()
        const updatedIcon = data.group?.icon || compressed
        setGroups(prev => prev.map(g => g.id === selectedChat.id ? { ...g, icon: updatedIcon } : g))
        setSelectedChat(prev => prev ? { ...prev, icon: updatedIcon } : prev)
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Failed to update group avatar')
      }
    } catch (err) {
      console.error('Group avatar upload error:', err)
      alert('Something went wrong. Please try again.')
    } finally {
      setIsUploadingGroupAvatar(false)
    }
  }

  const handleLoadJoinRequests = async (groupId: string) => {
    if (!user) return
    try {
      const res = await fetch(`/api/groups/${groupId}?adminId=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setJoinRequests(data.requests || [])
        setShowJoinRequests(true)
      }
    } catch {}
  }

  const handleApproveReject = async (requesterId: string, action: 'approve' | 'reject') => {
    if (!selectedChat || !user) return
    try {
      const res = await fetch(`/api/groups/${selectedChat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, requesterId, action }),
      })
      if (res.ok) {
        const data = await res.json()
        setJoinRequests(prev => prev.filter(r => r.user.id !== requesterId))
        if (action === 'approve' && data.group) {
          setGroups(prev => prev.map(g => g.id === selectedChat.id ? data.group : g))
          setSelectedChat(data.group)
        }
      }
    } catch {}
  }

  const handleJoinGroup = async () => {
    if (!joinCode.trim() || !user) return; setIsJoining(true); setJoinError('')
    try {
      const res = await fetch('/api/groups/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, inviteCode: joinCode.trim() }) })
      const d = await res.json()
      if (!res.ok) { setJoinError(d.error || 'Failed to join group'); return }
      if (d.alreadyMember) { setJoinError("You're already a member of this group!"); return }
      // Private group — request sent, waiting for admin approval
      if (d.pending) {
        setShowJoinModal(false)
        setJoinCode('')
        setPendingApproval({ groupName: d.groupName })
        return
      }
      // Public group — instant join
      setGroups(p => [...p, d.group]); setShowJoinModal(false); setJoinCode(''); handleSelectChat(d.group)
    } catch { setJoinError('Something went wrong.') }
    finally { setIsJoining(false) }
  }
  const getSortedGroups = (list: Group[]): Group[] => {
    const defaults: Group[] = []; const pinned: Group[] = []; const rest: Group[] = []
    for (const g of list) {
      if (g.isDefault) defaults.push(g)
      else if (pinnedGroupId && g.id === pinnedGroupId) pinned.push(g)
      else rest.push(g)
    }
    return [...defaults, ...pinned, ...rest]
  }

  // ─── Initial load ───
  useEffect(() => {
    const loadData = async () => {
      try {
        const userStr = localStorage.getItem('user')
        if (!userStr) { router.push('/auth'); return }
        const currentUser = JSON.parse(userStr) as User
        setUser(currentUser)
        setPinnedGroupId(currentUser.pinnedGroupId || null)

        // Pre-connect Ably immediately on page load — don't wait for useEffect.
        // This eliminates the cold-start delay where the first message arrives
        // before Ably has finished authenticating.
        // Pre-connect Ably immediately with userId — eliminates cold-start delay
        // and ensures fresh signup users can auth without a session cookie
        try {
          const ablyInstance = getAblyClient(currentUser.id)
          if (ablyInstance.connection.state === 'initialized') {
            ablyInstance.connect()
          }
        } catch {}

        const groupsRes = await fetch(`/api/groups?userId=${currentUser.id}`)
        if (groupsRes.ok) { const d = await groupsRes.json(); setGroups(d.groups || []) }
        const dmRes = await fetch(`/api/dm?userId=${currentUser.id}`)
        let convs: DMConversation[] = []
        if (dmRes.ok) {
          const d = await dmRes.json()
          convs = d.conversations || []
          setDmConversations(convs)
          // Signal the real-time engine to subscribe to all these DM channels now
          window.dispatchEvent(new Event('dms-loaded'))
        }

        try {
          const params = new URLSearchParams(window.location.search)
          const joinCodeParam = params.get('joinCode')
          if (joinCodeParam) { setJoinCode(joinCodeParam); setShowJoinModal(true); window.history.replaceState({}, '', '/home') }
          // Handle group message notification click: ?groupId=X (no approveUser)
          const groupIdParam = params.get('groupId')
          const approveUserParam = params.get('approveUser')
          if (groupIdParam && !approveUserParam) {
            window.history.replaceState({}, '', '/home')
            setTimeout(() => {
              setGroups(prev => {
                const g = prev.find(g => g.id === groupIdParam)
                if (g) { setSelectedChat(g); setSelectedDM(null); loadMessages(g.id) }
                return prev
              })
            }, 300)
          }

          // Handle join-request notification click: ?groupId=X&approveUser=Y
          if (groupIdParam && approveUserParam) {
            window.history.replaceState({}, '', '/home')
            // Wait briefly for groups to load then open join requests
            setTimeout(async () => {
              const userStr2 = localStorage.getItem('user')
              if (!userStr2) return
              const u2 = JSON.parse(userStr2)
              const res = await fetch(`/api/groups/${groupIdParam}?adminId=${u2.id}`)
              if (res.ok) {
                const data = await res.json()
                setJoinRequests(data.requests || [])
                setShowJoinRequests(true)
                // Also select the group
                const groupsRes2 = await fetch(`/api/groups?userId=${u2.id}`)
                if (groupsRes2.ok) {
                  const gd = await groupsRes2.json()
                  const g = (gd.groups || []).find((g: any) => g.id === groupIdParam)
                  if (g) { setSelectedChat(g); loadMessages(g.id) }
                }
              }
            }, 500)
          }

          // Auto-switch to DMs tab if requested (e.g. from explore page)
          const tabParam = params.get('tab')
          if (tabParam === 'dms') setActiveTab('dms')

          const openDMId = params.get('openDM')
          if (openDMId) {
            const dmDataStr = sessionStorage.getItem('openDM')
            let dmData: any = null
            if (dmDataStr) {
              dmData = JSON.parse(dmDataStr)
              sessionStorage.removeItem('openDM')
            } else {
              const dmName = params.get('dmName') || ''
              const nameParts = dmName.split(' ')
              dmData = { id: openDMId, firstName: nameParts[0] || '', lastName: nameParts.slice(1).join(' ') || '' }
            }
            setActiveTab('dms')
            const existing = convs.find(c => c.user.id === dmData.id || c.user.id === openDMId)
            if (existing) {
              setSelectedDM(existing); setSelectedChat(null)
              // Load existing messages — was missing, caused empty chat on Connect
              const dmRes2 = await fetch(`/api/dm?otherUserId=${existing.user.id}&userId=${currentUser.id}`)
              if (dmRes2.ok) { const d = await dmRes2.json(); setDmMessages(d.messages || []) }
              // Mark as read
              setDmConversations(prev => prev.map(conv =>
                conv.user.id === existing.user.id ? { ...conv, unreadCount: 0 } : conv
              ))
            } else {
              setSelectedDM({ user: dmData, lastMessage: '', lastMessageAt: new Date().toISOString(), unreadCount: 0 })
              setSelectedChat(null); setDmMessages([])
            }
            // ✅ Read window.innerWidth directly — isMobile state is stale at mount time
            if (window.innerWidth < 768) setMobileView('chat')
            window.history.replaceState({}, '', '/home')
          }
        } catch {}
      } catch (err) { console.error('Error:', err) }
      finally { setIsLoading(false) }
    }
    loadData()
  }, [router])

  // ─── Ably: REAL-TIME ENGINE ──────────────────────────────────────────────
  // Single persistent effect. Never tears down. Handles everything.
  // Architecture: one Map of subscribed DM channels, grown dynamically.
  // Any time we learn about a new conversation partner, we subscribe immediately.
  useEffect(() => {
    if (!user) return

    const ably = getAblyClient(user.id)

    // Ensure connection is established before subscribing
    // If already connected, this is instant. If not, channels queue until ready.
    if (ably.connection.state !== 'connected' && ably.connection.state !== 'connecting') {
      ably.connect()
    }

    // Map of otherUserId → Ably channel — grows as new conversations appear
    const dmChannelMap = new Map<string, Ably.RealtimeChannel>()

    // ── Core: subscribe to a DM channel permanently ───────────────────────────
    const subscribeDM = (otherUserId: string, otherUser?: any) => {
      if (!otherUserId || dmChannelMap.has(otherUserId)) return

      const chName = getDMChannelName(user.id, otherUserId)
      const ch = ably.channels.get(chName)
      dmChannelMap.set(otherUserId, ch)

      ch.subscribe('new-message', (msg: Ably.Message) => {
        const { message: m } = msg.data as { message: DMMessage }
        if (!m) return

        const isOpen = selectedDMRef.current?.user.id === otherUserId

        if (isOpen) {
          // Chat is open — push message into view immediately
          setDmMessages(prev => {
            if (prev.some(x => x.id === m.id)) return prev
            const tempIdx = prev.findIndex(x =>
              x.id.startsWith('temp_') && x.senderId === m.senderId && x.content === m.content
            )
            if (tempIdx >= 0) {
              const next = [...prev]
              next[tempIdx] = m
              return next
            }
            if (m.senderId !== user.id) playReceiveSound()
            return [...prev, m]
          })
          // Keep sidebar last-message in sync
          setDmConversations(prev => prev.map(cv =>
            cv.user.id === otherUserId
              ? { ...cv, lastMessage: m.content || '📎 Attachment', lastMessageAt: m.createdAt, unreadCount: 0 }
              : cv
          ))
        } else {
          // Chat not open — increment unread, bubble to top
          if (m.senderId !== user.id) playReceiveSound()
          setDmConversations(prev => {
            const idx = prev.findIndex(cv => cv.user.id === otherUserId)
            if (idx >= 0) {
              const next = [...prev]
              next[idx] = {
                ...next[idx],
                lastMessage: m.content || '📎 Attachment',
                lastMessageAt: m.createdAt,
                unreadCount: m.senderId !== user.id
                  ? (next[idx].unreadCount || 0) + 1
                  : next[idx].unreadCount,
              }
              return next.sort((a, b) =>
                new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
              )
            }
            // Brand new convo (received from someone not yet in list)
            if (otherUser) {
              return [{
                user: otherUser,
                lastMessage: m.content || '📎 Attachment',
                lastMessageAt: m.createdAt,
                unreadCount: m.senderId !== user.id ? 1 : 0,
              }, ...prev]
            }
            return prev
          })
        }
      })

      ch.subscribe('message-deleted', (msg: Ably.Message) => {
        const { messageId } = msg.data as { messageId: string }
        if (selectedDMRef.current?.user.id === otherUserId) {
          setDmMessages(prev => prev.filter(m => m.id !== messageId))
        }
      })

      ch.subscribe('message-edited', (msg: Ably.Message) => {
        const { messageId, content } = msg.data as { messageId: string; content: string }
        if (selectedDMRef.current?.user.id === otherUserId) {
          setDmMessages(prev => prev.map(m => m.id === messageId ? { ...m, content } : m))
        }
      })

      ch.subscribe('reaction-updated', (msg: Ably.Message) => {
        const { messageId, reactions } = msg.data as { messageId: string; reactions: any[] }
        if (selectedDMRef.current?.user.id === otherUserId) {
          setDmMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m))
        }
      })
    }

    // ── Personal user channel ─────────────────────────────────────────────────
    const uch = ably.channels.get(`user-${user.id}`)

    uch.subscribe('new-dm-notification', (msg: Ably.Message) => {
      const data = msg.data as { from: any; preview: string; timestamp: string }
      if (!data?.from?.id) return

      // CRITICAL: subscribe to this sender's DM channel immediately
      // This is the primary subscription trigger for new conversations
      subscribeDM(data.from.id, data.from)

      const isOpen = selectedDMRef.current?.user.id === data.from.id
      if (!isOpen) {
        const dmChatId = `dm_${data.from.id}`
        if (!mutedChatsRef.current.has(dmChatId)) playReceiveSound()
      }

      // Update sidebar preview + unread badge
      setDmConversations(prev => {
        const idx = prev.findIndex(cv => cv.user.id === data.from.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = {
            ...next[idx],
            lastMessage: data.preview,
            lastMessageAt: data.timestamp,
            unreadCount: isOpen ? 0 : (next[idx].unreadCount || 0) + 1,
          }
          return next.sort((a, b) =>
            new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
          )
        }
        return [{
          user: data.from,
          lastMessage: data.preview,
          lastMessageAt: data.timestamp,
          unreadCount: isOpen ? 0 : 1,
        }, ...prev]
      })
    })

    uch.subscribe('group-approved', (msg: Ably.Message) => {
      const data = msg.data as { groupId: string }
      const userStr = localStorage.getItem('user')
      if (!userStr) return
      const u = JSON.parse(userStr)
      fetch(`/api/groups?userId=${u.id}`)
        .then(r => r.json())
        .then(d => {
          const g = (d.groups || []).find((g: Group) => g.id === data.groupId)
          if (g) setGroups(prev => prev.some(x => x.id === g.id) ? prev : [...prev, g])
        }).catch(() => {})
    })

    uch.subscribe('new-group-notification', (msg: Ably.Message) => {
      const data = msg.data as {
        groupId: string; groupName: string; from: any
        preview: string; messageId: string; timestamp: string
      }
      const isCurrentGroup = selectedChatRef.current?.id === data.groupId
      if (!isCurrentGroup && !mutedChatsRef.current.has(`group_${data.groupId}`)) {
        playReceiveSound()
      }
      setGroups(prev => prev.map(g => {
        if (g.id !== data.groupId) return g
        const newMsg = {
          id: data.messageId, content: data.preview,
          groupId: data.groupId, userId: data.from.id,
          user: data.from, reactions: [], createdAt: data.timestamp,
        }
        return { ...g, messages: [...(g.messages || []), newMsg] }
      }))
    })

    // ── Subscribe to ALL existing DM conversations ────────────────────────────
    // Called after dmConversations loads. Uses a ref-based approach so we don't
    // depend on React state being available at effect-run time.
    const subscribeAllExisting = () => {
      setDmConversations(prev => {
        prev.forEach(cv => subscribeDM(cv.user.id, cv.user))
        return prev
      })
    }

    // Run immediately (catches conversations already in state)
    subscribeAllExisting()

    // Also run after a short delay to catch conversations loaded by loadData
    // loadData is async and runs after this effect — this bridges the gap
    const t1 = setTimeout(subscribeAllExisting, 500)
    const t2 = setTimeout(subscribeAllExisting, 1500)
    const t3 = setTimeout(subscribeAllExisting, 3000)

    // Listen for window event fired by loadData when DM conversations finish loading
    const handleDMsLoaded = () => subscribeAllExisting()
    window.addEventListener('dms-loaded', handleDMsLoaded)

    return () => {
      uch.unsubscribe()
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      window.removeEventListener('dms-loaded', handleDMsLoaded)
      dmChannelMap.forEach(ch => { try { ch.unsubscribe() } catch {} })
      dmChannelMap.clear()
    }
  }, [user?.id])

  // ─── Ably: Chat-specific channels (group or DM) ───
  useEffect(() => {
    if (!user) return
    const ably = getAblyClient(user.id)
    const channels: Ably.RealtimeChannel[] = []

    if (selectedChat) {
      const ch = ably.channels.get(getGroupChannelName(selectedChat.id))
      channels.push(ch)

      ch.subscribe('new-message', (msg: Ably.Message) => {
        const data = msg.data as { message: Message }
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev
          const tempIdx = prev.findIndex(m => m.id.startsWith('temp_') && m.userId === data.message.userId && m.content === data.message.content)
          if (tempIdx >= 0) { const next = [...prev]; next[tempIdx] = data.message; return next }
          if (data.message.userId !== user.id) playReceiveSound()
          return [...prev, data.message]
        })
      })

      ch.subscribe('message-deleted', (msg: Ably.Message) => {
        const data = msg.data as { messageId: string }
        setMessages(prev => prev.filter(m => m.id !== data.messageId))
      })

      ch.subscribe('message-edited', (msg: Ably.Message) => {
        const data = msg.data as { messageId: string; content: string }
        setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, content: data.content } : m))
      })

      // ✅ Sync group reactions in real-time for ALL members (not just the reactor)
      ch.subscribe('reaction-updated', (msg: Ably.Message) => {
        const data = msg.data as { messageId: string; reactions: Reaction[] }
        setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
      })

      ch.subscribe('typing', (msg: Ably.Message) => {
        const data = msg.data as { userId: string; userName: string; isTyping: boolean }
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

      ch.subscribe('group-deleted', () => {
        setGroups(prev => prev.filter(g => g.id !== selectedChat?.id))
        setSelectedChat(null)
      })

      ch.subscribe('member-left', (msg: Ably.Message) => {
        const data = msg.data as { userId: string; groupId: string }
        setGroups(prev => prev.map(g => {
          if (g.id !== data.groupId) return g
          return { ...g, members: g.members.filter(m => m.userId !== data.userId) }
        }))
        setSelectedChat(prev => {
          if (!prev || prev.id !== data.groupId) return prev
          return { ...prev, members: prev.members.filter(m => m.userId !== data.userId) }
        })
      })
    }

    // ✅ Declared outside if(selectedDM) so cleanup return() can reference it
    let activeDMMessageHandler: ((msg: Ably.Message) => void) | null = null

    if (selectedDM) {
      const ch = ably.channels.get(getDMChannelName(user.id, selectedDM.user.id))
      channels.push(ch)

      // Named handler — only this one gets removed on cleanup, not the global subscribeDM handler
      activeDMMessageHandler = (msg: Ably.Message) => {
        const data = msg.data as { message: DMMessage }
        const m = data.message
        setDmMessages(prev => {
          if (prev.some(x => x.id === m.id)) return prev
          const tempIdx = prev.findIndex(x =>
            x.id.startsWith('temp_') && x.senderId === m.senderId && x.content === m.content
          )
          if (tempIdx >= 0) { const next = [...prev]; next[tempIdx] = m; return next }
          return [...prev, m]
        })
        setDmConversations(prev => prev.map(c =>
          c.user.id === selectedDM.user.id
            ? { ...c, lastMessage: m.content || '📎 Attachment', lastMessageAt: m.createdAt, unreadCount: 0 }
            : c
        ))
      }
      ch.subscribe('new-message', activeDMMessageHandler!)

      ch.subscribe('message-deleted', (msg: Ably.Message) => {
        const data = msg.data as { messageId: string }
        setDmMessages(prev => prev.filter(m => m.id !== data.messageId))
      })

      ch.subscribe('message-edited', (msg: Ably.Message) => {
        const data = msg.data as { messageId: string; content: string }
        setDmMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, content: data.content } : m))
      })

      ch.subscribe('messages-read', (msg: Ably.Message) => {
        const data = msg.data as { readBy: string; readAt: string }
        if (data.readBy !== user.id) {
          setDmReadStatus(true)
          setDmMessages(prev => prev.map(m => m.senderId === user.id ? { ...m, read: true } : m))
        }
      })

      ch.subscribe('reaction-updated', (msg: Ably.Message) => {
        const data = msg.data as { messageId: string; reactions: Reaction[] }
        setDmMessages(prev => prev.map(m =>
          m.id === data.messageId ? { ...m, reactions: data.reactions } : m
        ))
      })

      ch.subscribe('typing', (msg: Ably.Message) => {
        const data = msg.data as { userId: string; userName: string; isTyping: boolean }
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

    return () => {
      setTypingUsers({})
      setDmReadStatus(false)
      channels.forEach(ch => {
        try {
          // Only fully detach group channels — DM channels must stay attached
          // because the persistent subscribeDM handler uses the same channel object.
          // ✅ FIX: Use ch.unsubscribe(activeDMMessageHandler) — NOT ch.unsubscribe()
          // ch.unsubscribe() with no args kills ALL listeners including the global one,
          // which caused messages to stop appearing in the chat window after switching tabs.
          if (ch.name.startsWith('group-')) {
            ch.detach()
          } else if (activeDMMessageHandler) {
            ch.unsubscribe(activeDMMessageHandler)
          }
        } catch {}
      })
    }
  }, [selectedChat?.id, selectedDM?.user.id, user?.id])

  // ── Reconnect handler — re-fetch any messages missed during disconnect ──
  useEffect(() => {
    if (!user) return

    const handleReconnect = () => {
      // Re-fetch active DM messages missed during disconnect
      if (selectedDMRef.current && dmMessagesRef.current.length > 0) {
        const lastMsg = dmMessagesRef.current[dmMessagesRef.current.length - 1]
        fetch(`/api/dm?otherUserId=${selectedDMRef.current.user.id}&userId=${user.id}&after=${encodeURIComponent(lastMsg.createdAt)}`)
          .then(r => r.json())
          .then(d => {
            if (d.messages?.length) {
              setDmMessages(prev => {
                const ids = new Set(prev.map(m => m.id))
                const fresh = d.messages.filter((m: any) => !ids.has(m.id))
                return fresh.length ? [...prev, ...fresh] : prev
              })
            }
          }).catch(() => {})
      }
      // Re-fetch active group messages missed during disconnect
      if (selectedChatRef.current && messagesRef.current.length > 0) {
        const lastMsg = messagesRef.current[messagesRef.current.length - 1]
        fetch(`/api/messages?groupId=${selectedChatRef.current.id}&after=${encodeURIComponent(lastMsg.createdAt)}`)
          .then(r => r.json())
          .then(d => {
            if (d.messages?.length) {
              setMessages(prev => {
                const ids = new Set(prev.map(m => m.id))
                const fresh = d.messages.filter((m: any) => !ids.has(m.id))
                return fresh.length ? [...prev, ...fresh] : prev
              })
            }
          }).catch(() => {})
      }
    }

    window.addEventListener('ably-reconnected', handleReconnect)
    return () => window.removeEventListener('ably-reconnected', handleReconnect)
  }, [user?.id])

  // ── Notification bell navigation ──
  // NotificationBell fires this custom event instead of router.push() when already on /home
  // because router.push() to the same pathname does NOT re-trigger useEffect URL param reading.
  useEffect(() => {
    if (!user) return

    const handler = (e: Event) => {
      const { type, userId: targetUserId, dmName, groupId, tab } = (e as CustomEvent).detail

      if (type === 'dm' && targetUserId) {
        setActiveTab('dms')
        const existing = dmConversations.find(c => c.user.id === targetUserId)
        if (existing) {
          handleSelectDM(existing)
        } else {
          const nameParts = (dmName || '').split(' ')
          setSelectedDM({
            user: { id: targetUserId, firstName: nameParts[0] || '', lastName: nameParts.slice(1).join(' ') || '' },
            lastMessage: '', lastMessageAt: new Date().toISOString(), unreadCount: 0,
          })
          setSelectedChat(null)
          setDmMessages([])
          loadDMMessages(targetUserId)
        }
        if (isMobile) setMobileView('chat')
      }

      if (type === 'group' && groupId) {
        setActiveTab('groups')
        const group = groups.find(g => g.id === groupId)
        if (group) {
          handleSelectChat(group)
          if (isMobile) setMobileView('chat')
        }
      }

      if (type === 'tab' && tab) {
        setActiveTab(tab)
      }
    }

    window.addEventListener('notification-navigate', handler)
    return () => window.removeEventListener('notification-navigate', handler)
  }, [user, groups, dmConversations, isMobile])


  // ── Polling fallback — guarantees message delivery even if Ably fails ────────
  // Polls every 4 seconds when a DM is open. Only fires if Ably is not connected.
  // This ensures 100% delivery on all devices/networks regardless of WS support.
  useEffect(() => {
    if (!user) return

    const poll = async () => {
      const ably = getAblyClient(user.id)
      const ablyOk = ably.connection.state === 'connected'

      // If Ably is healthy, skip polling — real-time handles it
      if (ablyOk) return

      // Ably not connected — fall back to polling for open DM
      if (selectedDMRef.current && dmMessagesRef.current.length > 0) {
        const last = dmMessagesRef.current[dmMessagesRef.current.length - 1]
        try {
          const res = await fetch(
            `/api/dm?otherUserId=${selectedDMRef.current.user.id}&userId=${user.id}&after=${encodeURIComponent(last.createdAt)}`
          )
          if (res.ok) {
            const d = await res.json()
            if (d.messages?.length) {
              setDmMessages(prev => {
                const ids = new Set(prev.map((m: any) => m.id))
                const fresh = d.messages.filter((m: any) => !ids.has(m.id))
                if (fresh.length > 0) playReceiveSound()
                return fresh.length ? [...prev, ...fresh] : prev
              })
            }
          }
        } catch {}
      }

      // Also refresh conversation list unread counts
      try {
        const res = await fetch(`/api/dm?userId=${user.id}`)
        if (res.ok) {
          const d = await res.json()
          if (d.conversations?.length) {
            setDmConversations(d.conversations)
          }
        }
      } catch {}
    }

    const interval = setInterval(poll, 4000)
    return () => clearInterval(interval)
  }, [user?.id])


  // ── Presence ──
  useEffect(() => {
    if (!user) return
    const ably = getAblyClient(user.id)
    const presenceCh = ably.channels.get('presence-updates')

    presenceCh.subscribe('status-change', (msg: Ably.Message) => {
      const data = msg.data as { userId: string; status: string }
      setOnlineUsers(prev => {
        const next = new Set(prev)
        if (data.status === 'online') next.add(data.userId)
        else next.delete(data.userId)
        return next
      })
    })

    const reportOnline = () => {
      fetch('/api/ably/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, status: 'online' }) }).catch(() => {})
    }
    reportOnline()
    const heartbeat = setInterval(reportOnline, 30000)

    const handleUnload = () => {
      navigator.sendBeacon('/api/ably/presence', JSON.stringify({ userId: user.id, status: 'offline' }))
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => {
      clearInterval(heartbeat)
      window.removeEventListener('beforeunload', handleUnload)
      presenceCh.unsubscribe()
      handleUnload()
    }
  }, [user?.id])

  // ── Typing indicator ──
  const sendTypingEvent = useCallback(() => {
    if (!user) return
    const now = Date.now()
    if (now - lastTypingSentRef.current < 2000) return
    lastTypingSentRef.current = now
    const body: any = { userId: user.id, userName: `${user.firstName} ${user.lastName}`, isTyping: true }
    if (selectedChat) { body.channelType = 'group'; body.channelId = selectedChat.id }
    else if (selectedDM) { body.channelType = 'dm'; body.channelId = selectedDM.user.id; body.otherUserId = selectedDM.user.id }
    else return
    fetch('/api/ably/typing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {})
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      fetch('/api/ably/typing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, isTyping: false }) }).catch(() => {})
    }, 3000)
  }, [user, selectedChat, selectedDM])

  // ── Light polling fallback (every 15s as backup only) ──
  useEffect(() => {
    const poll = async () => {
      try {
        if (selectedChatRef.current && messagesRef.current.length > 0) {
          const lastMsg = messagesRef.current[messagesRef.current.length - 1]
          if (lastMsg.id.startsWith('temp_')) return
          const res = await fetch(`/api/messages?groupId=${selectedChatRef.current.id}&after=${encodeURIComponent(lastMsg.createdAt)}`)
          if (res.ok) { const data = await res.json(); if (data.messages?.length > 0) { setMessages(prev => { const ids = new Set(prev.map(m => m.id)); const n = data.messages.filter((m: Message) => !ids.has(m.id)); return n.length > 0 ? [...prev, ...n] : prev }) } }
        }
        if (selectedDMRef.current && dmMessagesRef.current.length > 0) {
          const lastMsg = dmMessagesRef.current[dmMessagesRef.current.length - 1]
          if (lastMsg.id.startsWith('temp_')) return
          const res = await fetch(`/api/dm?otherUserId=${selectedDMRef.current.user.id}&after=${encodeURIComponent(lastMsg.createdAt)}`)
          if (res.ok) { const data = await res.json(); if (data.messages?.length > 0) { setDmMessages(prev => { const ids = new Set(prev.map(m => m.id)); const n = data.messages.filter((m: DMMessage) => !ids.has(m.id)); return n.length > 0 ? [...prev, ...n] : prev }) } }
        }
      } catch {}
    }
    const interval = setInterval(poll, 15000)
    return () => clearInterval(interval)
  }, [])

  // AbortController ref — cancels in-flight fetch if user switches chat before it resolves
  const loadMsgAbortRef = useRef<AbortController | null>(null)
  const loadMessages = async (groupId: string) => {
    loadMsgAbortRef.current?.abort()
    const ctrl = new AbortController()
    loadMsgAbortRef.current = ctrl
    setIsLoadingMessages(true)
    try {
      const res = await fetch(`/api/messages?groupId=${groupId}`, { signal: ctrl.signal })
      if (res.ok) { const d = await res.json(); setMessages(d.messages || []) }
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('loadMessages error:', err)
    } finally {
      setIsLoadingMessages(false)
    }
  }

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
    setMessages(prev => [...prev, optimisticMsg]); playSendSound()
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
    setDmMessages(prev => [...prev, optimisticMsg]); playSendSound()
    const savedMsg = newDMMessage; const savedImg = imagePreview; const savedFile = pendingFile; const savedReply = replyingTo
    setNewDMMessage(''); clearAttachments(); setShowInputEmoji(false); setShowGifPicker(false); setReplyingTo(null)
    if (inputRef.current) { inputRef.current.style.height = 'auto' }
    try {
      const body: any = { content: savedMsg, receiverId: selectedDM.user.id, senderId: user.id }
      if (savedImg) body.imageUrl = savedImg
      if (savedFile) { body.fileUrl = savedFile.url; body.fileName = savedFile.name; body.fileType = savedFile.type }
      if (savedReply) body.replyToId = savedReply.id
      const res = await fetch('/api/dm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        const data = await res.json()
        const sentMsg = data.message
        setDmMessages(prev => prev.map(m => m.id === tempId ? sentMsg : m))
        // Add to DM sidebar instantly if this is the first message (new conversation)
        setDmConversations(prev => {
          const exists = prev.some(c => c.user.id === selectedDM!.user.id)
          if (exists) {
            // Update last message preview
            return prev.map(c => c.user.id === selectedDM!.user.id
              ? { ...c, lastMessage: sentMsg.content || '📎 Attachment', lastMessageAt: sentMsg.createdAt }
              : c
            ).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
          }
          // Brand new conversation — add it to the top
          // The persistent effect's interval will pick this up within 3s
          // and subscribe to the DM channel automatically
          return [{
            user: selectedDM!.user,
            lastMessage: sentMsg.content || '📎 Attachment',
            lastMessageAt: sentMsg.createdAt,
            unreadCount: 0,
          }, ...prev]
        })
      }
      else { setDmMessages(prev => prev.filter(m => m.id !== tempId)) }
    } catch { setDmMessages(prev => prev.filter(m => m.id !== tempId)) }
  }

  const handleGifSelect = (url: string, type: 'gif' | 'sticker') => {
    if (type === 'sticker') {
      if (selectedChat) { setNewMessage(url); setTimeout(() => { const form = document.getElementById('chat-form') as HTMLFormElement; form?.requestSubmit() }, 50) }
      else if (selectedDM) { setNewDMMessage(url); setTimeout(() => { const form = document.getElementById('chat-form') as HTMLFormElement; form?.requestSubmit() }, 50) }
    } else {
      setImagePreview(url)
      setTimeout(() => { const form = document.getElementById('chat-form') as HTMLFormElement; form?.requestSubmit() }, 50)
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
        body: JSON.stringify({ name: groupForm.name, description: groupForm.description, userId: user?.id, visibility: groupForm.visibility, icon: groupForm.icon || undefined }) })
      if (res.ok) { const d = await res.json(); setGroups(p => [...p, d.group]); setShowCreateGroup(false); setGroupForm({ name: '', description: '', visibility: 'public', icon: '' }); setGroupErrors({}) }
    } catch (err) { console.error('Error:', err) }
    finally { setIsCreating(false) }
  }

  const handleSelectChat = (group: Group) => {
    isInitialLoadRef.current = true   // reset so next load scrolls instantly
    setSelectedChat(group); setSelectedDM(null); setShowGroupInfo(false); clearAttachments()
    setShowInputEmoji(false); setShowGifPicker(false); setShowHeaderMenu(false); setReplyingTo(null)
    markGroupRead(group.id); loadMessages(group.id)
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return; setShowEmojiPicker(null)
    try {
      const res = await fetch('/api/messages/reactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId, userId: user.id, emoji }) })
      if (res.ok) {
        const data = await res.json()
        if (data.reactions) {
          // API returns full updated reactions array — update state directly, no reload needed
          setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: data.reactions } : m))
        } else if (selectedChat) {
          // Fallback: API returns older format without reactions array — reload messages
          loadMessages(selectedChat.id)
        }
      }
    } catch {}
  }
  const handleDMReaction = async (messageId: string, emoji: string) => {
    if (!user || !selectedDM) return; setShowEmojiPicker(null)
    try {
      const res = await fetch('/api/dm/reactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId, userId: user.id, emoji }) })
      if (res.ok) {
        const data = await res.json()
        // Update state directly — no full reload needed
        if (data.reactions) {
          setDmMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: data.reactions } : m))
          // Also broadcast via Ably so the other user sees it live
          const channel = getDMChannelName(user.id, selectedDM.user.id)
          // The API already publishes via Ably, so no client-side publish needed
        }
      }
    } catch {}
  }
  const loadDMAbortRef = useRef<AbortController | null>(null)
  const loadDMMessages = async (otherUserId: string) => {
    if (!user) return
    loadDMAbortRef.current?.abort()
    const ctrl = new AbortController()
    loadDMAbortRef.current = ctrl
    setIsLoadingMessages(true)
    try {
      const res = await fetch(`/api/dm?otherUserId=${otherUserId}&userId=${user.id}`, { signal: ctrl.signal })
      if (res.ok) { const d = await res.json(); setDmMessages(d.messages || []) }
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('loadDMMessages error:', err)
    } finally {
      setIsLoadingMessages(false)
    }
  }
  const handleSelectDM = (conv: DMConversation) => {
    isInitialLoadRef.current = true   // reset so next load scrolls instantly
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
    try { const res = await fetch(`/api/classmates?userId=${user.id}&search=${encodeURIComponent(search)}`); if (res.ok) { const d = await res.json(); setPingClassmates(d.students || []) } } catch {}
    finally { setIsLoadingPing(false) }
  }
  useEffect(() => { if (showPingModal) { const t = setTimeout(() => loadPingClassmates(pingSearchQuery), 300); return () => clearTimeout(t) } }, [pingSearchQuery, showPingModal])

  const handleLogout = () => setShowLogoutModal(true)
  const confirmLogout = () => {
    localStorage.removeItem('user')
    // Close Ably connection on logout so next login gets a fresh client
    try { getAblyClient().close() } catch {}
    router.push('/auth')
  }
  const filteredGroups = getSortedGroups(groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.description?.toLowerCase().includes(searchQuery.toLowerCase())))
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
    // Keep focus on input so user can keep typing after selecting emoji
    setTimeout(() => inputRef.current?.focus(), 0)
  }
  const getGroupMembers = () => {
    if (!selectedChat) return []; let members = selectedChat.members || []
    if (memberSearch) { const q = memberSearch.toLowerCase(); members = members.filter(m => `${m.user.firstName} ${m.user.lastName}`.toLowerCase().includes(q) || m.user.major?.toLowerCase().includes(q)) }
    if (memberYearFilter) members = members.filter(m => m.user.year === memberYearFilter)
    if (memberSemesterFilter) members = members.filter(m => m.user.semester === memberSemesterFilter)
    return members
  }
  const getAvailableYears = () => { if (!selectedChat) return []; return [...new Set(selectedChat.members?.map(m => m.user.year).filter(Boolean) as string[])] }
  const getAvailableSemesters = () => { if (!selectedChat) return []; return [...new Set(selectedChat.members?.map(m => m.user.semester).filter(Boolean) as string[])] }
  const toggleGroupInfo = () => { setShowGroupInfo(p => !p); setMemberSearch(''); setMemberYearFilter(''); setMemberSemesterFilter('') }

  const handleReply = (msg: Message | DMMessage) => {
    const isGroupMsg = 'userId' in msg
    const userName = isGroupMsg ? `${(msg as Message).user.firstName} ${(msg as Message).user.lastName}` : `${(msg as DMMessage).sender.firstName} ${(msg as DMMessage).sender.lastName}`
    setReplyingTo({ id: msg.id, content: msg.content, userName, imageUrl: msg.imageUrl }); setMessageActionId(null); inputRef.current?.focus()
  }
  const handleCopyMessage = (msg: Message | DMMessage) => {
    navigator.clipboard.writeText(msg.content || '').then(() => { setCopiedMsgId(msg.id); setMessageActionId(null); setTimeout(() => setCopiedMsgId(null), 2000) })
  }
  const handleDeleteForEveryone = async (msg: Message | DMMessage) => {
    setMessageActionId(null)
    try {
      const res = await fetch(`/api/messages/${msg.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, deleteForEveryone: true }),
      })
      if (res.ok) setMessages(prev => prev.filter(m => m.id !== msg.id))
    } catch {}
  }
  const handleDeleteMessage = async (msg: Message | DMMessage) => {
    setMessageActionId(null); const isGroupMsg = 'groupId' in msg
    try { const res = await fetch(`/api/messages/${msg.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id }) }); if (res.ok) { if (isGroupMsg) setMessages(prev => prev.filter(m => m.id !== msg.id)); else setDmMessages(prev => prev.filter(m => m.id !== msg.id)) } } catch {}
  }
  const handleStartEdit = (msg: Message | DMMessage) => { setEditingMessage({ id: msg.id, content: msg.content }); setMessageActionId(null) }
  const handleSaveEdit = async () => {
    if (!editingMessage || !editingMessage.content.trim()) return
    const isGroupMsg = messages.some(m => m.id === editingMessage.id)
    const snapshot = editingMessage // capture before async
    try {
      const res = await fetch(`/api/messages/${snapshot.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: snapshot.content, userId: user?.id }) })
      if (res.ok) {
        if (isGroupMsg) setMessages(prev => prev.map(m => m.id === snapshot.id ? { ...m, content: snapshot.content } : m))
        else setDmMessages(prev => prev.map(m => m.id === snapshot.id ? { ...m, content: snapshot.content } : m))
        setEditingMessage(null) // only clear on success
      }
      // on failure: keep edit textarea open so user can retry
    } catch {
      // network error — keep edit open
    }
  }
  const handleForwardMessage = (msg: Message | DMMessage) => { setForwardingMessage({ content: msg.content, imageUrl: msg.imageUrl }); setMessageActionId(null) }
  const forwardToChat = async (group: Group) => {
    if (!forwardingMessage || !user) return
    setForwardingMessage(null)
    const body: any = { content: forwardingMessage.content || '', groupId: group.id, userId: user.id }
    if (forwardingMessage.imageUrl) body.imageUrl = forwardingMessage.imageUrl
    try { await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) } catch {}
  }
  const forwardToDM = async (conv: DMConversation) => {
    if (!forwardingMessage || !user) return
    setForwardingMessage(null)
    const body: any = { content: forwardingMessage.content || '', receiverId: conv.user.id, senderId: user.id }
    if (forwardingMessage.imageUrl) body.imageUrl = forwardingMessage.imageUrl
    try { await fetch('/api/dm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) } catch {}
  }
  const shouldShowDateSeparator = (msgs: { createdAt: string }[], idx: number) => { if (idx === 0) return true; return new Date(msgs[idx - 1].createdAt).toDateString() !== new Date(msgs[idx].createdAt).toDateString() }

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center"><div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="text-gray-500 text-sm font-medium">Loading Campus Arena...</p></div>
    </div>
  )

  const isGroupMode = selectedChat !== null
  const isDMMode = selectedDM !== null
  const filteredMembers = getGroupMembers()
  const currentChatId = getCurrentChatId()
  const currentMuted = isMuted(currentChatId)
  const currentUserRole = getUserRoleInGroup(selectedChat)

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

  const renderReplyPreview = (replyTo: ReplyTo | null | undefined, isOwn: boolean) => {
    if (!replyTo) return null
    const replyName = replyTo.user
      ? `${replyTo.user.firstName} ${replyTo.user.lastName}`
      : replyTo.sender
        ? `${replyTo.sender.firstName} ${replyTo.sender.lastName}`
        : 'Unknown'

    // True WhatsApp style:
    // - Visually distinct quoted block separated from the actual message
    // - Left colored accent bar
    // - Sender name in accent color (green in WA, indigo here)
    // - Quoted text in muted color, 2 lines max
    // - Thumbnail on right if quoted msg had an image
    // - Slight background to differentiate from the bubble itself
    return (
      <div
        className="flex items-stretch mb-2 rounded-[10px] overflow-hidden"
        style={{
          background: isOwn ? 'rgba(255,255,255,0.12)' : 'rgba(99,102,241,0.06)',
          borderLeft: `3px solid ${isOwn ? 'rgba(255,255,255,0.75)' : '#6366f1'}`,
        }}
      >
        <div className="px-2.5 py-1.5 flex-1 min-w-0 overflow-hidden">
          <p
            className="text-[11px] font-bold leading-tight mb-0.5 truncate"
            style={{ color: isOwn ? 'rgba(255,255,255,0.95)' : '#6366f1' }}
          >
            {replyName}
          </p>
          {replyTo.imageUrl && !replyTo.content ? (
            <p
              className="text-[11px] flex items-center gap-1"
              style={{ color: isOwn ? 'rgba(255,255,255,0.55)' : '#9ca3af' }}
            >
              📷 Photo
            </p>
          ) : replyTo.content ? (
            <p
              className="text-[11px] leading-snug line-clamp-2"
              style={{ color: isOwn ? 'rgba(255,255,255,0.6)' : '#6b7280' }}
            >
              {replyTo.content}
            </p>
          ) : null}
        </div>
        {replyTo.imageUrl && (
          <img
            src={replyTo.imageUrl}
            alt=""
            className="flex-shrink-0 object-cover"
            style={{ width: 46, height: 46 }}
          />
        )}
      </div>
    )
  }

  // Render message text with clickable URLs and group invite links
  const renderMessageContent = (content: string, isOwn: boolean) => {
    if (!content) return null
    // Match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = content.split(urlRegex)
    return parts.map((part, i) => {
      if (!urlRegex.test(part) && !part.match(/^https?:\/\//)) {
        // reset lastIndex after split
        return <React.Fragment key={i}>{part}</React.Fragment>
      }
      // Check if it's a group invite link for this app
      const isInviteLink = part.includes('/home?joinCode=') || part.includes('joinCode=')
      const joinCodeMatch = part.match(/joinCode=([a-z0-9]+)/i)
      if (isInviteLink && joinCodeMatch) {
        return (
          <div
            key={i}
            className={`my-1 rounded-xl overflow-hidden border ${isOwn ? 'border-white/20' : 'border-indigo-100'}`}
            style={isOwn
              ? { background: 'rgba(255,255,255,0.12)' }
              : { background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)' }
            }
          >
            <div className="px-3 py-2.5 flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isOwn ? 'bg-white/20' : 'bg-indigo-100'}`}>
                <span className="text-base">👥</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-semibold uppercase tracking-wide mb-0.5 ${isOwn ? 'text-indigo-200' : 'text-indigo-400'}`}>Group Invite</p>
                <p className={`text-[12px] leading-tight ${isOwn ? 'text-white/80' : 'text-gray-600'}`}>You've been invited to join a group</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setJoinCode(joinCodeMatch[1])
                  setShowJoinModal(true)
                }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${isOwn ? 'bg-white text-indigo-600 hover:bg-indigo-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                Join
              </button>
            </div>
          </div>
        )
      }
      // Regular external URL
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className={`underline break-all ${isOwn ? 'text-indigo-100 hover:text-white' : 'text-indigo-600 hover:text-indigo-800'}`}
        >
          {part}
        </a>
      )
    })
  }

  const renderMsgBubble = (msg: any, idx: number, allMsgs: any[], isDM: boolean) => {
    // System messages ("xyz joined/left/was approved") rendered as centered pill
    // isSystemMessage covers real-time Ably messages; content pattern covers DB-loaded ones
    const isSystemMsg = msg.isSystemMessage ||
      (typeof msg.content === 'string' && !msg.imageUrl && !msg.fileUrl && (
        msg.content.endsWith(' joined the group') ||
        msg.content.endsWith(' left the group') ||
        msg.content.endsWith(' was added to the group') ||
        msg.content.endsWith(' was removed from the group')
      ))
    if (isSystemMsg) {
      return (
        <div key={msg.id} className="flex justify-center my-3">
          <span className="text-[11px] text-gray-500 px-4 py-1 rounded-full" style={{background:'rgba(255,255,255,0.55)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.6)'}}>{msg.content}</span>
        </div>
      )
    }
    const isOwn = isDM ? msg.senderId === user?.id : msg.userId === user?.id
    const isTemp = msg.id.startsWith('temp_')
    const reactions = groupReactions(msg.reactions)
    const reactionEntries = Object.entries(reactions)
    const showDate = shouldShowDateSeparator(allMsgs, idx)
    const prev = idx > 0 ? allMsgs[idx - 1] : null
    const prevSid = prev ? (isDM ? prev.senderId : prev.userId) : null
    const currSid = isDM ? msg.senderId : msg.userId
    const isCons = prev && prevSid === currSid && !showDate && (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 120000)
    const sName = isDM ? `${msg.sender.firstName} ${msg.sender.lastName}` : `${msg.user.firstName} ${msg.user.lastName}`
    const sAvatar = isDM ? msg.sender : msg.user
    const sId = isDM ? msg.senderId : msg.userId
    return (
      <React.Fragment key={msg.id}>
        {showDate && (<div className="flex items-center justify-center my-4"><span className="text-[11px] font-semibold text-indigo-400/70 uppercase tracking-wider px-4 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.6)' }}>{formatDateSeparator(msg.createdAt)}</span></div>)}
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} ${isTemp ? 'opacity-60' : ''} ${isCons ? 'mt-0.5' : 'mt-3'}`}>
          {!isOwn && !isCons && <p className="text-[11px] font-bold text-gray-500 mb-1 ml-12">{sName}</p>}
          <div className={`flex gap-2 ${isMobile ? 'max-w-[82%]' : 'max-w-[65%]'} ${isOwn ? 'flex-row-reverse' : ''} group/msg`}>
            {!isOwn && !isCons && <UserAvatar src={sAvatar.profileImage} firstName={sAvatar.firstName} lastName={sAvatar.lastName} size={32} className="mt-1" onClick={() => setProfileViewUserId(sId)} />}
            {!isOwn && isCons && <div className="w-8 flex-shrink-0"></div>}
            <div className="relative">
              <div className={`px-4 py-2.5 text-sm leading-relaxed ${isOwn ? 'text-white' : 'text-gray-900'}`}
                style={isOwn ? { background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', borderRadius: '20px 20px 6px 20px', boxShadow: '0 2px 12px rgba(99,102,241,0.25)' } : { background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '20px 20px 20px 6px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {renderReplyPreview(msg.replyTo, isOwn)}
                {editingMessage?.id === msg.id ? (
                  <div className="flex flex-col gap-1.5" style={{minWidth: 200, maxWidth: 340}}>
                    <textarea value={editingMessage?.content || ''}
                      onChange={e => { const val = e.target.value; setEditingMessage(prev => prev ? { ...prev, content: val } : prev); e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px' }}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit() }; if (e.key === 'Escape') setEditingMessage(null) }}
                      autoFocus rows={2}
                      className={`w-full px-2 py-1 text-sm rounded-lg outline-none resize-none ${isOwn ? 'bg-white/20 text-white placeholder-white/50' : 'bg-gray-50 text-gray-900'}`}
                      style={{minHeight:36, maxHeight:120}} />
                    <div className="flex gap-2 justify-end text-[11px]"><button onClick={() => setEditingMessage(null)} className="opacity-70 hover:opacity-100">Cancel</button><button onClick={handleSaveEdit} className="font-bold opacity-70 hover:opacity-100">Save ↵</button></div>
                  </div>
                ) : msg.content ? <p className="whitespace-pre-wrap break-words">{renderMessageContent(msg.content, isOwn)}</p> : null}
                {renderAttachment(msg, isOwn)}
              </div>
              {reactionEntries.length > 0 && (
                <div className={`flex gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  {reactionEntries.map(([emoji, data]) => (
                    <button key={emoji} onClick={(e) => { e.stopPropagation(); isDM ? handleDMReaction(msg.id, emoji) : handleReaction(msg.id, emoji) }}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${(data as any).userReacted ? 'bg-indigo-600/20 text-indigo-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} style={{ border: (data as any).userReacted ? '1px solid #a5b4fc' : '1px solid #e5e7eb' }}>
                      <span>{emoji}</span><span className="font-bold">{(data as any).count}</span>
                    </button>
                  ))}
                </div>
              )}
              {!isTemp && (
                <div className={`absolute top-0 ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} transition-all px-1 flex gap-0.5 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover/msg:opacity-100'}`}>
                  <button onClick={() => handleReply(msg)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 active:bg-indigo-50 transition-all" title="Reply"><Reply className="w-3.5 h-3.5" /></button>
                  <button onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id) }} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 active:bg-indigo-50 transition-all" title="React"><Smile className="w-3.5 h-3.5" /></button>
                  <button onClick={(e) => { e.stopPropagation(); setMessageActionId(messageActionId === msg.id ? null : msg.id) }} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 active:bg-indigo-50 transition-all" title="More"><MoreVertical className="w-3.5 h-3.5" /></button>
                </div>
              )}
              {showEmojiPicker === msg.id && (
                <div
                  className="rounded-xl p-1.5 flex gap-0.5"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    marginTop: 4,
                    ...(isOwn ? { right: 0 } : { left: 0 }),
                    zIndex: 50,
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {EMOJI_OPTIONS.map(em => (<button key={em} onClick={() => isDM ? handleDMReaction(msg.id, em) : handleReaction(msg.id, em)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg transition-all">{em}</button>))}
                </div>
              )}
              {messageActionId === msg.id && (
                <div
                  className="rounded-xl py-1.5 w-44"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    // Own messages: open left; others: open right — prevents off-screen clipping
                    ...(isOwn ? { right: 0 } : { left: 0 }),
                    marginTop: 4,
                    zIndex: 50,
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {msg.content && <button onClick={() => handleCopyMessage(msg)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">{copiedMsgId === msg.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}<span>{copiedMsgId === msg.id ? 'Copied!' : 'Copy'}</span></button>}
                  <button onClick={() => handleForwardMessage(msg)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"><Forward className="w-4 h-4 text-gray-400" /><span>Forward</span></button>
                  {isOwn && <button onClick={() => handleStartEdit(msg)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"><Pencil className="w-4 h-4 text-gray-400" /><span>Edit</span></button>}
                  {isOwn && !isDM && <button onClick={() => handleDeleteForEveryone(msg)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4 text-red-400" /><span>Delete for Everyone</span></button>}
                  {isOwn && isDM && <button onClick={() => handleDeleteMessage(msg)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4 text-red-400" /><span>Delete</span></button>}
                  {!isOwn && !isDM && currentUserRole === 'admin' && <button onClick={() => handleDeleteForEveryone(msg)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4 text-red-400" /><span>Delete for Everyone</span></button>}
                </div>
              )}
            </div>
          </div>
          <p className={`text-[10px] text-gray-600 mt-0.5 flex items-center gap-1 ${isOwn ? 'mr-1 justify-end' : isCons ? 'ml-12' : 'ml-12'}`}>
            {isTemp ? 'Sending...' : formatTime(msg.createdAt)}
            {isDM && isOwn && !isTemp && (msg.read ? <CheckCheck className="w-3.5 h-3.5 text-blue-500" /> : <CheckCheck className="w-3.5 h-3.5 text-gray-400" />)}
          </p>
        </div>
      </React.Fragment>
    )
  }

  // ── Mobile helpers ───────────────────────────────────────────────
  const handleSelectChatMobile = (chat: any) => {
    handleSelectChat(chat)
    if (isMobile) setMobileView('chat')
  }
  const handleSelectDMMobile = (conv: DMConversation) => {
    handleSelectDM(conv)
    if (isMobile) setMobileView('chat')
  }

  return (
    <div
      className="flex bg-gray-50"
      style={{ position: "relative", overflow: "hidden", height: '100dvh', minHeight: '-webkit-fill-available' }}
      onClick={() => { initSounds(); setShowEmojiPicker(null); setShowInputEmoji(false); setSidebarMenuId(null); setMessageActionId(null) }}>
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" />
      <input ref={imageInputRef} type="file" className="hidden" onChange={handleImageSelect} accept="image/*" />
      <input ref={groupAvatarInputRef} type="file" className="hidden" onChange={handleGroupAvatarUpload} accept="image/*" />

      {/* ── MOBILE TOP BAR — shown only on mobile when not in chat view ── */}
      {isMobile && mobileView !== 'chat' && (
        <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-30 border-b"
          style={{ background: 'white', borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">CA</span>
            </div>
            <span className="font-bold text-[15px] text-gray-900 tracking-tight">Campus Arena</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell userId={user?.id || ''} />
          </div>
        </div>
      )}

      {/* ── LEFT SIDEBAR — desktop only ── */}
      {!isMobile && (
        <aside className="w-[220px] flex flex-col flex-shrink-0 border-r" style={{ background: 'white', borderColor: '#e5e7eb' }}>
          <div className="px-5 py-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0"><span className="text-white font-bold text-xs">CA</span></div>
              <div className="min-w-0">
                <span className="font-bold text-[15px] text-gray-900 tracking-tight block leading-tight">Campus Arena</span>
                {user?.university && <span className="text-[11px] text-indigo-500 font-semibold truncate block leading-tight mt-0.5">{user.university.split('.')[0].toUpperCase()}</span>}
              </div>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 pt-2 space-y-1">
            <NavItem icon={<MessageSquare className="w-[18px] h-[18px]" />} label="Chat" active />
            <NavItem icon={<Megaphone className="w-[18px] h-[18px]" />} label="Campus Talks" onClick={() => router.push('/home/campus-talks')} />
          </nav>
          <div className="px-3 py-4" style={{ borderTop: '1px solid #e5e7eb' }}><button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all text-sm font-medium"><LogOut className="w-[18px] h-[18px]" /><span>Log out</span></button></div>
        </aside>
      )}

      {/* ── MIDDLE PANEL — full screen on mobile when mobileView==='list' ── */}
      <aside
        className="flex flex-col flex-shrink-0 border-r"
        style={{
          background: 'white', borderColor: '#e5e7eb',
          width: isMobile ? '100%' : '340px',
          display: 'flex',
          position: isMobile ? 'absolute' : 'relative',
          top: isMobile ? '56px' : 0, left: 0, bottom: isMobile ? '60px' : 0, zIndex: isMobile ? 20 : 'auto',
          overflowY: isMobile ? 'auto' : undefined,
          transform: isMobile && mobileView !== 'list' ? 'translateX(-100%)' : 'translateX(0)',
          transition: isMobile ? 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' : undefined,
          visibility: isMobile && mobileView !== 'list' ? 'hidden' : 'visible',
        }}>
        <div className="px-5 pb-4" style={{ borderBottom: '1px solid #e5e7eb', paddingTop: '20px' }}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Chat</h2>
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
        <div className="flex-1 overflow-y-auto px-4 py-4" style={{ paddingBottom: isMobile ? '16px' : undefined }}>
          {activeTab === 'groups' && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Groups ({filteredGroups.length})</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowJoinModal(true)} className="text-[12px] text-indigo-500 font-bold hover:text-indigo-600 flex items-center gap-0.5" title="Join with code"><UserPlus className="w-3.5 h-3.5" />Join</button>
                  <button onClick={() => setShowCreateGroup(true)} className="text-[12px] text-indigo-500 font-bold hover:text-indigo-600 flex items-center gap-0.5"><Plus className="w-3.5 h-3.5" />New</button>
                </div>
              </div>
              <div className="space-y-1.5">
                {filteredGroups.map(group => {
                  const isSel = selectedChat?.id === group.id
                  const chatId = `group_${group.id}`
                  const muted = isMuted(chatId)
                  const isPinned = pinnedGroupId === group.id
                  const isPrivate = group.visibility === 'private'
                  const isDef = group.isDefault
                  return (
                    <div key={group.id} className="relative group/item" data-sidebar-menu>
                      <button onClick={() => handleSelectChatMobile(group)} className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${isSel ? 'shadow-lg shadow-indigo-600/10' : 'hover:bg-gray-50'}`}
                        style={isSel ? { background: '#4f46e5' } : {}}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[11px] font-black tracking-tight overflow-hidden ${isSel ? 'bg-white/60' : 'bg-indigo-50'}`}>
                          {group.icon && !isDef ? (
                            <img src={group.icon} alt={group.name} className="w-full h-full object-cover rounded-xl" />
                          ) : isDef ? (
                            <span className={isSel ? 'text-indigo-700' : 'text-indigo-600'}>
                              {getGroupAbbr(group)}
                            </span>
                          ) : isPrivate ? (
                            <Lock className={`w-4 h-4 ${isSel ? 'text-white' : 'text-indigo-500'}`} />
                          ) : (
                            <Users className={`w-5 h-5 ${isSel ? 'text-white' : 'text-indigo-500'}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-sm font-bold truncate ${isSel ? 'text-white' : 'text-gray-900'}`}>{group.name}</p>
                            {isPinned && <Pin className={`w-3 h-3 flex-shrink-0 ${isSel ? 'text-indigo-200' : 'text-indigo-400'}`} />}
                            {muted && <VolumeX className={`w-3 h-3 flex-shrink-0 ${isSel ? 'text-indigo-200' : 'text-gray-600'}`} />}
                          </div>
                          <p className={`text-xs truncate mt-0.5 ${isSel ? 'text-indigo-100' : 'text-gray-500'}`}>{group.description || 'No description'}</p>
                        </div>
                        {getGroupUnread(group) > 0 && !isSel && <span className="text-[10px] font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center flex-shrink-0 bg-indigo-600 text-white">{getGroupUnread(group)}</span>}
                      </button>
                      <button onClick={e => { e.stopPropagation(); setSidebarMenuId(sidebarMenuId === chatId ? null : chatId) }}
                        className={`absolute top-2 right-2 p-1 rounded-md transition-all ${isSel ? 'text-indigo-200 hover:text-white hover:bg-gray-100' : 'text-gray-600 hover:text-gray-400 hover:bg-gray-50'} ${sidebarMenuId === chatId ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}>
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                      {sidebarMenuId === chatId && (
                        <div className="absolute top-8 right-2 rounded-xl shadow-xl py-1.5 w-52 z-20" style={{ background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
                          {!isDef && (
                            <button onClick={() => handlePinGroup(group.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              {isPinned ? <PinOff className="w-4 h-4 text-gray-400" /> : <Pin className="w-4 h-4 text-gray-400" />}
                              <span>{isPinned ? 'Unpin' : 'Pin to Top'}</span>
                            </button>
                          )}
                          <button onClick={() => toggleMute(chatId)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            {muted ? <BellRing className="w-4 h-4 text-gray-500" /> : <BellOff className="w-4 h-4 text-gray-500" />}
                            <span>{muted ? 'Unmute' : 'Mute'}</span>
                          </button>
                          {!isDef && (
                            <>
                              <div className="my-1 mx-3" style={{ borderTop: '1px solid #f3f4f6' }}></div>
                              <button onClick={() => copyInviteLink(group)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                {copiedInviteLink ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4 text-gray-400" />}
                                <span>{copiedInviteLink ? 'Copied!' : 'Copy Invite Link'}</span>
                              </button>
                              <button onClick={() => { setSidebarMenuId(null); setShareGroupViaDM(group) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <Share2 className="w-4 h-4 text-gray-400" /><span>Share via DM</span>
                              </button>
                            </>
                          )}
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
                      <button onClick={() => handleSelectDMMobile(conv)} className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${isSel ? 'shadow-lg shadow-indigo-600/10' : 'hover:bg-gray-50'}`}
                        style={isSel ? { background: 'rgba(79, 70, 229, 0.08)', border: '1px solid rgba(79, 70, 229, 0.15)' } : {}}>
                        <div className="relative flex-shrink-0">
                          <UserAvatar src={conv.user.profileImage} firstName={conv.user.firstName} lastName={conv.user.lastName} size={40} onClick={() => setProfileViewUserId(conv.user.id)} />
                          {onlineUsers.has(conv.user.id) && (<span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5"><p className={`text-sm font-bold truncate ${isSel ? 'text-indigo-900' : 'text-gray-900'}`}>{conv.user.firstName} {conv.user.lastName}</p>{muted && <VolumeX className={`w-3 h-3 flex-shrink-0 ${isSel ? 'text-indigo-400' : 'text-gray-600'}`} />}</div>
                          <p className={`text-xs truncate mt-0.5 ${isSel ? 'text-indigo-600' : 'text-gray-500'}`}>{conv.lastMessage || 'No messages yet'}</p>
                        </div>
                        {conv.unreadCount > 0 && !isSel && <span className="text-[10px] font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center flex-shrink-0 bg-indigo-600 text-white">{conv.unreadCount}</span>}
                      </button>
                      <button onClick={e => { e.stopPropagation(); setSidebarMenuId(sidebarMenuId === chatId ? null : chatId) }}
                        className={`absolute top-2 right-2 p-1 rounded-md transition-all ${isSel ? 'text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50' : 'text-gray-600 hover:text-gray-400 hover:bg-gray-50'} ${sidebarMenuId === chatId ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}>
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

      {/* MAIN CHAT AREA */}
      {/* ── MAIN CHAT AREA — hidden on mobile unless mobileView==='chat' ── */}
      <div
        className="flex-1 flex flex-col min-w-0"
        style={{
          display: 'flex',
          position: isMobile ? 'absolute' : 'relative',
          top: 0, left: 0, right: 0, bottom: 0, zIndex: isMobile ? 10 : 'auto',
          transform: isMobile && mobileView !== 'chat' ? 'translateX(100%)' : 'translateX(0)',
          transition: isMobile ? 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' : undefined,
          visibility: isMobile && mobileView !== 'chat' ? 'hidden' : 'visible',
        }}>
        <div className="h-[64px] flex items-center justify-between flex-shrink-0" style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: isMobile ? '0 16px' : '0 24px' }}>
          <div className="flex items-center gap-3">
            {/* Mobile back button */}
            {isMobile && (
              <button onClick={() => setMobileView('list')} className="p-1.5 -ml-1 rounded-lg text-gray-500 hover:bg-gray-50 transition-all mr-1">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {isGroupMode && selectedChat && (<>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black tracking-tight text-white flex-shrink-0 overflow-hidden" style={{ background: '#4f46e5' }}>
                {selectedChat.icon && !selectedChat.isDefault ? (
                  <img src={selectedChat.icon} alt={selectedChat.name} className="w-full h-full object-cover" />
                ) : selectedChat.isDefault ? (
                  <span>{getGroupAbbr(selectedChat)}</span>
                ) : selectedChat.visibility === 'private' ? (
                  <Lock className="w-5 h-5 text-white" />
                ) : (
                  <Users className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[15px] font-bold text-gray-900">{selectedChat.name}</h1>
                  {selectedChat.visibility === 'private' && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md uppercase">Private</span>}
                  {currentMuted && <VolumeX className="w-3.5 h-3.5 text-gray-600" />}
                </div>
                <p className="text-xs text-gray-500">{selectedChat.members?.length || 0} members{currentUserRole === 'admin' ? ' · Admin' : ''}</p>
              </div>
            </>)}
            {isDMMode && selectedDM && (<>
              <div className="relative">
                <UserAvatar src={selectedDM.user.profileImage} firstName={selectedDM.user.firstName} lastName={selectedDM.user.lastName} size={40} onClick={() => setProfileViewUserId(selectedDM.user.id)} />
                {onlineUsers.has(selectedDM.user.id) && (<span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />)}
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
                    {isGroupMode && selectedChat && !selectedChat.isDefault && (
                      <button onClick={() => handlePinGroup(selectedChat.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        {pinnedGroupId === selectedChat.id ? <PinOff className="w-4 h-4 text-gray-400" /> : <Pin className="w-4 h-4 text-gray-400" />}
                        <span>{pinnedGroupId === selectedChat.id ? 'Unpin' : 'Pin to Top'}</span>
                      </button>
                    )}
                    <button onClick={() => toggleMute(currentChatId)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      {currentMuted ? <><BellRing className="w-4 h-4 text-gray-500" /><span>Unmute</span></> : <><BellOff className="w-4 h-4 text-gray-500" /><span>Mute</span></>}
                    </button>
                    {isGroupMode && selectedChat && !selectedChat.isDefault && (
                      <>
                        <div className="my-1 mx-3" style={{ borderTop: '1px solid #f3f4f6' }}></div>
                        <button onClick={() => { copyInviteLink(selectedChat); setShowHeaderMenu(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <Link2 className="w-4 h-4 text-gray-400" /><span>Copy Invite Link</span>
                        </button>
                        <button onClick={() => { setShareGroupViaDM(selectedChat); setShowHeaderMenu(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <Share2 className="w-4 h-4 text-gray-400" /><span>Share via DM</span>
                        </button>
                        {currentUserRole === 'admin' && (
                          <button onClick={() => { handleLoadJoinRequests(selectedChat.id); setShowHeaderMenu(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <Users className="w-4 h-4 text-gray-400" /><span>Join Requests</span>
                          </button>
                        )}
                        <div className="my-1 mx-3" style={{ borderTop: '1px solid #f3f4f6' }}></div>
                        {currentUserRole !== 'admin' && (
                          <button onClick={() => { setShowLeaveGroupModal(true); setShowHeaderMenu(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 transition-colors">
                            <LogOut className="w-4 h-4 text-orange-400" /><span>Leave Group</span>
                          </button>
                        )}
                        {currentUserRole === 'admin' && (
                          <button onClick={() => { setShowDeleteGroupModal(true); setShowHeaderMenu(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4 text-red-400" /><span>Delete Group</span>
                          </button>
                        )}
                      </>
                    )}
                    {isGroupMode && selectedChat && selectedChat.isDefault && (
                      <>
                        <div className="my-1 mx-3" style={{ borderTop: '1px solid #f3f4f6' }}></div>
                        <button onClick={() => { setShowLeaveGroupModal(true); setShowHeaderMenu(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 transition-colors">
                          <LogOut className="w-4 h-4 text-orange-400" /><span>Leave Group</span>
                        </button>
                      </>
                    )}
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
            <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-4 relative" style={{ background: 'linear-gradient(160deg, #f0f0ff 0%, #e8eeff 40%, #f5f0ff 70%, #eef0ff 100%)', paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 8px)' : undefined }}>
              {isGroupMode && selectedChat && (
                isLoadingMessages ? <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
                : messages.length > 0 ? (<div className="space-y-1">{messages.map((m, i) => renderMsgBubble(m, i, messages, false))}<div ref={messagesEndRef} /></div>)
                : <EmptyChat title="No messages yet" subtitle="Start the conversation!" />
              )}
              {isDMMode && selectedDM && (
                isLoadingMessages ? <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
                : dmMessages.length > 0 ? (<div className="space-y-1">{dmMessages.map((m, i) => renderMsgBubble(m, i, dmMessages, true))}<div ref={messagesEndRef} /></div>)
                : <EmptyChat title="No messages yet" subtitle={`Send a message to ${selectedDM.user.firstName}!`} />
              )}
              {!isGroupMode && !isDMMode && <EmptyChat title="Select a conversation" subtitle="Choose a group or DM to start chatting" />}
              {showScrollDown && (<button onClick={() => scrollToBottom()} className="fixed right-5 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-10" style={{ bottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 72px)' : '96px', background: 'white', border: '1px solid #e5e7eb' }}><ChevronDown className="w-5 h-5 text-indigo-500" /></button>)}
            </div>

            {(isGroupMode || isDMMode) && (
              <div className="flex-shrink-0" style={{ background: 'white', borderTop: '1px solid #e5e7eb' }}>
                {Object.keys(typingUsers).length > 0 && (<div className="px-6 pt-2 pb-0"><div className="flex items-center gap-2 text-xs text-gray-500"><span className="flex gap-0.5"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></span><span className="font-medium text-indigo-600">{(() => { const names = Object.values(typingUsers).map(t => t.name.split(' ')[0]); if (names.length === 1) return `${names[0]} is typing...`; if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`; return `${names[0]} and ${names.length - 1} others are typing...` })()}</span></div></div>)}
                {replyingTo && (<div className="px-6 pt-3 pb-1 flex items-center gap-3"><div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: '#f3f4f6', borderLeft: '3px solid #6366f1' }}><Reply className="w-4 h-4 text-indigo-500 flex-shrink-0" /><div className="flex-1 min-w-0"><p className="text-[11px] font-bold text-indigo-500">{replyingTo.userName}</p><p className="text-[11px] text-gray-500 truncate">{replyingTo.content || '📷 Photo'}</p></div><button onClick={() => setReplyingTo(null)} className="p-1 text-gray-500 hover:text-gray-600 rounded-lg hover:bg-gray-50"><X className="w-3.5 h-3.5" /></button></div></div>)}
                {(imagePreview || pendingFile) && (<div className="px-6 pt-3 pb-1 flex items-center gap-3">{imagePreview && (<div className="relative"><img src={imagePreview} alt="" className="h-16 w-16 object-cover rounded-xl" style={{ border: '1px solid #e5e7eb' }} /><button onClick={() => setImagePreview(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"><X className="w-3 h-3" /></button></div>)}{pendingFile && (<div className="relative flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>{getFileIcon(pendingFile.type)}<span className="text-xs font-medium text-gray-700 max-w-[150px] truncate">{pendingFile.name}</span><button onClick={() => setPendingFile(null)} className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 ml-1"><X className="w-3 h-3" /></button></div>)}</div>)}
                <div className="px-6 py-3" style={{ background: 'rgba(240,240,255,0.6)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.5)' }}>
                  <form id="chat-form" onSubmit={isGroupMode ? handleSendMessage : handleSendDM} className="flex items-end gap-2">
                    <div className="flex items-center gap-0.5">
                      <button type="button" onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }} className={`p-2 rounded-xl transition-all ${pendingFile ? 'text-indigo-500 bg-indigo-600/10' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`} disabled={uploadingFile}><Paperclip className="w-[18px] h-[18px]" /></button>
                      <button type="button" onClick={e => { e.stopPropagation(); imageInputRef.current?.click() }} className={`p-2 rounded-xl transition-all ${imagePreview ? 'text-indigo-500 bg-indigo-600/10' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`} disabled={uploadingFile}><ImageIcon className="w-[18px] h-[18px]" /></button>
                    </div>
                    <div className="flex-1 relative">
                      <textarea ref={inputRef} value={isGroupMode ? newMessage : newDMMessage}
                        onChange={e => { isGroupMode ? setNewMessage(e.target.value) : setNewDMMessage(e.target.value); if (inputRef.current) { inputRef.current.style.height = 'auto'; inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px' }; if (e.target.value.length > 0) sendTypingEvent() }}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const form = document.getElementById('chat-form') as HTMLFormElement; form?.requestSubmit() } }}
                        placeholder={isDMMode && selectedDM ? `Message ${selectedDM.user.firstName}...` : 'Type a message...'} rows={1}
                        className="w-full px-4 py-2.5 rounded-2xl text-sm resize-none placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-gray-900"
                        style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minHeight: 42, maxHeight: 120, backdropFilter: 'blur(8px)' }} />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <div className="relative"><button type="button" onClick={e => { e.stopPropagation(); setShowGifPicker(!showGifPicker); setShowInputEmoji(false) }} className={`p-2 rounded-xl transition-all ${showGifPicker ? 'text-indigo-500 bg-indigo-600/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Sticker className="w-[18px] h-[18px]" /></button>{showGifPicker && <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifPicker(false)} />}</div>
                      <div className="relative"><button type="button" onClick={e => { e.stopPropagation(); setShowInputEmoji(!showInputEmoji); setShowGifPicker(false) }} className={`p-2 rounded-xl transition-all ${showInputEmoji ? 'text-indigo-500 bg-indigo-600/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Smile className="w-[18px] h-[18px]" /></button>{showInputEmoji && (
                        <div
                          onClick={e => e.stopPropagation()}
                          onMouseDown={e => e.preventDefault()}
                        >
                          <EmojiKeyboard
                            onSelect={(emoji) => {
                              insertEmoji(emoji)
                            }}
                            onClose={() => setShowInputEmoji(false)}
                          />
                        </div>
                      )}</div>
                      <button type="submit" className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 hover:shadow-lg" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', boxShadow: '0 2px 10px rgba(99,102,241,0.3)' }} disabled={isGroupMode ? (!newMessage.trim() && !imagePreview && !pendingFile) : (!newDMMessage.trim() && !imagePreview && !pendingFile)}><Send className="w-4 h-4 text-white" /></button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* GROUP INFO PANEL */}
          {showGroupInfo && isGroupMode && selectedChat && (
            <div
              className="flex flex-col flex-shrink-0 overflow-hidden"
              style={{
                background: 'white',
                borderLeft: isMobile ? 'none' : '1px solid #e5e7eb',
                width: isMobile ? '100%' : '300px',
                position: isMobile ? 'absolute' : 'relative',
                top: 0, left: 0, right: 0, bottom: isMobile ? '60px' : 0, zIndex: isMobile ? 30 : 'auto',
                overflowY: isMobile ? 'auto' : undefined,
                transform: isMobile ? 'translateX(0)' : undefined,
                transition: isMobile ? 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' : undefined,
              }}>
              <div className="h-[64px] px-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid #e5e7eb' }}>
                {isMobile ? (
                  <button onClick={() => setShowGroupInfo(false)} className="flex items-center gap-1 text-indigo-600 font-semibold text-[15px] -ml-1 p-1.5 rounded-lg hover:bg-indigo-50 transition-all">
                    <ChevronLeft className="w-5 h-5" /><span>Back</span>
                  </button>
                ) : (
                  <h3 className="text-sm font-bold text-gray-900">Group Info</h3>
                )}
                <div className="flex items-center gap-1">
                  {!isMobile && <button onClick={() => setShowGroupInfo(false)} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-500 hover:text-gray-600 transition-all"><X className="w-4 h-4" /></button>}
                </div>
              </div>
              <div className="px-5 py-6 flex flex-col items-center" style={{ borderBottom: '1px solid #e5e7eb' }}>
                {/* Group avatar — clickable for admin on non-default groups */}
                <div className="relative mb-3 group/avatar">
                  {selectedChat.icon && !selectedChat.isDefault ? (
                    <img
                      src={selectedChat.icon}
                      alt={selectedChat.name}
                      className="w-16 h-16 rounded-2xl object-cover"
                      style={{ border: '2px solid rgba(99,102,241,0.15)' }}
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center font-black tracking-tight"
                      style={{ background: '#4f46e5', fontSize: selectedChat.isDefault ? '13px' : '18px' }}
                    >
                      <span className="text-white">
                        {selectedChat.isDefault ? getGroupAbbr(selectedChat) : getGroupInitials(selectedChat.name)}
                      </span>
                    </div>
                  )}
                  {/* Camera button — only admin on non-default groups */}
                  {!selectedChat.isDefault && currentUserRole === 'admin' && (
                    <button
                      onClick={() => groupAvatarInputRef.current?.click()}
                      disabled={isUploadingGroupAvatar}
                      title="Change group photo"
                      className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center shadow-md border-2 border-white transition-all hover:scale-110 disabled:opacity-60"
                      style={{ background: '#4f46e5' }}
                    >
                      {isUploadingGroupAvatar
                        ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                        : <Camera className="w-3.5 h-3.5 text-white" />
                      }
                    </button>
                  )}
                </div>
                <h4 className="text-base font-bold text-gray-900 text-center">{selectedChat.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-500">{selectedChat.members?.length || 0} members</p>
                  {selectedChat.visibility === 'private'
                    ? <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md uppercase flex items-center gap-1"><Lock className="w-3 h-3" />Private</span>
                    : <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md uppercase flex items-center gap-1"><Globe className="w-3 h-3" />Public</span>
                  }
                </div>
                {!selectedChat.isDefault && selectedChat.inviteCode && (
                  <div className="mt-4 w-full flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl w-full" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Invite Code</p>
                        <p className="text-[15px] font-mono font-bold text-gray-900 tracking-widest">{selectedChat.inviteCode}</p>
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(selectedChat.inviteCode || ''); setCopiedInviteCode(true); setTimeout(() => setCopiedInviteCode(false), 2000) }} className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Copy invite code">
                        {copiedInviteCode ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => copyInviteLink(selectedChat)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all">
                        {copiedInviteLink ? <><Check className="w-3.5 h-3.5" />Copied!</> : <><Link2 className="w-3.5 h-3.5" />Copy Invite Link</>}
                      </button>
                      <button onClick={() => setShareGroupViaDM(selectedChat)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all">
                        <Share2 className="w-3.5 h-3.5" />Share via DM
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-5 pt-4 pb-2"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" /><input type="text" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search members..." className="w-full pl-9 pr-3 py-2 rounded-lg text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-600/30 text-gray-900" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }} /></div></div>
              <div className="px-5 py-2 flex gap-2">
                <select value={memberYearFilter} onChange={e => setMemberYearFilter(e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg text-xs text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-600/30" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', appearance: 'none', color: '#111827', colorScheme: 'light' }}><option value="">All Years</option>{getAvailableYears().map(y => <option key={y} value={y}>{y}</option>)}</select>
                <select value={memberSemesterFilter} onChange={e => setMemberSemesterFilter(e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg text-xs text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-600/30" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', appearance: 'none', color: '#111827', colorScheme: 'light' }}><option value="">All Semesters</option>{getAvailableSemesters().map(s => <option key={s} value={s}>{s}</option>)}</select>
              </div>
              <div className="px-5 pt-2 pb-1"><p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Members ({filteredMembers.length})</p></div>
              <div className="flex-1 overflow-y-auto px-5 pb-4">
                <div className="space-y-1">
                  {filteredMembers.map(member => (
                    <div key={member.id} className="flex items-center gap-3 py-2.5 rounded-lg hover:bg-gray-50 px-1 transition-all">
                      <UserAvatar src={member.user.profileImage} firstName={member.user.firstName} lastName={member.user.lastName} size={38} onClick={() => setProfileViewUserId(member.user.id)} />
                      <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900 truncate flex items-center gap-1.5">{member.user.firstName} {member.user.lastName}{member.role === 'admin' && <Shield className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />}</p><p className="text-xs text-gray-500 truncate">{member.role === 'admin' ? 'Admin · ' : ''}{member.user.major}{member.user.semester && member.user.year ? ` • ${member.user.semester} ${member.user.year}` : member.user.year ? ` • ${member.user.year}` : ''}</p></div>
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

      {/* MODALS */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowCreateGroup(false)}>
          <div className="rounded-2xl shadow-2xl max-w-md w-full p-6" style={{ background: 'white', border: '1px solid #e5e7eb' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-5">Create a Group</h2>

            {/* ── Group photo upload ── */}
            <div className="flex justify-center mb-5">
              <div className="relative">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer relative group/avatar"
                  style={{ background: groupForm.icon ? 'transparent' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: '2px dashed #c7d2fe' }}
                  onClick={() => groupImageInputRef.current?.click()}
                >
                  {groupForm.icon ? (
                    <img src={groupForm.icon} alt="" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Camera className="w-6 h-6 text-white/80" />
                      <span className="text-[9px] text-white/70 font-medium">Add Photo</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 rounded-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>
                {groupForm.icon && (
                  <button
                    onClick={e => { e.stopPropagation(); setGroupForm(p => ({ ...p, icon: '' })) }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <input
                  ref={groupImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    e.target.value = ''
                    const reader = new FileReader()
                    reader.onload = () => {
                      const img = new Image()
                      img.onload = () => {
                        const canvas = document.createElement('canvas')
                        const size = Math.min(img.width, img.height)
                        canvas.width = 300; canvas.height = 300
                        const ctx = canvas.getContext('2d')!
                        ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 300, 300)
                        setGroupForm(p => ({ ...p, icon: canvas.toDataURL('image/jpeg', 0.85) }))
                      }
                      img.src = reader.result as string
                    }
                    reader.readAsDataURL(file)
                  }}
                />
              </div>
            </div>

            <div className="mb-4"><label className="block text-sm font-semibold text-gray-700 mb-2">Group Name</label><input type="text" value={groupForm.name} onChange={e => { setGroupForm(p => ({ ...p, name: e.target.value })); if (groupErrors.name) setGroupErrors(p => ({ ...p, name: '' })) }} placeholder="e.g., Study Group" className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/30 text-gray-900 placeholder-gray-400 ${groupErrors.name ? 'ring-1 ring-red-500' : ''}`} style={{ background: 'white', border: '1px solid #e5e7eb' }} />{groupErrors.name && <p className="text-xs text-red-400 flex items-center gap-1 mt-1.5"><AlertCircle className="w-3.5 h-3.5" />{groupErrors.name}</p>}</div>
            <div className="mb-4"><label className="block text-sm font-semibold text-gray-700 mb-2">Description</label><textarea value={groupForm.description} onChange={e => { setGroupForm(p => ({ ...p, description: e.target.value })); if (groupErrors.description) setGroupErrors(p => ({ ...p, description: '' })) }} placeholder="What's this group about?" rows={3} className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/30 resize-none text-gray-900 placeholder-gray-400 ${groupErrors.description ? 'ring-1 ring-red-500' : ''}`} style={{ background: 'white', border: '1px solid #e5e7eb' }} />{groupErrors.description && <p className="text-xs text-red-400 flex items-center gap-1 mt-1.5"><AlertCircle className="w-3.5 h-3.5" />{groupErrors.description}</p>}</div>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Visibility</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setGroupForm(p => ({ ...p, visibility: 'public' }))} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${groupForm.visibility === 'public' ? 'bg-indigo-50 text-indigo-600 ring-2 ring-indigo-500' : 'text-gray-500 hover:bg-gray-50'}`} style={groupForm.visibility !== 'public' ? { border: '1px solid #e5e7eb' } : {}}><Globe className="w-4 h-4" />Public</button>
                <button type="button" onClick={() => setGroupForm(p => ({ ...p, visibility: 'private' }))} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${groupForm.visibility === 'private' ? 'bg-amber-50 text-amber-600 ring-2 ring-amber-500' : 'text-gray-500 hover:bg-gray-50'}`} style={groupForm.visibility !== 'private' ? { border: '1px solid #e5e7eb' } : {}}><Lock className="w-4 h-4" />Private</button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">{groupForm.visibility === 'public' ? 'Anyone from your university can find and join' : 'Only people with the invite link can join'}</p>
            </div>
            <div className="flex gap-3"><button onClick={() => { setShowCreateGroup(false); setGroupErrors({}); setGroupForm({ name: '', description: '', visibility: 'public', icon: '' }) }} className="flex-1 px-4 py-2.5 rounded-xl text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-all" style={{ border: '1px solid #d1d5db' }}>Cancel</button><button onClick={handleCreateGroup} disabled={isCreating} className="flex-1 px-4 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: '#4f46e5' }}>{isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Group'}</button></div>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => { setShowJoinModal(false); setJoinCode(''); setJoinError('') }}>
          <div className="rounded-2xl shadow-2xl max-w-sm w-full p-6" style={{ background: 'white', border: '1px solid #e5e7eb' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Join a Group</h2>
            <p className="text-sm text-gray-500 mb-5">Enter an invite code to join a group</p>
            <div className="mb-4">
              <input type="text" value={joinCode} onChange={e => { setJoinCode(e.target.value); setJoinError('') }} onKeyDown={e => { if (e.key === 'Enter') handleJoinGroup() }} placeholder="Enter invite code..." autoFocus className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/30 text-gray-900 placeholder-gray-400 ${joinError ? 'ring-1 ring-red-500' : ''}`} style={{ background: 'white', border: '1px solid #e5e7eb' }} />
              {joinError && <p className="text-xs text-red-400 flex items-center gap-1 mt-1.5"><AlertCircle className="w-3.5 h-3.5" />{joinError}</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowJoinModal(false); setJoinCode(''); setJoinError('') }} className="flex-1 px-4 py-2.5 rounded-xl text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-all" style={{ border: '1px solid #d1d5db' }}>Cancel</button>
              <button onClick={handleJoinGroup} disabled={isJoining || !joinCode.trim()} className="flex-1 px-4 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: '#4f46e5' }}>{isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join Group'}</button>
            </div>
          </div>
        </div>
      )}

      {shareGroupViaDM && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => { setShareGroupViaDM(null); setShareDMSentTo(new Set()); setShareDMSending(null) }}>
          <div className="rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[500px] flex flex-col" style={{ background: 'white', border: '1px solid #e5e7eb' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Share &quot;{shareGroupViaDM.name}&quot;</h2>
              <button onClick={() => { setShareGroupViaDM(null); setShareDMSentTo(new Set()); setShareDMSending(null) }}
                className="p-1 hover:bg-gray-50 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            {/* Invite link preview */}
            <div className="mb-4 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <p className="text-xs text-gray-500 truncate flex-1">{getInviteLink(shareGroupViaDM)}</p>
              <button onClick={() => copyInviteLink(shareGroupViaDM)} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex-shrink-0">
                {copiedInviteLink ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Send via DM:</p>
            {/* Contact list with per-contact sent/sending state */}
            <div className="flex-1 overflow-y-auto space-y-1">
              {dmConversations.length > 0 ? dmConversations.map(conv => {
                const isSent = shareDMSentTo.has(conv.user.id)
                const isSending = shareDMSending === conv.user.id
                return (
                  <button key={conv.user.id}
                    onClick={() => handleShareGroupViaDM(conv, shareGroupViaDM)}
                    disabled={isSent || !!shareDMSending}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all disabled:cursor-default">
                    <UserAvatar src={conv.user.profileImage} firstName={conv.user.firstName} lastName={conv.user.lastName} size={36} />
                    <span className="text-sm font-medium text-gray-900 flex-1 text-left">{conv.user.firstName} {conv.user.lastName}</span>
                    {/* ✅ FIX 3: Per-contact feedback — spinner while sending, checkmark when sent */}
                    {isSending ? (
                      <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
                    ) : isSent ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-green-600 flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4" /> Sent
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-indigo-500 flex-shrink-0">Send</span>
                    )}
                  </button>
                )
              }) : <p className="text-center text-gray-500 text-sm py-6">No DM conversations yet</p>}
            </div>
            {/* ✅ FIX 3: Done button appears once at least one was sent */}
            {shareDMSentTo.size > 0 && (
              <div className="pt-4 border-t border-gray-100 mt-2">
                <button
                  onClick={() => { setShareGroupViaDM(null); setShareDMSentTo(new Set()); setShareDMSending(null) }}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm text-indigo-600 hover:bg-indigo-50 transition-all"
                  style={{ border: '1px solid #e0e7ff' }}>
                  Done — Shared with {shareDMSentTo.size} {shareDMSentTo.size === 1 ? 'person' : 'people'}
                </button>
              </div>
            )}
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

      {/* ── DELETE GROUP MODAL ── */}
      {showDeleteGroupModal && selectedChat && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowDeleteGroupModal(false)}>
          <div className="rounded-2xl shadow-2xl max-w-sm w-full p-6" style={{ background: 'white', border: '1px solid #e5e7eb' }} onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 text-center mb-1">Delete Group?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">This will permanently delete <span className="font-semibold text-gray-700">"{selectedChat.name}"</span> and all its messages. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteGroupModal(false)} className="flex-1 px-4 py-2.5 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50" style={{ border: '1px solid #d1d5db' }}>Cancel</button>
              <button onClick={handleDeleteGroup} disabled={isDeletingGroup} className="flex-1 px-4 py-2.5 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: '#ef4444' }}>
                {isDeletingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LEAVE GROUP MODAL ── */}
      {showLeaveGroupModal && selectedChat && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowLeaveGroupModal(false)}>
          <div className="rounded-2xl shadow-2xl max-w-sm w-full p-6" style={{ background: 'white', border: '1px solid #e5e7eb' }} onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-6 h-6 text-orange-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 text-center mb-1">Leave Group?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">You'll leave <span className="font-semibold text-gray-700">"{selectedChat.name}"</span>. You can rejoin later with an invite link.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLeaveGroupModal(false)} className="flex-1 px-4 py-2.5 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50" style={{ border: '1px solid #d1d5db' }}>Cancel</button>
              <button onClick={handleLeaveGroup} className="flex-1 px-4 py-2.5 text-white rounded-xl font-semibold text-sm" style={{ background: '#f97316' }}>Leave Group</button>
            </div>
          </div>
        </div>
      )}

      {/* ── JOIN REQUESTS MODAL (admin) ── */}
      {showJoinRequests && selectedChat && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowJoinRequests(false)}>
          <div className="rounded-2xl shadow-2xl max-w-md w-full p-6 flex flex-col max-h-[500px]" style={{ background: 'white', border: '1px solid #e5e7eb' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Join Requests</h2>
              <button onClick={() => setShowJoinRequests(false)} className="p-1 hover:bg-gray-50 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {joinRequests.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3"><Users className="w-6 h-6 text-gray-300" /></div>
                  <p className="text-sm text-gray-400 font-medium">No pending requests</p>
                  <p className="text-xs text-gray-300 mt-1">All caught up!</p>
                </div>
              ) : joinRequests.map(req => (
                <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <UserAvatar src={req.user.profileImage} firstName={req.user.firstName} lastName={req.user.lastName} size={40} onClick={() => setProfileViewUserId(req.user.id)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{req.user.firstName} {req.user.lastName}</p>
                    <p className="text-xs text-gray-500">{req.user.major}{req.user.year ? ` • ${req.user.year}` : ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApproveReject(req.user.id, 'reject')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-all" style={{ border: '1px solid #fca5a5' }}>
                      Reject
                    </button>
                    <button onClick={() => handleApproveReject(req.user.id, 'approve')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all" style={{ background: '#4f46e5' }}>
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PENDING APPROVAL MODAL ── */}
      {pendingApproval && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setPendingApproval(null)}>
          <div className="rounded-2xl shadow-2xl max-w-sm w-full p-6" style={{ background: 'white', border: '1px solid #e5e7eb' }} onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                <span className="text-2xl">⏳</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Request Sent!</h2>
              <p className="text-sm text-gray-500 mb-1">
                Your request to join
              </p>
              <p className="text-base font-bold text-indigo-600 mb-3">"{pendingApproval.groupName}"</p>
              <p className="text-sm text-gray-500 mb-6">
                is pending admin approval. You'll receive a notification once you're approved.
              </p>
              <button
                onClick={() => setPendingApproval(null)}
                className="w-full px-4 py-2.5 text-white rounded-xl font-semibold text-sm"
                style={{ background: '#4f46e5' }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      <ProfileViewModal userId={profileViewUserId} onClose={() => setProfileViewUserId(null)} currentUserId={user?.id} onStartDM={handleStartDM} />

      {/* ── MOBILE BOTTOM TAB BAR — only on list view, never inside open chat ── */}
      {isMobile && mobileView === 'list' && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center border-t"
          style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderColor: '#e5e7eb', paddingBottom: 'env(safe-area-inset-bottom, 0px)', height: '60px' }}>
          {/* Chat tab — always active here since nav only shows on list view */}
          <button onClick={() => setMobileView('list')} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all">
            <div className="p-1.5 rounded-xl transition-all relative bg-indigo-50">
              <MessageSquare className="w-[22px] h-[22px] text-indigo-600" />
              {(() => { const t = groups.reduce((s,g)=>s+getGroupUnread(g),0)+totalUnread; return t > 0 ? <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{t > 99 ? '99+' : t}</span> : null })()}
            </div>
            <span className="text-[10px] font-semibold text-indigo-600">Chat</span>
          </button>
          {/* Campus Talks tab */}
          <button onClick={() => router.push('/home/campus-talks')} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all">
            <div className="p-1.5 rounded-xl">
              <Megaphone className="w-[22px] h-[22px] text-gray-400" />
            </div>
            <span className="text-[10px] font-semibold text-gray-400">Talks</span>
          </button>
          {/* ✅ FIX: Profile tab navigates to /home/profile, NOT logout */}
          <button onClick={() => router.push('/home/profile')} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all">
            <div className="p-1.5 rounded-xl">
              {user?.profileImage
                ? <img src={user.profileImage} className="w-[22px] h-[22px] rounded-full object-cover" />
                : <div className="w-[22px] h-[22px] rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px]">{user?.firstName?.[0]}{user?.lastName?.[0]}</div>
              }
            </div>
            <span className="text-[10px] font-semibold text-gray-400">Me</span>
          </button>
          {/* ✅ FIX: Separate Logout tab restored */}
          <button onClick={() => setShowLogoutModal(true)} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all">
            <div className="p-1.5 rounded-xl">
              <LogOut className="w-[22px] h-[22px] text-gray-400" />
            </div>
            <span className="text-[10px] font-semibold text-gray-400">Logout</span>
          </button>
        </nav>
      )}
    </div>
  )
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (<button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}><span className="flex items-center justify-center w-5 h-5">{icon}</span><span>{label}</span></button>)
}

function EmptyChat({ title, subtitle }: { title: string; subtitle: string }) {
  return (<div className="flex flex-col items-center justify-center h-full" style={{ background: 'linear-gradient(160deg, #f0f0ff 0%, #e8eeff 40%, #f5f0ff 70%, #eef0ff 100%)' }}><div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 16px rgba(99,102,241,0.08)' }}><Send className="w-7 h-7 text-indigo-400" /></div><p className="text-base font-bold text-gray-400">{title}</p><p className="text-sm text-gray-500 mt-1">{subtitle}</p></div>)
}