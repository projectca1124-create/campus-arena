// Save as: app/api/pusher/typing/route.ts
import pusherServer from '@/lib/pusher-server'

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
      // DM channel
      const sorted = [userId, otherUserId].sort()
      channel = `dm-${sorted[0]}-${sorted[1]}`
    }

    await pusherServer.trigger(channel, 'typing', {
      userId,
      userName: userName || 'Someone',
      isTyping: isTyping !== false,
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Typing trigger error:', error)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}