// app/api/dm/route.ts — SECURED + ABLY VERSION
import { PrismaClient } from '@prisma/client'
import { publishEvent } from '@/lib/socket-server'
import { notifyDM } from '@/lib/notifications'

const prisma = new PrismaClient()

function getDMChannel(id1: string, id2: string) {
  const sorted = [id1, id2].sort()
  return `dm-${sorted[0]}-${sorted[1]}`
}

const DM_SELECT = {
  id: true, content: true, senderId: true, receiverId: true, createdAt: true,
  fileUrl: true, fileName: true, fileType: true, imageUrl: true,
  read: true, replyToId: true,
  sender: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
  receiver: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
  replyTo: {
    select: {
      id: true, content: true, imageUrl: true,
      sender: { select: { id: true, firstName: true, lastName: true } },
    },
  },
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    // Primary: session. Fallback: userId query param (fresh signup case)
    const userId = searchParams.get('userId') || null
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const otherUserId = searchParams.get('otherUserId')
    const after = searchParams.get('after')

    if (otherUserId) {
      const where: any = {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      }
      if (after) where.createdAt = { gt: new Date(after) }

      const messages = await prisma.directMessage.findMany({
        where, select: DM_SELECT,
        orderBy: { createdAt: 'asc' },
        take: after ? 50 : 100,
      })

      if (!after) {
        const updated = await prisma.directMessage.updateMany({
          where: { senderId: otherUserId, receiverId: userId, read: false },
          data: { read: true },
        })
        if (updated.count > 0) {
          const channel = getDMChannel(userId, otherUserId)
          await publishEvent(channel, 'messages-read', {
            readBy: userId,
            readAt: new Date().toISOString(),
          })
        }
      }

      return Response.json({ messages })
    }

    // Conversations list
    const allDMs = await prisma.directMessage.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      select: {
        id: true, content: true, senderId: true, receiverId: true, read: true, createdAt: true,
        sender: { select: { id: true, firstName: true, lastName: true, profileImage: true, major: true, year: true, onboardingComplete: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, profileImage: true, major: true, year: true, onboardingComplete: true } },
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
      .filter(c => c.user.onboardingComplete !== false && c.user.firstName)  // ✅ hide ghost accounts
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
    const { content, receiverId, fileUrl, fileName, fileType, imageUrl, replyToId, senderId: bodySenderId } = body

    // Auth: senderId from request body, validated against DB
    if (!bodySenderId) return Response.json({ error: 'senderId required' }, { status: 400 })
    const userExists = await prisma.user.findUnique({ where: { id: bodySenderId }, select: { id: true } })
    if (!userExists) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const senderId = bodySenderId

    if (!receiverId) return Response.json({ error: 'receiverId required' }, { status: 400 })
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
        ...(replyToId ? { replyToId } : {}),
      },
      select: DM_SELECT,
    })

    // ── Publish real-time events ─────────────────────────────────────────────
    const channel = getDMChannel(senderId, receiverId)
    const senderName = `${message.sender.firstName} ${message.sender.lastName}`
    const dmPreview = content?.substring(0, 50) || '📎 Attachment'

    // Publish both events in parallel — don't let one failure block the other
    const [dmPublish, notifPublish] = await Promise.allSettled([
      // 1. DM channel — receiver's open chat sees message immediately
      publishEvent(channel, 'new-message', { message }),
      // 2. User channel — receiver's sidebar + notification bell updates
      publishEvent(`user-${receiverId}`, 'new-dm-notification', {
        from: {
          id: message.sender.id,
          firstName: message.sender.firstName,
          lastName: message.sender.lastName,
          profileImage: message.sender.profileImage,
        },
        preview: dmPreview,
        timestamp: message.createdAt,
      }),
    ])

    if (dmPublish.status === 'rejected') {
      console.error('[DM route] DM channel publish failed:', dmPublish.reason)
    }
    if (notifPublish.status === 'rejected') {
      console.error('[DM route] User notification publish failed:', notifPublish.reason)
    }

    // DB notification + web push (fire and forget — don't block response)
    notifyDM(receiverId, senderName, dmPreview, senderId).catch(() => {})

    return Response.json({ message })
  } catch (error) {
    console.error('Send DM error:', error)
    return Response.json({ error: 'Failed to send' }, { status: 500 })
  }
}