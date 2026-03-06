// lib/ably-client.ts
import * as Ably from 'ably'

let ablyClient: Ably.Realtime | null = null
let ablyUserId: string | null = null

export function getAblyClient(userId?: string): Ably.Realtime {
  if (userId && ablyUserId && userId !== ablyUserId) {
    try { ablyClient?.close() } catch {}
    ablyClient = null
  }
  if (userId) ablyUserId = userId

  if (ablyClient) {
    const state = ablyClient.connection.state
    if (state === 'failed' || state === 'suspended') {
      try { ablyClient.close() } catch {}
      ablyClient = null
    } else {
      return ablyClient
    }
  }

  // localStorage fallback if userId not passed
  if (!ablyUserId) {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      if (u?.id) ablyUserId = u.id
    } catch {}
  }

  ablyClient = new Ably.Realtime({
    authUrl: '/api/ably/auth',
    authMethod: 'POST',
    // Both headers AND params — belt and suspenders guarantee userId reaches the auth route
    authHeaders: { 'x-user-id': ablyUserId || '' },
    authParams: { clientId: ablyUserId || '', userId: ablyUserId || '' },
    echoMessages: false,
    // ✅ FIXED: true = subscriptions queue until connected, never silently dropped
    queueMessages: true,
    disconnectedRetryTimeout: 2000,
    suspendedRetryTimeout: 10000,
    recover: (_, cb) => cb(true),
  })

  ablyClient.connection.on((stateChange: Ably.ConnectionStateChange) => {
    const { current, previous, reason } = stateChange
    if (current === 'failed') {
      console.error('[Ably] Connection FAILED:', reason?.message)
    }
    if (current === 'connected' && previous !== 'connected') {
      console.log('[Ably] Connected ✓')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ably-reconnected'))
      }
    }
  })

  return ablyClient
}

export function resetAblyClient(): void {
  if (ablyClient) {
    try { ablyClient.close() } catch {}
    ablyClient = null
    ablyUserId = null
  }
}

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