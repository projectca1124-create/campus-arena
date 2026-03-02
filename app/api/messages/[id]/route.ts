// Save as: app/api/messages/[id]/route.ts (replace existing)
import { PrismaClient } from '@prisma/client'
import pusherServer from '@/lib/pusher-server'

const prisma = new PrismaClient()

// Helper: get DM channel name
function getDMChannel(id1: string, id2: string) {
  const sorted = [id1, id2].sort()
  return `dm-${sorted[0]}-${sorted[1]}`
}

// DELETE a message
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await request.json()
    const messageId = params.id

    // Try group message first
    const groupMsg = await prisma.message.findUnique({ where: { id: messageId }, select: { userId: true, groupId: true } })
    if (groupMsg) {
      if (groupMsg.userId !== userId) return Response.json({ error: 'Unauthorized' }, { status: 403 })
      await prisma.message.delete({ where: { id: messageId } })

      // ── Pusher: broadcast deletion ──
      await pusherServer.trigger(`group-${groupMsg.groupId}`, 'message-deleted', {
        messageId,
      }).catch(err => console.error('Pusher delete error:', err))

      return Response.json({ success: true })
    }

    // Try DM
    const dm = await prisma.directMessage.findUnique({ where: { id: messageId }, select: { senderId: true, receiverId: true } })
    if (dm) {
      if (dm.senderId !== userId) return Response.json({ error: 'Unauthorized' }, { status: 403 })
      await prisma.directMessage.delete({ where: { id: messageId } })

      // ── Pusher: broadcast DM deletion ──
      const channel = getDMChannel(dm.senderId, dm.receiverId)
      await pusherServer.trigger(channel, 'message-deleted', {
        messageId,
      }).catch(err => console.error('Pusher DM delete error:', err))

      return Response.json({ success: true })
    }

    return Response.json({ error: 'Message not found' }, { status: 404 })
  } catch (error) {
    console.error('Delete error:', error)
    return Response.json({ error: 'Failed to delete' }, { status: 500 })
  }
}

// PATCH (edit) a message
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { content, userId } = await request.json()
    const messageId = params.id

    if (!content?.trim()) return Response.json({ error: 'Content required' }, { status: 400 })

    // Try group message first
    const groupMsg = await prisma.message.findUnique({ where: { id: messageId }, select: { userId: true, groupId: true } })
    if (groupMsg) {
      if (groupMsg.userId !== userId) return Response.json({ error: 'Unauthorized' }, { status: 403 })
      const updated = await prisma.message.update({ where: { id: messageId }, data: { content } })

      // ── Pusher: broadcast edit ──
      await pusherServer.trigger(`group-${groupMsg.groupId}`, 'message-edited', {
        messageId,
        content,
      }).catch(err => console.error('Pusher edit error:', err))

      return Response.json({ message: updated })
    }

    // Try DM
    const dm = await prisma.directMessage.findUnique({ where: { id: messageId }, select: { senderId: true, receiverId: true } })
    if (dm) {
      if (dm.senderId !== userId) return Response.json({ error: 'Unauthorized' }, { status: 403 })
      const updated = await prisma.directMessage.update({ where: { id: messageId }, data: { content } })

      // ── Pusher: broadcast DM edit ──
      const channel = getDMChannel(dm.senderId, dm.receiverId)
      await pusherServer.trigger(channel, 'message-edited', {
        messageId,
        content,
      }).catch(err => console.error('Pusher DM edit error:', err))

      return Response.json({ message: updated })
    }

    return Response.json({ error: 'Message not found' }, { status: 404 })
  } catch (error) {
    console.error('Edit error:', error)
    return Response.json({ error: 'Failed to edit' }, { status: 500 })
  }
}