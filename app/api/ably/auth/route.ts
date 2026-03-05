// app/api/ably/auth/route.ts
import Ably from 'ably'
import { getAuthUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    // Primary: session-based auth (existing logged-in users)
    // Fallback: clientId from Ably's token request body (fresh signup — session not yet set)
    const auth = await getAuthUser()
    let userId: string | undefined = auth?.userId

    if (!userId) {
      // Ably SDK sends the clientId hint in the POST body when using authUrl
      try {
        const body = await request.json().catch(() => ({}))
        // Accept clientId from body (set via ably.auth.authParams on the client)
        if (body?.clientId) userId = body.clientId
      } catch {}
    }

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ably = new Ably.Rest({ key: process.env.ABLY_API_KEY! })

    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: userId,
      // 24h TTL — default 1h is too short, causes silent disconnects in long sessions
      ttl: 24 * 60 * 60 * 1000,
      capability: {
        [`user-${userId}`]: ['subscribe'],
        'group-*': ['subscribe', 'publish'],
        'dm-*': ['subscribe', 'publish'],
        'presence-updates': ['subscribe', 'publish'],
      },
    })

    return Response.json(tokenRequest)
  } catch (error) {
    console.error('Ably auth error:', error)
    return Response.json({ error: 'Failed to create token' }, { status: 500 })
  }
}