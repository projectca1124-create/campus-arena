// app/api/auth/complete-signup/route.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 })
    }

    console.log(`📝 Creating user: ${email}`)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return Response.json({ error: 'Email already exists' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Detect university from email domain
    const domain = email.split('@')[1].toLowerCase()
    const parts = domain.split('.')
    const eduIndex = parts.indexOf('edu')
    const mainDomain = eduIndex > 0 ? parts.slice(Math.max(0, eduIndex - 1), eduIndex + 1).join('.') : domain
    const university = mainDomain

    // Create user with minimal info (profile completed later in onboarding)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        university,
        onboardingComplete: false,
      },
    })

    console.log(`✅ User created: ${user.id} (university: ${university})`)

    return Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        university: user.university,
        onboardingComplete: user.onboardingComplete,
      },
    })
  } catch (error) {
    console.error('❌ Signup error:', error)
    return Response.json(
      { error: 'Failed to create account', details: String(error) },
      { status: 500 }
    )
  }
}