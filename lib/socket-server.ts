// lib/socket-server.ts
const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL!
const INTERNAL_SECRET = process.env.SOCKET_INTERNAL_SECRET!

async function post(path: string, body: object): Promise<void> {
  try {
    if (!SOCKET_SERVER_URL || !INTERNAL_SECRET) {
      console.error('[socket-server] ❌ Missing SOCKET_SERVER_URL or SOCKET_INTERNAL_SECRET')
      return
    }
    const url = `${SOCKET_SERVER_URL}${path}`
    console.log(`[socket-server] → ${url}`, JSON.stringify(body).slice(0, 100))
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_SECRET,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.error(`[socket-server] ❌ ${path} returned ${res.status}`)
    } else {
      console.log(`[socket-server] ✅ ${path} OK`)
    }
  } catch (err) {
    console.error(`[socket-server] ❌ ${path} threw:`, err)
  }
}

export async function notifyUser(userId: string, event: string, data: object): Promise<void> {
  await post('/internal/notify-user', { userId, event, data })
}

export async function notifyGroup(groupId: string, event: string, data: object): Promise<void> {
  await post('/internal/notify-group', { groupId, event, data })
}

export async function notifyUniversity(university: string, event: string, data: object): Promise<void> {
  await post('/internal/notify-university', { university, event, data })
}

export async function publishEvent(channel: string, event: string, data: object): Promise<void> {
  console.log(`[socket-server] publishEvent channel=${channel} event=${event}`)
  if (channel.startsWith('game-room-')) {
    await post('/internal/notify-game-room', { code: channel.replace('game-room-', ''), event, data })
  } else if (channel.startsWith('group-')) {
    await notifyGroup(channel.replace('group-', ''), event, data)
  } else if (channel.startsWith('user-')) {
    await notifyUser(channel.replace('user-', ''), event, data)
  } else if (channel.startsWith('dm-')) {
    await post('/internal/notify-user', { userId: (data as any).message?.senderId, event, data })
    await post('/internal/notify-user', { userId: (data as any).message?.receiverId, event, data })
  } else {
    console.warn(`[socket-server] Unknown channel: ${channel}`)
  }
}