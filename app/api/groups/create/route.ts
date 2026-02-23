// app/api/groups/create/route.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { name, description, userId } = await request.json()

    if (!name || !userId) {
      return Response.json(
        { error: 'name and userId are required' },
        { status: 400 }
      )
    }

    console.log('🆕 Creating group:', name, 'by user:', userId)

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create the group and add the creator as admin member
    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        type: 'custom',
        isDefault: false,
        university: user.university || null,
        members: {
          create: {
            userId: userId,
            role: 'admin',
          },
        },
      },
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
        messages: true,
      },
    })

    console.log('✅ Group created:', group.id, group.name)

    return Response.json({
      success: true,
      group,
    })
  } catch (error) {
    console.error('❌ Create group error:', error)
    return Response.json(
      { error: 'Failed to create group', details: String(error) },
      { status: 500 }
    )
  }
}