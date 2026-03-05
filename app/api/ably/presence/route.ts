// app/api/ably/presence/route.ts — Presence via Ably
import { publishEvent } from '@/lib/ably-server'

export async function POST(request: Request) {
  try {
    const { userId, status } = await request.json()
    if (!userId) return Response.json({ error: 'Missing userId' }, { status: 400 })

    await publishEvent('presence-updates', 'status-change', {
      userId,
      status: status || 'online',
      lastSeen: new Date().toISOString(),
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Presence error:', error)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}