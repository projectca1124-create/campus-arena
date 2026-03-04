// app/api/messages/route.ts — SECURED + GROUP NOTIFICATIONS
import { PrismaClient } from '@prisma/client'
import pusherServer from '@/lib/pusher-server'
import { getAuthUser } from '@/lib/auth'

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
      where,
      select: MESSAGE_SELECT,
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
    // ── Verify session ──
    const auth = await getAuthUser()
    if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { content, groupId, fileUrl, fileName, fileType, imageUrl, replyToId } = body
    const userId = auth.userId  // ← From JWT, not body

    if (!groupId) return Response.json({ error: 'groupId required' }, { status: 400 })
    if (!content?.trim() && !fileUrl && !imageUrl) return Response.json({ error: 'Content required' }, { status: 400 })

    const message = await prisma.message.create({
      data: {
        content: content || '',
        groupId,
        userId,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        imageUrl: imageUrl || null,
        replyToId: replyToId || null,
      },
      select: MESSAGE_SELECT,
    })

    // ── Pusher: broadcast new message to the group channel ──
    // (This updates the chat for anyone who has this group open)
    await pusherServer.trigger(`group-${groupId}`, 'new-message', {
      message,
    }).catch(err => console.error('Pusher trigger error:', err))

    // ── Pusher: notify ALL group members about new message ──
    // (This updates the sidebar unread badge for everyone else)
    try {
      const members = await prisma.groupMember.findMany({
        where: { groupId },
        select: { userId: true },
      })

      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { name: true },
      })

      // Send notification to each member except the sender
      const notifications = members
        .filter(m => m.userId !== userId)
        .map(m =>
          pusherServer.trigger(`user-${m.userId}`, 'new-group-notification', {
            groupId,
            groupName: group?.name || 'Group',
            from: {
              id: message.user.id,
              firstName: message.user.firstName,
              lastName: message.user.lastName,
            },
            preview: content?.substring(0, 50) || '📎 Attachment',
            messageId: message.id,
            timestamp: message.createdAt,
          }).catch(err => console.error('Pusher group notification error:', err))
        )

      await Promise.all(notifications)
    } catch (err) {
      // Don't fail the request if notifications fail
      console.error('Group notification error:', err)
    }

    return Response.json({ message })
  } catch (error) {
    console.error('Send message error:', error)
    return Response.json({ error: 'Failed to send message' }, { status: 500 })
  }
}