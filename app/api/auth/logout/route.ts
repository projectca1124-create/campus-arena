// app/api/auth/logout/route.ts — Clears the session cookie

import { createLogoutCookieHeader } from '@/lib/auth'

export async function POST() {
  return new Response(
    JSON.stringify({ success: true, message: 'Logged out' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': createLogoutCookieHeader(),
      },
    }
  )
}