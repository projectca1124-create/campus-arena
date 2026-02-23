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
async function createDefaultGroupsForUniversity(university: string, userId: string) {
  try {
    console.log(`📚 Creating default groups for ${university}...`)

    // Check if default groups already exist for this university
    const existingGroups = await prisma.group.findMany({
      where: {
        university: university,
        isDefault: true,
      },
    })

    console.log(`Found ${existingGroups.length} existing default groups for ${university}`)

    let arenaGroup = null
    let classGroup = null

    // If groups don't exist, create them
    if (existingGroups.length === 0) {
      console.log('Creating new default groups...')
      
      // Create main university arena group
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

      // Create a sample class/major group
      classGroup = await prisma.group.create({
        data: {
          name: `Data Science Fall 2023`,
          description: `For students in Data Science courses`,
          university: university,
          type: 'class',
          isDefault: true,
          icon: '📊',
        },
      })
      console.log(`✅ Created Data Science Fall 2023 group`)
    } else {
      // Use existing groups
      arenaGroup = existingGroups.find(g => g.name.includes('Arena'))
      classGroup = existingGroups.find(g => g.name.includes('Data Science'))
    }

    // Add user to arena group
    if (arenaGroup) {
      const existingMember = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: arenaGroup.id,
            userId: userId,
          },
        },
      })

      if (!existingMember) {
        await prisma.groupMember.create({
          data: {
            groupId: arenaGroup.id,
            userId: userId,
          },
        })
        console.log(`✅ Added user to ${arenaGroup.name}`)
      }
    }

    // Add user to class group
    if (classGroup) {
      const existingMember = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: classGroup.id,
            userId: userId,
          },
        },
      })

      if (!existingMember) {
        await prisma.groupMember.create({
          data: {
            groupId: classGroup.id,
            userId: userId,
          },
        })
        console.log(`✅ Added user to ${classGroup.name}`)
      }
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

    // Create user with university field
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
        university, // Save extracted university
      },
    })

    console.log('✅ User created successfully:', user.id)

    // Create default groups and add user to them
    await createDefaultGroupsForUniversity(university, user.id)

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