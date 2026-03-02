// Save as: lib/pusher-client.ts
import PusherClient from 'pusher-js'

// Singleton client-side Pusher instance
let pusherClient: PusherClient | null = null

export function getPusherClient(): PusherClient {
  if (!pusherClient) {
    pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
      // Auth will be called automatically for private-* and presence-* channels
    })
  }
  return pusherClient
}

// Channel naming conventions:
// Group messages:    "group-{groupId}"
// DM messages:       "dm-{sortedUserId1}-{sortedUserId2}"
// Typing indicators: "private-typing-group-{groupId}" / "private-typing-dm-{sortedIds}"
// Presence:          "presence-app"

export function getDMChannelName(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort()
  return `dm-${sorted[0]}-${sorted[1]}`
}

export function getGroupChannelName(groupId: string): string {
  return `group-${groupId}`
}

export function getTypingChannelName(type: 'group' | 'dm', id: string, otherUserId?: string): string {
  if (type === 'group') return `private-typing-group-${id}`
  const sorted = [id, otherUserId!].sort()
  return `private-typing-dm-${sorted[0]}-${sorted[1]}`
}

export const PRESENCE_CHANNEL = 'presence-app'