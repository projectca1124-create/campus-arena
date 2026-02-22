// app/api/auth/reset-password/route.ts

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    console.log('🔑 Reset password request with token:', token?.substring(0, 10) + '...')

    // Validation
    if (!token || !password) {
      console.log('❌ Missing token or password')
      return Response.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      console.log('❌ Password too short')
      return Response.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Find reset token in database
    console.log('🔍 Looking for token in database...')
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    })

    if (!resetToken) {
      console.log('❌ Token not found')
      return Response.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      )
    }

    console.log('✅ Token found')

    // Check if token is expired
    const now = new Date()
    const expiryTime = new Date(resetToken.expiresAt)

    console.log('⏰ Expiry check - Now:', now.toISOString(), 'Expiry:', expiryTime.toISOString())

    if (expiryTime < now) {
      console.log('⚠️ Token expired, deleting...')
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      })
      
      return Response.json(
        { error: 'Reset link has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    const userEmail = resetToken.email
    console.log('👤 Resetting password for:', userEmail)

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    })

    if (!user) {
      console.log('❌ User not found')
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log('✅ User found')

    // Hash new password
    console.log('🔐 Hashing password...')
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update user password in database
    console.log('💾 Updating password in database...')
    await prisma.user.update({
      where: { email: userEmail },
      data: {
        password: hashedPassword,
      },
    })

    console.log('✅ Password updated')

    // Delete reset token (one-time use only)
    console.log('🗑️ Deleting reset token...')
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    })

    console.log('✅ Reset token deleted')
    console.log('🎉 Password reset successful!')

    return Response.json({
      success: true,
      message: 'Password reset successfully',
    }, { status: 200 })
  } catch (error) {
    console.error('❌ Reset password error:', error)
    return Response.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}