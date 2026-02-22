// app/api/auth/verify-otp/route.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json()

    console.log('🔍 Verifying OTP for:', email)
    console.log('📝 Received code:', code, 'Type:', typeof code)

    if (!email || !code) {
      console.log('❌ Missing email or code')
      return Response.json(
        { error: 'Email and code are required' },
        { status: 400 }
      )
    }

    const trimmedEmail = email.trim().toLowerCase()
    const receivedCode = String(code).trim() // Convert to string safely

    console.log('🔎 Looking for OTP token in database...')

    // Find OTP token
    const otpToken = await prisma.oTPToken.findUnique({
      where: { email: trimmedEmail },
    })

    console.log('📊 OTP Token found:', otpToken ? 'YES' : 'NO')

    // Check if OTP exists
    if (!otpToken) {
      console.log('❌ OTP not found for email:', trimmedEmail)
      return Response.json(
        { error: 'OTP not found. Please request a new code.' },
        { status: 400 }
      )
    }

    // Check if OTP is expired
    const now = new Date()
    const expiryTime = new Date(otpToken.expiresAt)

    console.log('⏰ Expiry check:')
    console.log('   Now:', now.toISOString())
    console.log('   Expiry:', expiryTime.toISOString())

    if (expiryTime < now) {
      console.log('⚠️ OTP expired, deleting...')
      
      // Delete expired OTP
      await prisma.oTPToken.delete({
        where: { id: otpToken.id },
      })
      
      return Response.json(
        { error: 'OTP has expired. Please request a new code.' },
        { status: 400 }
      )
    }

    // Compare codes - convert both to strings
    const storedCode = String(otpToken.code).trim()

    console.log('🔐 Code comparison:')
    console.log('   Stored:', storedCode)
    console.log('   Received:', receivedCode)
    console.log('   Match:', storedCode === receivedCode)

    // Check if code matches
    if (storedCode !== receivedCode) {
      console.log('❌ Code mismatch')
      return Response.json(
        { error: 'Incorrect OTP. Please try again.' },
        { status: 400 }
      )
    }

    console.log('✅ OTP verified successfully')

    // OTP is valid - delete it (one-time use)
    await prisma.oTPToken.delete({
      where: { id: otpToken.id },
    })

    console.log('🗑️ OTP deleted (one-time use)')

    return Response.json({
      success: true,
      message: 'OTP verified successfully',
    })
  } catch (error) {
    console.error('❌ Verify OTP error:', error)
    return Response.json(
      { error: 'Failed to verify OTP', details: String(error) },
      { status: 500 }
    )
  }
}