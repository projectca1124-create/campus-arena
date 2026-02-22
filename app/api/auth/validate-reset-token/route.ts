// app/api/auth/validate-reset-token/route.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    console.log('🔍 Validating token:', token)

    if (!token) {
      return Response.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Find the reset token in database
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: token },
    })

    console.log('📊 Token found:', resetToken ? 'YES' : 'NO')

    // Token doesn't exist
    if (!resetToken) {
      console.log('❌ Token not found in database')
      return Response.json(
        { error: 'Invalid token' },
        { status: 400 }
      )
    }

    // Get current time
    const now = new Date()
    const expiryTime = new Date(resetToken.expiresAt)

    console.log('⏰ Time Check:')
    console.log('   Now:', now.toISOString())
    console.log('   Expiry:', expiryTime.toISOString())
    console.log('   Expired?:', expiryTime < now)

    // Check if token is expired
    if (expiryTime < now) {
      console.log('⚠️ Token has expired, deleting...')
      
      // Delete expired token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      })
      
      return Response.json(
        { error: 'Token has expired' },
        { status: 400 }
      )
    }

    // Token is valid!
    console.log('✅ Token is VALID!')
    return Response.json({
      valid: true,
      message: 'Token is valid',
    })
  } catch (error) {
    console.error('❌ Token validation error:', error)
    return Response.json(
      { error: 'Failed to validate token' },
      { status: 500 }
    )
  }
}