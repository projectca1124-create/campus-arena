// app/api/auth/complete-signup/route.ts
// Updated to auto-create degree+major groups

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      degree,
      major,
      semester,
      year,
      funFact,
      profileImage,
    } = await request.json()

    // Validation
    if (!email || !password || !firstName || !lastName || !degree || !major) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log(`📝 Creating user: ${email}`)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return Response.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Get university (assuming ASU for now - update as needed)
    const university = 'Arizona State University'

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        degree,
        major,
        semester,
        year,
        funFact,
        profileImage,
        university,
      },
    })

    console.log(`✅ User created: ${user.id}`)

    // AUTO-CREATE GROUP: Call the auto-create groups API
    console.log(`🔄 Auto-creating degree+major group...`)
    
    try {
      const groupResponse = await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/groups/auto-create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            degree: degree,
            major: major,
            university: university,
          }),
        }
      )

      const groupData = await groupResponse.json()

      if (groupResponse.ok) {
        console.log(`✅ User auto-added to group: ${groupData.group.name}`)
      } else {
        console.warn(`⚠️  Group creation warning: ${groupData.error}`)
        // Don't fail signup if group creation fails
      }
    } catch (groupError) {
      console.error(`⚠️  Error auto-creating group:`, groupError)
      // Don't fail signup if group creation fails
    }

    // Return user without password
    return Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        degree: user.degree,
        major: user.major,
        semester: user.semester,
        year: user.year,
        university: user.university,
        profileImage: user.profileImage,
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