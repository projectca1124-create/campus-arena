// app/api/auth/check-email/route.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Accepts: .edu (US), .ac.in (India), .edu.in (India), .ac.uk (UK), .edu.au (Australia)
const VALID_EDU_PATTERN = /^[^\s@]+@[^\s@]+\.(edu|ac\.in|edu\.in|ac\.uk|edu\.au)$/i

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const trimmedEmail = email.trim().toLowerCase()

    console.log('🔍 Checking email:', trimmedEmail)

    // Validate it's a university email
    if (!VALID_EDU_PATTERN.test(trimmedEmail)) {
      return Response.json(
        { error: 'Please use your university email address (.edu, .ac.in, .edu.in)' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    })

    if (user) {
      console.log('❌ User already exists')
      return Response.json({
        exists: true,
        message: 'Account already exists',
      })
    }

    console.log('✅ User does not exist')
    return Response.json({
      exists: false,
      message: 'Email is available',
    })
  } catch (error) {
    console.error('❌ Check email error:', error)
    return Response.json(
      { error: 'Failed to check email' },
      { status: 500 }
    )
  }
}