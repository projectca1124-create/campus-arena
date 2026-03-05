// lib/ably-client.ts
import * as Ably from 'ably'

let ablyClient: Ably.Realtime | null = null
let ablyUserId: string | null = null

export function getAblyClient(userId?: string): Ably.Realtime {
  // If a userId is provided and different from current, force recreate
  if (userId && ablyUserId && userId !== ablyUserId) {
    try { ablyClient?.close() } catch {}
    ablyClient = null
  }
  if (userId) ablyUserId = userId

  if (ablyClient) {
    const state = ablyClient.connection.state
    if (state === 'failed' || state === 'suspended') {
      console.warn('[Ably] Bad connection state:', state, '— recreating client')
      try { ablyClient.close() } catch {}
      ablyClient = null
    } else {
      return ablyClient
    }
  }

  ablyClient = new Ably.Realtime({
    authUrl: '/api/ably/auth',
    authMethod: 'POST',
    // Pass userId in every auth request body — critical for fresh signup users
    // who don't have a session cookie yet
    authParams: ablyUserId ? { clientId: ablyUserId } : undefined,
    // Don't echo messages back to publisher (eliminates double-processing)
    echoMessages: false,
    // Don't queue messages while connecting — prevents stale backlog
    queueMessages: false,
    disconnectedRetryTimeout: 2000,
    suspendedRetryTimeout: 15000,
    // Auto-recover channel subscriptions after brief disconnects
    recover: (_, cb) => cb(true),
  })

  ablyClient.connection.on((stateChange: Ably.ConnectionStateChange) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Ably]', stateChange.previous, '→', stateChange.current, stateChange.reason?.message || '')
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