// public/sw.js — Campus Arena Service Worker
// Handles background push notifications when the app is closed/backgrounded

const APP_NAME = 'Campus Arena'

// ── Push event: fired when server sends a push notification ──────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: APP_NAME, body: event.data.text(), url: '/home' }
  }

  const { title, body, icon, badge, url, tag, data } = payload

  const options = {
    body: body || '',
    icon: icon || '/icons/icon-192.png',
    badge: badge || '/icons/badge-72.png',
    tag: tag || 'campus-arena-notification',   // same tag = replaces previous (no spam)
    renotify: true,                             // re-alert even if same tag
    requireInteraction: false,                  // auto-dismiss after a few seconds
    silent: false,
    vibrate: [200, 100, 200],
    data: { url: url || '/home', ...data },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(title || APP_NAME, options)
  )
})

// ── Notification click: open the app and navigate to the right page ──────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/home'
  const fullUrl = new URL(url, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If app is already open — focus it and navigate
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus()
          client.postMessage({ type: 'NAVIGATE', url })
          return
        }
      }
      // App is closed — open it
      return clients.openWindow(fullUrl)
    })
  )
})

// ── Activate: take control immediately ───────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

// ── Install: skip waiting so new SW activates immediately ────────────────────
self.addEventListener('install', () => {
  self.skipWaiting()
})