// lib/socket-server.ts
// Used by API routes to push real-time events to the Socket.io server on Railway
// Replaces lib/ably-server.ts entirely

const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL!
const INTERNAL_SECRET = process.env.SOCKET_INTERNAL_SECRET!

async function post(path: string, body: object): Promise<void> {
  try {
    if (!SOCKET_SERVER_URL || !INTERNAL_SECRET) {
      console.warn('[socket-server] SOCKET_SERVER_URL or SOCKET_INTERNAL_SECRET not set')
      return
    }
    const res = await fetch(`${SOCKET_SERVER_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_SECRET,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.error(`[socket-server] ${path} returned ${res.status}`)
    }
  } catch (err) {
    // Never let real-time failure break the API response
    console.error(`[socket-server] ${path} failed:`, err)
  }
}

// ── Notify a specific user (DMs, notifications, personal events) ──
export async function notifyUser(
  userId: string,
  event: string,
  data: object
): Promise<void> {
  await post('/internal/notify-user', { userId, event, data })
}

// ── Notify everyone in a group ────────────────────────────────────
export async function notifyGroup(
  groupId: string,
  event: string,
  data: object
): Promise<void> {
  await post('/internal/notify-group', { groupId, event, data })
}

// ── Notify everyone in a university ──────────────────────────────
export async function notifyUniversity(
  university: string,
  event: string,
  data: object
): Promise<void> {
  await post('/internal/notify-university', { university, event, data })
}

// ── Drop-in replacement for the old publishEvent signature ────────
// This makes migration easier — old code that calls publishEvent(channel, event, data)
// still works without changes. We parse the channel name to determine the type.
export async function publishEvent(
  channel: string,
  event: string,
  data: object
): Promise<void> {
  // Parse channel name to determine routing
  // group-{id} → notify group
  // user-{id} → notify user
  // dm-{id1}-{id2} → notify both users
  if (channel.startsWith('group-')) {
    const groupId = channel.replace('group-', '')
    await notifyGroup(groupId, event, data)
  } else if (channel.startsWith('user-')) {
    const userId = channel.replace('user-', '')
    await notifyUser(userId, event, data)
  } else if (channel.startsWith('dm-')) {
    // DM channel format: dm-{smallerId}-{largerId}
    // Notify both users
    const parts = channel.replace('dm-', '').split('-')
    // Reconstruct user IDs (cuid format — split on known boundary)
    // cuid IDs are fixed length — safer to notify the group channel
    // Actually just post to both user channels
    await post('/internal/notify-user', {
      userId: (data as any).message?.senderId || parts[0],
      event,
      data,
    })
    await post('/internal/notify-user', {
      userId: (data as any).message?.receiverId || parts[1],
      event,
      data,
    })
  } else {
    // Fallback — log unknown channel
    console.warn(`[socket-server] Unknown channel pattern: ${channel}`)
  }
}