// Save as: app/api/pusher/auth/route.ts
import pusherServer from '@/lib/pusher-server'

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const params = new URLSearchParams(body)
    const socketId = params.get('socket_id')
    const channelName = params.get('channel_name')

    if (!socketId || !channelName) {
      return Response.json({ error: 'Missing socket_id or channel_name' }, { status: 400 })
    }

    // For presence channels, we need user info
    if (channelName.startsWith('presence-')) {
      // Get user ID from a custom header or body param
      const userId = params.get('user_id') || 'anonymous'
      const userName = params.get('user_name') || 'Anonymous'
      const userImage = params.get('user_image') || ''

      const presenceData = {
        user_id: userId,
        user_info: {
          name: userName,
          image: userImage,
        },
      }

      const auth = pusherServer.authorizeChannel(socketId, channelName, presenceData)
      return Response.json(auth)
    }

    // For private channels (typing indicators), just authorize
    if (channelName.startsWith('private-')) {
      const auth = pusherServer.authorizeChannel(socketId, channelName)
      return Response.json(auth)
    }

    return Response.json({ error: 'Invalid channel' }, { status: 403 })
  } catch (error) {
    console.error('Pusher auth error:', error)
    return Response.json({ error: 'Auth failed' }, { status: 500 })
  }
}