// app/api/auth/login/route.ts — SECURED VERSION
// Sets httpOnly JWT cookie on successful login

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { setAuthCookie, createAuthCookieHeader } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    // Validate inputs
    if (!email || !password) {
      return Response.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const trimmedEmail = email.trim().toLowerCase()

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    })

    if (!user) {
      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // ── NEW: Create JWT token and set as httpOnly cookie ──
    const token = setAuthCookie(user.id, user.email)
    const cookieHeader = createAuthCookieHeader(token)

    // Return user data (without password) + set cookie
    return new Response(
      JSON.stringify({
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
          onboardingComplete: user.onboardingComplete,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeader,
        },
      }
    )
  } catch (error) {
    console.error('Login error:', error)
    return Response.json(
      { error: 'Failed to login' },
      { status: 500 }
    )
  }
}