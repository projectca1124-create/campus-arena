// app/api/ably/typing/route.ts — Typing indicator via Ably
import { publishEvent } from '@/lib/ably-server'

export async function POST(request: Request) {
  try {
    const { channelType, channelId, userId, userName, otherUserId, isTyping } = await request.json()

    if (!channelType || !channelId || !userId) {
      return Response.json({ error: 'Missing fields' }, { status: 400 })
    }

    let channel: string
    if (channelType === 'group') {
      channel = `group-${channelId}`
    } else {
      const sorted = [userId, otherUserId].sort()
      channel = `dm-${sorted[0]}-${sorted[1]}`
    }

    await publishEvent(channel, 'typing', {
      userId,
      userName: userName || 'Someone',
      isTyping: isTyping !== false,
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Typing error:', error)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}