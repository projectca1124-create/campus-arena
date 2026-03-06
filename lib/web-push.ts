// lib/web-push.ts
// Server-side web push sender — notifies users even when browser is closed
// Requires: npm install web-push
// Requires env vars: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

import webpush from 'web-push'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Initialize VAPID — only once
let initialized = false
function initVapid() {
  if (initialized) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@campusarena.co'

  if (!publicKey || !privateKey) {
    console.error('[WebPush] Missing VAPID keys in env — push notifications disabled')
    return
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  initialized = true
}

export interface PushPayload {
  title: string
  body: string
  url: string          // where to navigate on click
  tag?: string         // groups notifications so they don't pile up
  icon?: string
}

// Send push to ALL devices a user has subscribed from
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  initVapid()
  if (!initialized) return

  let subscriptions: any[]
  try {
    subscriptions = await prisma.pushSubscription.findMany({ where: { userId } })
  } catch (err) {
    console.error('[WebPush] DB fetch error:', err)
    return
  }

  if (!subscriptions.length) return

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag || 'campus-arena',
    icon: payload.icon || '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
  })

  // Send to all devices in parallel, clean up expired subscriptions
  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notification,
        { TTL: 60 * 60 * 24 }  // keep in push service queue for 24h if device is offline
      )
    )
  )

  // Remove subscriptions that are gone (410 = unsubscribed, 404 = not found)
  const expiredEndpoints: string[] = []
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const err = result.reason as any
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        expiredEndpoints.push(subscriptions[i].endpoint)
      } else {
        console.error('[WebPush] Send error:', err?.message || err)
      }
    }
  })

  if (expiredEndpoints.length) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: expiredEndpoints } },
    }).catch(() => {})
  }
}

// Send push to multiple users at once (e.g. group messages)
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!userIds.length) return
  await Promise.allSettled(userIds.map(uid => sendPushToUser(uid, payload)))
}