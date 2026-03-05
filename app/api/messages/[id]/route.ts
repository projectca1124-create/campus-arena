// app/api/messages/[id]/route.ts — ABLY VERSION
import { PrismaClient } from '@prisma/client'
import { publishEvent } from '@/lib/ably-server'

const prisma = new PrismaClient()

function getDMChannel(id1: string, id2: string) {
  const sorted = [id1, id2].sort()
  return `dm-${sorted[0]}-${sorted[1]}`
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { userId } = await request.json()
    const messageId = id

    const groupMsg = await prisma.message.findUnique({ where: { id: messageId }, select: { userId: true, groupId: true } })
    if (groupMsg) {
      if (groupMsg.userId !== userId) return Response.json({ error: 'Unauthorized' }, { status: 403 })
      await prisma.message.delete({ where: { id: messageId } })
      await publishEvent(`group-${groupMsg.groupId}`, 'message-deleted', { messageId })
      return Response.json({ success: true })
    }

    const dm = await prisma.directMessage.findUnique({ where: { id: messageId }, select: { senderId: true, receiverId: true } })
    if (dm) {
      if (dm.senderId !== userId) return Response.json({ error: 'Unauthorized' }, { status: 403 })
      await prisma.directMessage.delete({ where: { id: messageId } })
      const channel = getDMChannel(dm.senderId, dm.receiverId)
      await publishEvent(channel, 'message-deleted', { messageId })
      return Response.json({ success: true })
    }

    return Response.json({ error: 'Message not found' }, { status: 404 })
  } catch (error) {
    console.error('Delete error:', error)
    return Response.json({ error: 'Failed to delete' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { content, userId } = await request.json()
    const messageId = id
    if (!content?.trim()) return Response.json({ error: 'Content required' }, { status: 400 })

    const groupMsg = await prisma.message.findUnique({ where: { id: messageId }, select: { userId: true, groupId: true } })
    if (groupMsg) {
      if (groupMsg.userId !== userId) return Response.json({ error: 'Unauthorized' }, { status: 403 })
      const updated = await prisma.message.update({ where: { id: messageId }, data: { content } })
      await publishEvent(`group-${groupMsg.groupId}`, 'message-edited', { messageId, content })
      return Response.json({ message: updated })
    }

    const dm = await prisma.directMessage.findUnique({ where: { id: messageId }, select: { senderId: true, receiverId: true } })
    if (dm) {
      if (dm.senderId !== userId) return Response.json({ error: 'Unauthorized' }, { status: 403 })
      const updated = await prisma.directMessage.update({ where: { id: messageId }, data: { content } })
      const channel = getDMChannel(dm.senderId, dm.receiverId)
      await publishEvent(channel, 'message-edited', { messageId, content })
      return Response.json({ message: updated })
    }

    return Response.json({ error: 'Message not found' }, { status: 404 })
  } catch (error) {
    console.error('Edit error:', error)
    return Response.json({ error: 'Failed to edit' }, { status: 500 })
  }
}