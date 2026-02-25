// app/api/messages/reactions/route.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST - toggle a reaction (add if not exists, remove if exists)
export async function POST(request: Request) {
  try {
    const { messageId, userId, emoji } = await request.json()

    if (!messageId || !userId || !emoji) {
      return Response.json(
        { error: 'messageId, userId, and emoji are required' },
        { status: 400 }
      )
    }

    // Check if reaction already exists
    const existing = await prisma.messageReaction.findFirst({
      where: { messageId, userId, emoji },
    })

    if (existing) {
      // Remove reaction (toggle off)
      await prisma.messageReaction.delete({ where: { id: existing.id } })
      return Response.json({ success: true, action: 'removed', emoji })
    } else {
      // Add reaction (toggle on)
      await prisma.messageReaction.create({
        data: { messageId, userId, emoji },
      })
      return Response.json({ success: true, action: 'added', emoji })
    }
  } catch (error) {
    console.error('❌ Reaction error:', error)
    return Response.json(
      { error: 'Failed to toggle reaction', details: String(error) },
      { status: 500 }
    )
  }
}