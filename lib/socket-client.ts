// lib/socket-client.ts
// Replaces ably-client.ts entirely
// Single persistent Socket.io connection for the entire app

import { io, Socket } from 'socket.io-client'

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL!

let socket: Socket | null = null
let currentUserId: string | null = null

// ─── Get or create the singleton socket ──────────────────────────
export function getSocket(userId?: string): Socket {
  // Return existing connected socket if user matches
  if (socket?.connected && userId === currentUserId) return socket

  // Disconnect if user changed (logout → login as someone else)
  if (socket && userId && userId !== currentUserId) {
    socket.disconnect()
    socket = null
  }

  if (userId) currentUserId = userId

  // Fallback: read userId from localStorage if not passed
  if (!currentUserId && typeof window !== 'undefined') {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      if (u?.id) currentUserId = u.id
    } catch {}
  }

  socket = io(SOCKET_URL, {
    auth: { userId: currentUserId },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    // Queue events while reconnecting — nothing gets lost
    autoConnect: true,
  })

  socket.on('connect', () => {
    console.log('✅ [Socket] Connected:', socket?.id)
    // Fire reconnect event so components can re-fetch missed messages
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('socket-reconnected'))
    }
  })

  socket.on('disconnect', (reason) => {
    console.warn('⚠️ [Socket] Disconnected:', reason)
    if (reason === 'io server disconnect') {
      // Server forced disconnect — reconnect manually
      socket?.connect()
    }
  })

  socket.on('connect_error', (err) => {
    console.error('❌ [Socket] Connection error:', err.message)
  })

  return socket
}

// ─── Disconnect and clean up ─────────────────────────────────────
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
    currentUserId = null
  }
}

// ─── Emit with acknowledgement + timeout ─────────────────────────
// Prevents hanging promises if server never responds
export function emitWithAck(
  event: string,
  data: unknown,
  timeoutMs = 8000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const s = getSocket()

    if (!s.connected) {
      // Queue the emit — socket will send once reconnected
      s.once('connect', () => {
        s.emit(event, data, (response: any) => {
          if (response?.error) reject(new Error(response.error))
          else resolve(response)
        })
      })
      return
    }

    const timer = setTimeout(() => {
      reject(new Error(`Socket timeout: ${event}`))
    }, timeoutMs)

    s.emit(event, data, (response: any) => {
      clearTimeout(timer)
      if (response?.error) reject(new Error(response.error))
      else resolve(response)
    })
  })
}

// ─── Helper: join a group room (after joining a new group) ────────
export function joinGroupRoom(groupId: string): void {
  getSocket().emit('room:join', { groupId })
}

// ─── Helper: leave a group room ───────────────────────────────────
export function leaveGroupRoom(groupId: string): void {
  getSocket().emit('room:leave', { groupId })
}

// ─── Typing helpers ───────────────────────────────────────────────
export function emitTypingStart(type: 'group' | 'dm', id: string): void {
  getSocket().emit('typing:start', { type, id })
}

export function emitTypingStop(type: 'group' | 'dm', id: string): void {
  getSocket().emit('typing:stop', { type, id })
}

// ─── Keep these exports so existing code that imports channel name
//     helpers doesn't break during migration ────────────────────────
export function getDMChannelName(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort()
  return `dm-${sorted[0]}-${sorted[1]}`
}

export function getGroupChannelName(groupId: string): string {
  return `group-${groupId}`
}

export function getUserChannelName(userId: string): string {
  return `user-${userId}`
}