// Save as: app/api/pusher/presence/route.ts
import pusherServer from '@/lib/pusher-server'

// Update user's last seen timestamp
// Called when user connects/disconnects or periodically
export async function POST(request: Request) {
  try {
    const { userId, status } = await request.json()

    if (!userId) return Response.json({ error: 'Missing userId' }, { status: 400 })

    // Broadcast presence update to all connected clients
    await pusherServer.trigger('presence-updates', 'status-change', {
      userId,
      status: status || 'online', // 'online' | 'offline'
      lastSeen: new Date().toISOString(),
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Presence error:', error)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}