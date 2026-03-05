// lib/ably-client.ts — Ably Client (replaces pusher-client.ts)
import * as Ably from 'ably'

let ablyClient: Ably.Realtime | null = null

export function getAblyClient(): Ably.Realtime {
  if (!ablyClient) {
    ablyClient = new Ably.Realtime({
      authUrl: '/api/ably/auth',
      authMethod: 'POST',
      // Automatically reconnects on disconnect
      disconnectedRetryTimeout: 5000,
      suspendedRetryTimeout: 10000,
    })
  }
  return ablyClient
}

// Channel naming — same conventions as before
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