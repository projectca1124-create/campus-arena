// app/api/groups/auto-create/route.ts
// This API automatically creates or finds degree+major groups when user signs up

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface AutoCreateGroupRequest {
  userId: string
  degree: string
  major: string
  university: string
}

export async function POST(request: Request) {
  try {
    const { userId, degree, major, university } = await request.json() as AutoCreateGroupRequest

    if (!userId || !degree || !major || !university) {
      return Response.json(
        { error: 'userId, degree, major, and university are required' },
        { status: 400 }
      )
    }

    console.log(`🔄 Auto-creating group for: ${degree} - ${major}`)

    // Generate a unique group identifier based on degree + major
    // Example: "undergraduate-computer-science" or "graduate-data-science"
    const groupIdentifier = `${degree.toLowerCase()}-${major.toLowerCase().replace(/\s+/g, '-')}`

    // Check if group already exists for this degree+major combination
    let group = await prisma.group.findFirst({
      where: {
        identifier: groupIdentifier,
        university: university,
      },
    })

    // If group doesn't exist, create it
    if (!group) {
      console.log(`✨ Creating new group: ${groupIdentifier}`)
      
      group = await prisma.group.create({
        data: {
          name: `${major}`,  // Only show major name
          description: `${degree} students pursuing ${major}`, // Description shows degree context
          identifier: groupIdentifier,
          type: 'degree-major',
          isDefault: false,
          university: university,
          degree: degree,  // Store degree for backend filtering
          major: major,    // Store major for backend filtering
          icon: '👥',
        },
        include: {
          members: true,
        },
      })

      console.log(`✅ Group created: ${group.id}`)
    } else {
      console.log(`ℹ️  Group already exists: ${group.id}`)
    }

    // Add user to the group if not already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: userId,
          groupId: group.id,
        },
      },
    })

    if (!existingMember) {
      console.log(`➕ Adding user to group: ${userId}`)
      
      await prisma.groupMember.create({
        data: {
          userId: userId,
          groupId: group.id,
          role: 'member',
        },
      })

      console.log(`✅ User added to group`)
    } else {
      console.log(`ℹ️  User already in group`)
    }

    return Response.json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        degree: group.degree,
        major: group.major,
        identifier: group.identifier,
      },
    })
  } catch (error) {
    console.error('❌ Auto-create group error:', error)
    return Response.json(
      { error: 'Failed to auto-create group', details: String(error) },
      { status: 500 }
    )
  }
}