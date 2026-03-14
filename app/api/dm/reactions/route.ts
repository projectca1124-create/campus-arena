// app/api/dm/reactions/route.ts
import { PrismaClient } from '@prisma/client'
import { publishEvent } from '@/lib/socket-server'

const prisma = new PrismaClient()

function getDMChannel(id1: string, id2: string) {
  const sorted = [id1, id2].sort()
  return `dm-${sorted[0]}-${sorted[1]}`
}

export async function POST(request: Request) {
  try {
    const { messageId, userId, emoji } = await request.json()
    if (!messageId || !userId || !emoji) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Look up the DM to get both participants for the channel name
    const dm = await prisma.directMessage.findUnique({
      where: { id: messageId },
      select: { senderId: true, receiverId: true },
    })

    if (!dm) {
      return Response.json({ error: 'Message not found' }, { status: 404 })
    }

    // Toggle: remove if exists, add if not
    const existing = await prisma.dMReaction.findFirst({
      where: { messageId, userId, emoji },
    })

    let action: 'added' | 'removed'

    if (existing) {
      await prisma.dMReaction.delete({ where: { id: existing.id } })
      action = 'removed'
    } else {
      await prisma.dMReaction.create({
        data: { messageId, userId, emoji },
      })
      action = 'added'
    }

    // Fetch updated reactions for this message to broadcast full state
    const updatedReactions = await prisma.dMReaction.findMany({
      where: { messageId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    // Publish to DM channel so both users update instantly without refetch
    const channel = getDMChannel(dm.senderId, dm.receiverId)
    await publishEvent(channel, 'reaction-updated', {
      messageId,
      reactions: updatedReactions,
    })

    return Response.json({ action, reactions: updatedReactions })
  } catch (error) {
    console.error('DM Reaction error:', error)
    return Response.json({ error: 'Failed to toggle reaction' }, { status: 500 })
  }
}