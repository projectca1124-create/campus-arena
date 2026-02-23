// app/api/messages/route.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET messages for a group
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    if (!groupId) {
      return Response.json(
        { error: 'groupId is required' },
        { status: 400 }
      )
    }

    console.log('💬 Fetching messages for group:', groupId)

    const messages = await prisma.message.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })

    console.log(`✅ Found ${messages.length} messages`)

    return Response.json({
      success: true,
      messages,
    })
  } catch (error) {
    console.error('❌ Get messages error:', error)
    return Response.json(
      { error: 'Failed to fetch messages', details: String(error) },
      { status: 500 }
    )
  }
}

// POST message to a group
export async function POST(request: Request) {
  try {
    const { content, groupId, userId } = await request.json()

    if (!content || !groupId || !userId) {
      return Response.json(
        { error: 'content, groupId, and userId are required' },
        { status: 400 }
      )
    }

    console.log('📤 Creating message in group:', groupId)

    const message = await prisma.message.create({
      data: {
        content,
        groupId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
          },
        },
      },
    })

    console.log('✅ Message created:', message.id)

    return Response.json({
      success: true,
      message,
    })
  } catch (error) {
    console.error('❌ Post message error:', error)
    return Response.json(
      { error: 'Failed to create message', details: String(error) },
      { status: 500 }
    )
  }
}