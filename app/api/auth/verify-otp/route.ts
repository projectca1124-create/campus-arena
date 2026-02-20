import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json()

    console.log(`🔐 Verifying OTP for: ${email}`)

    // Find OTP token
    const otpToken = await prisma.oTPToken.findUnique({
      where: { email },
    })

    if (!otpToken) {
      return NextResponse.json(
        { error: 'No OTP found for this email' },
        { status: 400 }
      )
    }

    // Check if OTP is expired
    if (new Date() > otpToken.expiresAt) {
      await prisma.oTPToken.delete({ where: { email } })
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Check if OTP matches
    if (otpToken.code !== otp.toString()) {
      return NextResponse.json(
        { error: 'Incorrect OTP. Please try again.' },
        { status: 400 }
      )
    }

    // OTP verified! Delete it
    await prisma.oTPToken.delete({ where: { email } })

    console.log('✅ OTP verified successfully')

    // Now create/update user account
    // This is where you'd create the user and return JWT token
    return NextResponse.json({
      success: true,
      message: 'OTP verified. Account created!',
      email,
    })
  } catch (error) {
    console.error('❌ Verification Error:', error)
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    )
  }
}