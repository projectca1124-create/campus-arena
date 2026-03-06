'use client'
// lib/use-push-notifications.ts
// Handles: SW registration, permission request, push subscription, SW navigation messages

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export function usePushNotifications(userId: string | undefined) {
  const router = useRouter()
  const subscribedRef = useRef(false)

  useEffect(() => {
    if (!userId || subscribedRef.current) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const run = async () => {
      try {
        // 1. Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',  // always check for SW updates
        })

        // Wait for SW to be active
        await navigator.serviceWorker.ready

        // 2. Listen for navigation messages from SW (notification clicks)
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'NAVIGATE' && event.data?.url) {
            router.push(event.data.url)
          }
        })

        // 3. Request permission — only ask once, don't nag
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        // 4. Get or create push subscription
        let subscription = await registration.pushManager.getSubscription()
        if (!subscription) {
          const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          if (!vapidPublicKey) {
            console.error('[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set')
            return
          }

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,   // required — all push notifications must be shown
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          })
        }

        // 5. Save subscription to server
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, subscription: subscription.toJSON() }),
        })

        subscribedRef.current = true
      } catch (err) {
        // Don't crash the app if push setup fails
        console.warn('[Push] Setup failed (non-fatal):', err)
      }
    }

    run()
  }, [userId])
}

// Converts a base64url VAPID public key to Uint8Array (required by pushManager.subscribe)
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer as ArrayBuffer
}