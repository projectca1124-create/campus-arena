// app/api/dm/route.ts

import { notifyDM } from '@/lib/notifications'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - fetch DM conversations or messages for a specific conversation
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const otherUserId = searchParams.get('otherUserId')

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 })
    }

    // If otherUserId provided, get messages for that conversation
    if (otherUserId) {
      const messages = await prisma.directMessage.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
          receiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 100,
      })

      // Mark unread messages as read
      await prisma.directMessage.updateMany({
        where: {
          senderId: otherUserId,
          receiverId: userId,
          read: false,
        },
        data: { read: true },
      })

      return Response.json({ success: true, messages })
    }

    // Otherwise, get conversation list (unique people the user has DM'd with)
    const allDMs = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            major: true,
            year: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            major: true,
            year: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Build unique conversation list
    const conversationMap = new Map<string, {
      user: any
      lastMessage: string
      lastMessageAt: string
      unreadCount: number
    }>()

    for (const dm of allDMs) {
      const otherUser = dm.senderId === userId ? dm.receiver : dm.sender
      const otherId = otherUser.id

      if (!conversationMap.has(otherId)) {
        // Count unread from this person
        const unreadCount = allDMs.filter(
          m => m.senderId === otherId && m.receiverId === userId && !m.read
        ).length

        conversationMap.set(otherId, {
          user: otherUser,
          lastMessage: dm.content,
          lastMessageAt: dm.createdAt.toISOString(),
          unreadCount,
        })
      }
    }

    const conversations = Array.from(conversationMap.values())

    return Response.json({ success: true, conversations })
  } catch (error) {
    console.error('❌ DM GET error:', error)
    return Response.json(
      { error: 'Failed to fetch DMs', details: String(error) },
      { status: 500 }
    )
  }
}

// POST - send a new DM
export async function POST(request: Request) {
  try {
    const { content, senderId, receiverId } = await request.json()

    if (!content || !senderId || !receiverId) {
      return Response.json(
        { error: 'content, senderId, and receiverId are required' },
        { status: 400 }
      )
    }

    const message = await prisma.directMessage.create({
      data: {
        content,
        senderId,
        receiverId,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    })

    const senderUser = await prisma.user.findUnique({ where: { id: senderId }, select: { firstName: true, lastName: true } })
notifyDM(receiverId, `${senderUser?.firstName} ${senderUser?.lastName}`).catch(() => {})

    return Response.json({ success: true, message })
  } catch (error) {
    console.error('❌ DM POST error:', error)
    return Response.json(
      { error: 'Failed to send DM', details: String(error) },
      { status: 500 }
    )
  }
}