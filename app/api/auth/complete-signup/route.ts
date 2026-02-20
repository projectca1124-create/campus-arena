// app/api/auth/complete-signup/route.ts

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // DEBUG: Log what we received
    console.log('===== SIGNUP REQUEST BODY =====')
    console.log(JSON.stringify(body, null, 2))
    console.log('================================')

    const {
      email,
      password,
      firstName,
      lastName,
      major,
      semester,
      year,
      funFact,
      profileImage,
    } = body

    // DEBUG: Log each field
    console.log('email:', email)
    console.log('password:', password)
    console.log('firstName:', firstName)
    console.log('lastName:', lastName)
    console.log('major:', major)
    console.log('semester:', semester)
    console.log('year:', year)
    console.log('funFact:', funFact)
    console.log('profileImage:', profileImage ? 'present' : 'missing')

    // Validation with better error messages
    if (!email) {
      return Response.json(
        { error: 'Missing email' },
        { status: 400 }
      )
    }

    if (!password) {
      return Response.json(
        { error: 'Missing password' },
        { status: 400 }
      )
    }

    if (!firstName) {
      return Response.json(
        { error: 'Missing firstName' },
        { status: 400 }
      )
    }

    if (!lastName) {
      return Response.json(
        { error: 'Missing lastName' },
        { status: 400 }
      )
    }

    const trimmedEmail = email.trim().toLowerCase()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    })

    if (existingUser) {
      return Response.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user in database
    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        password: hashedPassword,
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
        major: major?.trim(),
        semester: semester?.trim(),
        year: year?.trim(),
        funFact: funFact?.trim(),
        profileImage: profileImage || null,
      },
    })

    // Delete OTP token after successful signup
    await prisma.oTPToken.deleteMany({
      where: { email: trimmedEmail },
    })

    return Response.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
      },
    })
  } catch (error) {
    console.error('Signup error:', error)
    return Response.json(
      { error: 'Failed to create account', details: String(error) },
      { status: 500 }
    )
  }
}