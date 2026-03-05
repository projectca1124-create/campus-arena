// app/api/groups/[id]/route.ts
import { PrismaClient } from '@prisma/client'
import { publishEvent } from '@/lib/ably-server'
import { createNotification } from '@/lib/notifications'

const prisma = new PrismaClient()

// DELETE — admin deletes the group entirely
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await params
  try {
    const { userId } = await request.json()
    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 })

    // Only admin can delete
    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    })
    if (!member || member.role !== 'admin') {
      return Response.json({ error: 'Only the group admin can delete this group' }, { status: 403 })
    }

    // Get all members before deleting so we can notify them
    const allMembers = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    })
    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } })

    // Notify all members the group was deleted
    await Promise.all(
      allMembers
        .filter(m => m.userId !== userId)
        .map(m =>
          createNotification({
            userId: m.userId,
            type: 'group',
            title: '🗑️ Group Deleted',
            body: `"${group?.name}" has been deleted by the admin.`,
          })
        )
    ).catch(() => {})

    // Broadcast via Ably so all open clients remove it immediately
    await publishEvent(`group-${groupId}`, 'group-deleted', { groupId }).catch(() => {})

    // Cascade delete (schema has onDelete: Cascade for members/messages)
    await prisma.group.delete({ where: { id: groupId } })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Delete group error:', error)
    return Response.json({ error: 'Failed to delete group', details: String(error) }, { status: 500 })
  }
}

// PATCH — admin approves or rejects a join request
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await params
  try {
    const { adminId, requesterId, action } = await request.json()
    // action: 'approve' | 'reject'
    if (!adminId || !requesterId || !action) {
      return Response.json({ error: 'adminId, requesterId, and action are required' }, { status: 400 })
    }

    // Verify admin
    const admin = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: adminId, groupId } },
    })
    if (!admin || admin.role !== 'admin') {
      return Response.json({ error: 'Only the group admin can approve/reject requests' }, { status: 403 })
    }

    const joinRequest = await prisma.groupJoinRequest.findUnique({
      where: { userId_groupId: { userId: requesterId, groupId } },
    })
    if (!joinRequest) {
      return Response.json({ error: 'Join request not found' }, { status: 404 })
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    })

    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
      select: { firstName: true, lastName: true },
    })

    if (action === 'approve') {
      // Add to group
      await prisma.groupMember.create({
        data: { userId: requesterId, groupId, role: 'member' },
      })

      // Update request status
      await prisma.groupJoinRequest.update({
        where: { userId_groupId: { userId: requesterId, groupId } },
        data: { status: 'approved' },
      })

      // Send "xyz joined" system message to the group
      const joinMsg = await prisma.message.create({
        data: {
          content: `${requester?.firstName} ${requester?.lastName} joined the group`,
          groupId,
          userId: requesterId,
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
        message: { ...joinMsg, isSystemMessage: true },
      }).catch(() => {})

      // Notify the requester they were approved — link opens the group directly
      await createNotification({
        userId: requesterId,
        type: 'group',
        title: '✅ Request Approved',
        body: `You've been approved to join "${group?.name}"! Tap to open the group.`,
        link: `/home?groupId=${groupId}`,
      })

      // Also push the new group to the approved user's sidebar via Ably
      await publishEvent(`user-${requesterId}`, 'group-approved', {
        groupId,
        groupName: group?.name,
      }).catch(() => {})

      // Fetch updated group to return to admin UI
      const updatedGroup = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true, email: true, firstName: true, lastName: true,
                  university: true, profileImage: true, major: true, semester: true, year: true,
                },
              },
            },
          },
          messages: true,
        },
      })

      return Response.json({ success: true, action: 'approved', group: updatedGroup })

    } else if (action === 'reject') {
      await prisma.groupJoinRequest.update({
        where: { userId_groupId: { userId: requesterId, groupId } },
        data: { status: 'rejected' },
      })

      // Notify requester they were rejected
      await createNotification({
        userId: requesterId,
        type: 'group',
        title: '❌ Request Declined',
        body: `Your request to join "${group?.name}" was declined.`,
      })

      return Response.json({ success: true, action: 'rejected' })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Group PATCH error:', error)
    return Response.json({ error: 'Failed to process request', details: String(error) }, { status: 500 })
  }
}

// GET — fetch pending join requests for a group (admin only)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await params
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId')
    if (!adminId) return Response.json({ error: 'adminId required' }, { status: 400 })

    const admin = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: adminId, groupId } },
    })
    if (!admin || admin.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const requests = await prisma.groupJoinRequest.findMany({
      where: { groupId, status: 'pending' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, profileImage: true, major: true, year: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return Response.json({ success: true, requests })
  } catch (error) {
    console.error('Get join requests error:', error)
    return Response.json({ error: 'Failed to fetch requests', details: String(error) }, { status: 500 })
  }
}