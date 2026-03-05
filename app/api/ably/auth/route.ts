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
      // Try multiple fallback methods to get userId (for fresh signup users without session):

      // 1. Custom header (most reliable — set via authHeaders in ably-client.ts)
      const headerUserId = request.headers.get('x-user-id')
      if (headerUserId) userId = headerUserId

      // 2. Form-encoded body (Ably sends authParams this way when authMethod='POST')
      if (!userId) {
        try {
          const contentType = request.headers.get('content-type') || ''
          if (contentType.includes('application/x-www-form-urlencoded')) {
            const text = await request.text()
            const params = new URLSearchParams(text)
            if (params.get('clientId')) userId = params.get('clientId')!
          } else {
            const cloned = request.clone()
            const body = await cloned.json().catch(() => ({}))
            if (body?.clientId) userId = body.clientId
          }
        } catch {}
      }

      // 3. URL query string fallback
      if (!userId) {
        const url = new URL(request.url)
        const qp = url.searchParams.get('clientId')
        if (qp) userId = qp
      }
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