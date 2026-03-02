// Save as: app/api/dm/route.ts (replace existing)
import { PrismaClient } from '@prisma/client'
import pusherServer from '@/lib/pusher-server'

const prisma = new PrismaClient()

// Helper: get consistent DM channel name
function getDMChannel(id1: string, id2: string) {
  const sorted = [id1, id2].sort()
  return `dm-${sorted[0]}-${sorted[1]}`
}

const DM_SELECT = {
  id: true, content: true, senderId: true, receiverId: true, createdAt: true,
  fileUrl: true, fileName: true, fileType: true, imageUrl: true,
  read: true,
  sender: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
  receiver: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const otherUserId = searchParams.get('otherUserId')
    const after = searchParams.get('after')

    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 })

    // If otherUserId, return messages between two users
    if (otherUserId) {
      const where: any = {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      }
      if (after) where.createdAt = { gt: new Date(after) }

      const messages = await prisma.directMessage.findMany({
        where,
        select: DM_SELECT,
        orderBy: { createdAt: 'asc' },
        take: after ? 50 : 100,
      })

      // Mark unread messages as read
      if (!after) {
        const updated = await prisma.directMessage.updateMany({
          where: { senderId: otherUserId, receiverId: userId, read: false },
          data: { read: true },
        })

        // ── Pusher: notify sender that their messages were read ──
        if (updated.count > 0) {
          const channel = getDMChannel(userId, otherUserId)
          await pusherServer.trigger(channel, 'messages-read', {
            readBy: userId,
            readAt: new Date().toISOString(),
          }).catch(err => console.error('Pusher read receipt error:', err))
        }
      }

      return Response.json({ messages })
    }

    // Otherwise return conversations list
    const allDMs = await prisma.directMessage.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      select: {
        id: true, content: true, senderId: true, receiverId: true, read: true, createdAt: true,
        sender: { select: { id: true, firstName: true, lastName: true, profileImage: true, major: true, year: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, profileImage: true, major: true, year: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const conversationMap = new Map<string, any>()
    for (const dm of allDMs) {
      const otherUser = dm.senderId === userId ? dm.receiver : dm.sender
      if (!conversationMap.has(otherUser.id)) {
        const unreadCount = dm.senderId !== userId && !dm.read ? 1 : 0
        conversationMap.set(otherUser.id, {
          user: otherUser,
          lastMessage: dm.content || (dm.senderId === userId ? 'You sent an attachment' : 'Sent an attachment'),
          lastMessageAt: dm.createdAt,
          unreadCount,
        })
      } else if (dm.senderId !== userId && !dm.read) {
        conversationMap.get(otherUser.id).unreadCount++
      }
    }

    const conversations = Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

    return Response.json({ conversations })
  } catch (error) {
    console.error('DM error:', error)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { content, senderId, receiverId, fileUrl, fileName, fileType, imageUrl, replyToId } = body

    if (!senderId || !receiverId) return Response.json({ error: 'Missing fields' }, { status: 400 })
    if (!content?.trim() && !fileUrl && !imageUrl) return Response.json({ error: 'Content required' }, { status: 400 })

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
      select: DM_SELECT,
    })

    // ── Pusher: broadcast new DM to the DM channel ──
    const channel = getDMChannel(senderId, receiverId)
    await pusherServer.trigger(channel, 'new-message', {
      message,
    }).catch(err => console.error('Pusher DM trigger error:', err))

    // ── Pusher: notify receiver about new conversation update ──
    // This updates the conversation list sidebar for the other user
    await pusherServer.trigger(`user-${receiverId}`, 'new-dm-notification', {
      from: {
        id: message.sender.id,
        firstName: message.sender.firstName,
        lastName: message.sender.lastName,
        profileImage: message.sender.profileImage,
      },
      preview: content?.substring(0, 50) || '📎 Attachment',
      timestamp: message.createdAt,
    }).catch(err => console.error('Pusher notification error:', err))

    return Response.json({ message })
  } catch (error) {
    console.error('Send DM error:', error)
    return Response.json({ error: 'Failed to send' }, { status: 500 })
  }
}