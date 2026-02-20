import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return Response.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Find token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    })

    // Check if token exists and not expired
    if (!resetToken || resetToken.expiresAt < new Date()) {
      return Response.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      )
    }

    return Response.json({ valid: true })
  } catch (error) {
    console.error('Token validation error:', error)
    return Response.json(
      { error: 'Failed to validate token' },
      { status: 500 }
    )
  }
}