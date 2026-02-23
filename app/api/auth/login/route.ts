// app/api/auth/login/route.ts

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    const trimmedEmail = email.trim().toLowerCase()

    console.log('🔐 Login attempt for:', trimmedEmail)

    // Validate inputs
    if (!email || !password) {
      console.log('❌ Missing email or password')
      return Response.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email
    console.log('🔍 Finding user...')
    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    })

    if (!user) {
      console.log('❌ User not found')
      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    console.log('✅ User found:', user.id)

    // Verify password
    console.log('🔐 Verifying password...')
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      console.log('❌ Invalid password')
      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    console.log('✅ Password verified!')
    console.log('🎉 Login successful!')

    // Return user data (without password) — including profileImage
    return Response.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        university: user.university,
        major: user.major,
        semester: user.semester,
        year: user.year,
        profileImage: user.profileImage,
      },
    })
  } catch (error) {
    console.error('❌ Login error:', error)
    return Response.json(
      { error: 'Failed to login', details: String(error) },
      { status: 500 }
    )
  }
}