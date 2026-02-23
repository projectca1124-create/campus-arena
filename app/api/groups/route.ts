// app/api/groups/route.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      console.log('❌ userId is missing')
      return Response.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    console.log('📚 Fetching groups for user:', userId)

    // Get all groups where user is a member
    const groupMembers = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    university: true,
                  },
                },
              },
            },
            messages: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 50,
            },
          },
        },
      },
    })

    console.log(`✅ Found ${groupMembers.length} group memberships`)

    // Extract groups and ensure proper structure
    const groups = groupMembers.map((gm) => ({
      id: gm.group.id,
      name: gm.group.name,
      description: gm.group.description,
      icon: gm.group.icon,
      type: gm.group.type,
      isDefault: gm.group.isDefault,
      university: gm.group.university,
      members: gm.group.members,
      messages: gm.group.messages,
    }))

    console.log(`✅ Returning ${groups.length} groups`)
    console.log('Groups:', groups.map(g => ({ id: g.id, name: g.name })))

    return Response.json({
      success: true,
      groups,
    })
  } catch (error) {
    console.error('❌ Get groups error:', error)
    return Response.json(
      { error: 'Failed to fetch groups', details: String(error) },
      { status: 500 }
    )
  }
}