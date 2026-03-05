// app/api/ably/auth/route.ts — Issues Ably tokens to authenticated users
import Ably from 'ably'
import { getAuthUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ably = new Ably.Rest({ key: process.env.ABLY_API_KEY! })

    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: auth.userId,
      capability: {
        // Wildcard — allows access to ALL channels
        '*': ['subscribe', 'publish', 'presence', 'history'],
      },
       ttl: 24 * 60 * 60 * 1000, // 1 hour token
    })

    return Response.json(tokenRequest)
  } catch (error) {
    console.error('Ably auth error:', error)
    return Response.json({ error: 'Failed to create token' }, { status: 500 })
  }
}