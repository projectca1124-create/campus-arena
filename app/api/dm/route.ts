// app/api/dm/route.ts

import { notifyDM } from '@/lib/notifications'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const otherUserId = searchParams.get('otherUserId')
    const after = searchParams.get('after') // For polling

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 })
    }

    if (otherUserId) {
      const where: any = {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      }
      if (after) {
        where.createdAt = { gt: new Date(after) }
      }

      const messages = await prisma.directMessage.findMany({
        where,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
          receiver: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 100,
      })

      // Mark unread as read
      if (!after) {
        await prisma.directMessage.updateMany({
          where: { senderId: otherUserId, receiverId: userId, read: false },
          data: { read: true },
        })
      }

      return Response.json({ success: true, messages })
    }

    // Conversation list
    const allDMs = await prisma.directMessage.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, profileImage: true, major: true, year: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, profileImage: true, major: true, year: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const conversationMap = new Map<string, {
      user: any; lastMessage: string; lastMessageAt: string; unreadCount: number
    }>()

    for (const dm of allDMs) {
      const otherUser = dm.senderId === userId ? dm.receiver : dm.sender
      const otherId = otherUser.id
      if (!conversationMap.has(otherId)) {
        const unreadCount = allDMs.filter(m => m.senderId === otherId && m.receiverId === userId && !m.read).length
        conversationMap.set(otherId, {
          user: otherUser,
          lastMessage: dm.content || (dm.imageUrl ? '📷 Image' : dm.fileUrl ? '📎 File' : ''),
          lastMessageAt: dm.createdAt.toISOString(),
          unreadCount,
        })
      }
    }

    return Response.json({ success: true, conversations: Array.from(conversationMap.values()) })
  } catch (error) {
    console.error('❌ DM GET error:', error)
    return Response.json({ error: 'Failed to fetch DMs', details: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { content, senderId, receiverId, fileUrl, fileName, fileType, imageUrl } = await request.json()

    if (!senderId || !receiverId) {
      return Response.json({ error: 'senderId and receiverId are required' }, { status: 400 })
    }
    if (!content && !fileUrl && !imageUrl) {
      return Response.json({ error: 'content, file, or image is required' }, { status: 400 })
    }

    const message = await prisma.directMessage.create({
      data: {
        content: content || '',
        senderId,
        receiverId,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        imageUrl: imageUrl || null,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
      },
    })

    const senderUser = await prisma.user.findUnique({ where: { id: senderId }, select: { firstName: true, lastName: true } })
    notifyDM(receiverId, `${senderUser?.firstName} ${senderUser?.lastName}`).catch(() => {})

    return Response.json({ success: true, message })
  } catch (error) {
    console.error('❌ DM POST error:', error)
    return Response.json({ error: 'Failed to send DM', details: String(error) }, { status: 500 })
  }
}