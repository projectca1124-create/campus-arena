// app/api/groups/leave/route.ts
import { PrismaClient } from '@prisma/client'
import { publishEvent } from '@/lib/socket-server'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { userId, groupId } = await request.json()
    if (!userId || !groupId) {
      return Response.json({ error: 'userId and groupId are required' }, { status: 400 })
    }

    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    })
    if (!member) {
      return Response.json({ error: 'You are not a member of this group' }, { status: 404 })
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true, isDefault: true },
    })

    // Prevent leaving default university/major groups
    if (group?.isDefault) {
      return Response.json({ error: 'You cannot leave your default university or major group' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    })

    // Remove member
    await prisma.groupMember.delete({
      where: { userId_groupId: { userId, groupId } },
    })

    // Post system message "xyz left the group"
    const leaveMsg = await prisma.message.create({
      data: {
        content: `${user?.firstName} ${user?.lastName} left the group`,
        groupId,
        userId,
        fileUrl: null,
        fileName: null,
        fileType: null,
        imageUrl: null,
      },
      select: {
        id: true, content: true, groupId: true, userId: true, createdAt: true,
        fileUrl: true, fileName: true, fileType: true, imageUrl: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } },
        reactions: { select: { id: true, emoji: true, messageId: true, userId: true, user: { select: { id: true, firstName: true, lastName: true } } } },
      },
    })

    await publishEvent(`group-${groupId}`, 'new-message', {
      message: { ...leaveMsg, isSystemMessage: true },
    }).catch(() => {})

    // Also broadcast member-left so all clients can update member counts
    await publishEvent(`group-${groupId}`, 'member-left', { userId, groupId }).catch(() => {})

    return Response.json({ success: true })
  } catch (error) {
    console.error('Leave group error:', error)
    return Response.json({ error: 'Failed to leave group', details: String(error) }, { status: 500 })
  }
}