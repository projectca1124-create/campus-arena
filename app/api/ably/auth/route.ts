// app/api/ably/auth/route.ts
import Ably from 'ably'

export async function POST(request: Request) {
  try {
    let userId: string | undefined

    // 1. Custom header (most reliable)
    userId = request.headers.get('x-user-id') || undefined

    // 2. Form-encoded body (Ably sends authParams this way)
    if (!userId) {
      try {
        const contentType = request.headers.get('content-type') || ''
        if (contentType.includes('application/x-www-form-urlencoded')) {
          const text = await request.text()
          const params = new URLSearchParams(text)
          userId = params.get('clientId') || params.get('userId') || undefined
        } else {
          const body = await request.clone().json().catch(() => ({}))
          userId = body?.clientId || body?.userId || undefined
        }
      } catch {}
    }

    // 3. URL query string fallback
    if (!userId) {
      const url = new URL(request.url)
      userId = url.searchParams.get('clientId') || url.searchParams.get('userId') || undefined
    }

    if (!userId) {
      console.error('[Ably auth] No userId found')
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ably = new Ably.Rest({ key: process.env.ABLY_API_KEY! })

    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: userId,
      ttl: 24 * 60 * 60 * 1000,
      capability: {
        [`user-${userId}`]: ['subscribe', 'publish'],
        'group-*': ['subscribe', 'publish'],
        'dm-*': ['subscribe', 'publish'],
        'presence-updates': ['subscribe', 'publish'],
        'game-room-*': ['subscribe', 'publish'],  // ← game channels
      },
    })

    return Response.json(tokenRequest)
  } catch (error) {
    console.error('[Ably auth] Error:', error)
    return Response.json({ error: 'Failed to create token' }, { status: 500 })
  }
}