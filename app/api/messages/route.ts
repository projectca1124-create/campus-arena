// app/api/messages/route.ts — ABLY VERSION
import { PrismaClient } from '@prisma/client'
import { publishEvent } from '@/lib/ably-server'

const prisma = new PrismaClient()

const MESSAGE_SELECT = {
  id: true, content: true, groupId: true, userId: true, createdAt: true,
  fileUrl: true, fileName: true, fileType: true, imageUrl: true,
  replyToId: true,
  replyTo: {
    select: {
      id: true, content: true, imageUrl: true,
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  user: { select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } },
  reactions: { select: { id: true, emoji: true, messageId: true, userId: true, user: { select: { id: true, firstName: true, lastName: true } } } },
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const after = searchParams.get('after')
    if (!groupId) return Response.json({ error: 'groupId required' }, { status: 400 })

    const where: any = { groupId }
    if (after) where.createdAt = { gt: new Date(after) }

    const messages = await prisma.message.findMany({
      where, select: MESSAGE_SELECT,
      orderBy: { createdAt: 'asc' },
      take: after ? 50 : 100,
    })

    return Response.json({ messages })
  } catch (error) {
    console.error('Get messages error:', error)
    return Response.json({ error: 'Failed to get messages' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { content, groupId, userId, fileUrl, fileName, fileType, imageUrl, replyToId } = body

    if (!groupId || !userId) return Response.json({ error: 'Missing fields' }, { status: 400 })
    if (!content?.trim() && !fileUrl && !imageUrl) return Response.json({ error: 'Content required' }, { status: 400 })

    const message = await prisma.message.create({
      data: {
        content: content || '',
        groupId, userId,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        imageUrl: imageUrl || null,
        replyToId: replyToId || null,
      },
      select: MESSAGE_SELECT,
    })

    // Broadcast to group channel (all open clients see it instantly)
    await publishEvent(`group-${groupId}`, 'new-message', { message })

    // Notify all other group members on their personal channels
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        name: true,
        members: { select: { userId: true } },
      },
    })

    if (group) {
      const notifyPromises = group.members
        .filter(m => m.userId !== userId)
        .map(m =>
          publishEvent(`user-${m.userId}`, 'new-group-notification', {
            groupId,
            groupName: group.name,
            from: message.user,
            preview: content?.substring(0, 60) || '📎 Attachment',
            messageId: message.id,
            timestamp: message.createdAt,
          })
        )
      await Promise.all(notifyPromises)
    }

    return Response.json({ message })
  } catch (error) {
    console.error('Send message error:', error)
    return Response.json({ error: 'Failed to send message' }, { status: 500 })
  }
}