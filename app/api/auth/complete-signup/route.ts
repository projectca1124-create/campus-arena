// app/api/auth/complete-signup/route.ts

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Helper function to extract university from email
function extractUniversity(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase() || ''
  const parts = domain.replace('.edu', '').split('.')
  const mainDomain = parts[parts.length - 1].toUpperCase()
  return mainDomain
}

// Helper function to create default groups for university
async function createDefaultGroupsForUniversity(
  university: string,
  userId: string,
  major: string,
  semester: string,
  year: string
) {
  try {
    console.log(`📚 Creating default groups for ${university}...`)

    // ── 1. University Arena Group (shared across all users at this university) ──
    let arenaGroup = await prisma.group.findFirst({
      where: {
        university: university,
        isDefault: true,
        type: 'general',
      },
    })

    if (!arenaGroup) {
      console.log('Creating new Arena group...')
      arenaGroup = await prisma.group.create({
        data: {
          name: `${university} Arena`,
          description: `Welcome to the ${university} campus-wide community`,
          university: university,
          type: 'general',
          isDefault: true,
          icon: '🏫',
        },
      })
      console.log(`✅ Created ${university} Arena group`)
    }

    // Add user to arena group if not already a member
    const existingArenaMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: arenaGroup.id,
          userId: userId,
        },
      },
    })

    if (!existingArenaMember) {
      await prisma.groupMember.create({
        data: {
          groupId: arenaGroup.id,
          userId: userId,
        },
      })
      console.log(`✅ Added user to ${arenaGroup.name}`)
    }

    // ── 2. Major + Semester + Year Group (dynamic based on user's profile) ──
    const majorGroupName = `${major} ${semester} ${year}`
    const majorGroupDescription = `For students in ${major} courses`

    let majorGroup = await prisma.group.findFirst({
      where: {
        name: majorGroupName,
        university: university,
        isDefault: true,
      },
    })

    if (!majorGroup) {
      console.log(`Creating new major group: ${majorGroupName}...`)
      majorGroup = await prisma.group.create({
        data: {
          name: majorGroupName,
          description: majorGroupDescription,
          university: university,
          type: 'class',
          isDefault: true,
          icon: '📚',
        },
      })
      console.log(`✅ Created ${majorGroupName} group`)
    }

    // Add user to major group if not already a member
    const existingMajorMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: majorGroup.id,
          userId: userId,
        },
      },
    })

    if (!existingMajorMember) {
      await prisma.groupMember.create({
        data: {
          groupId: majorGroup.id,
          userId: userId,
        },
      })
      console.log(`✅ Added user to ${majorGroupName}`)
    }
  } catch (error) {
    console.error('❌ Error creating default groups:', error)
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const { email, password, firstName, lastName, major, semester, year, funFact, profileImage } =
      await request.json()

    const trimmedEmail = email.trim().toLowerCase()

    console.log('📝 Complete signup for:', trimmedEmail)

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !major || !semester || !year) {
      console.log('❌ Missing required fields')
      return Response.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Extract university from email
    const university = extractUniversity(trimmedEmail)
    console.log(`🏫 Extracted university: ${university}`)

    // Check if user already exists
    console.log('🔍 Checking if user already exists...')
    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    })

    if (existingUser) {
      console.log('❌ User already exists')
      return Response.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash password
    console.log('🔐 Hashing password...')
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with all profile fields
    console.log('💾 Creating user in database...')
    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        password: hashedPassword,
        firstName,
        lastName,
        major,
        semester,
        year,
        funFact,
        profileImage,
        university,
      },
    })

    console.log('✅ User created successfully:', user.id)

    // Create default groups using the user's actual major, semester, and year
    await createDefaultGroupsForUniversity(university, user.id, major, semester, year)

    // Delete OTP token (one-time use)
    console.log('🗑️ Deleting OTP token...')
    await prisma.oTPToken.deleteMany({
      where: { email: trimmedEmail },
    })

    console.log('🎉 Signup complete!')

    return Response.json({
      success: true,
      message: 'Account created successfully',
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
    console.error('❌ Complete signup error:', error)
    return Response.json(
      { error: 'Failed to create account', details: String(error) },
      { status: 500 }
    )
  }
}