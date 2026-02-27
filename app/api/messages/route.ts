// app/api/messages/route.ts

import { PrismaClient } from '@prisma/client'
import { notifyGroupMessage } from '@/lib/notifications'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const after = searchParams.get('after') // For polling: only get messages after this timestamp

    if (!groupId) return Response.json({ error: 'groupId is required' }, { status: 400 })

    const where: any = { groupId }
    if (after) {
      where.createdAt = { gt: new Date(after) }
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } },
        reactions: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })

    return Response.json({ success: true, messages })
  } catch (error) {
    console.error('❌ Get messages error:', error)
    return Response.json({ error: 'Failed to fetch messages', details: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { content, groupId, userId, fileUrl, fileName, fileType, imageUrl } = await request.json()

    if (!groupId || !userId) return Response.json({ error: 'groupId and userId are required' }, { status: 400 })
    if (!content && !fileUrl && !imageUrl) return Response.json({ error: 'content, file, or image is required' }, { status: 400 })

    const message = await prisma.message.create({
      data: {
        content: content || '',
        groupId,
        userId,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        imageUrl: imageUrl || null,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } },
      },
    })

    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } })
    const senderName = `${message.user.firstName} ${message.user.lastName}`
    notifyGroupMessage(groupId, userId, senderName, group?.name || 'Group').catch(() => {})

    return Response.json({ success: true, message })
  } catch (error) {
    console.error('❌ Post message error:', error)
    return Response.json({ error: 'Failed to create message', details: String(error) }, { status: 500 })
  }
}