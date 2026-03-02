// Save as: app/api/dm/reactions/route.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { messageId, userId, emoji } = await request.json()
    if (!messageId || !userId || !emoji) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if reaction already exists (toggle behavior)
    const existing = await (prisma as any).dMReaction.findFirst({
      where: { messageId, userId, emoji }
    })

    if (existing) {
      // Remove the reaction (toggle off)
      await (prisma as any).dMReaction.delete({ where: { id: existing.id } })
      return Response.json({ action: 'removed' })
    } else {
      // Add the reaction
      const reaction = await (prisma as any).dMReaction.create({
        data: { messageId, userId, emoji }
      })
      return Response.json({ action: 'added', reaction })
    }
  } catch (error) {
    console.error('DM Reaction error:', error)
    return Response.json({ error: 'Failed to toggle reaction' }, { status: 500 })
  }
}