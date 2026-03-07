// app/api/messages/reactions/route.ts
import { PrismaClient } from '@prisma/client'
import { publishEvent } from '@/lib/ably-server'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { messageId, userId, emoji } = await request.json()
    if (!messageId || !userId || !emoji) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Find the message to get the groupId for Ably broadcast
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { groupId: true },
    })

    if (!message) {
      return Response.json({ error: 'Message not found' }, { status: 404 })
    }

    // Toggle: remove if already reacted with this emoji, add if not
    const existing = await prisma.messageReaction.findFirst({
      where: { messageId, userId, emoji },
    })

    if (existing) {
      await prisma.messageReaction.delete({ where: { id: existing.id } })
    } else {
      await prisma.messageReaction.create({
        data: { messageId, userId, emoji },
      })
    }

    // Fetch full updated reactions for this message
    const updatedReactions = await prisma.messageReaction.findMany({
      where: { messageId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    // Broadcast to group channel so ALL members see reaction update instantly
    await publishEvent(`group-${message.groupId}`, 'reaction-updated', {
      messageId,
      reactions: updatedReactions,
    })

    return Response.json({ reactions: updatedReactions })
  } catch (error) {
    console.error('Message reaction error:', error)
    return Response.json({ error: 'Failed to toggle reaction' }, { status: 500 })
  }
}