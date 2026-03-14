// app/api/auth/complete-signup/route.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/**
 * Extracts a clean university identifier from any edu email domain.
 *
 * Examples:
 *   student@srmist.edu.in   → srmist.edu.in
 *   student@vit.ac.in       → vit.ac.in
 *   student@stanford.edu    → stanford.edu
 *   student@ox.ac.uk        → ox.ac.uk
 *   student@mit.edu         → mit.edu
 */
function extractUniversity(email: string): string {
  const domain = email.split('@')[1].toLowerCase()

  // Indian patterns: .ac.in or .edu.in
  if (domain.endsWith('.ac.in') || domain.endsWith('.edu.in')) {
    // e.g. "student.srmist.edu.in" → take last 3 parts: srmist.edu.in
    const parts = domain.split('.')
    return parts.slice(-3).join('.')
  }

  // UK pattern: .ac.uk
  if (domain.endsWith('.ac.uk')) {
    const parts = domain.split('.')
    return parts.slice(-3).join('.')
  }

  // Australian pattern: .edu.au
  if (domain.endsWith('.edu.au')) {
    const parts = domain.split('.')
    return parts.slice(-3).join('.')
  }

  // US pattern: .edu — take last 2 parts: stanford.edu
  const parts = domain.split('.')
  return parts.slice(-2).join('.')
}

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

    // Detect university from email domain (supports US, India, UK, Australia)
    const university = extractUniversity(email)

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