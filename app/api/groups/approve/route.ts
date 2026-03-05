// app/api/groups/approve/route.ts
// Admin approves or rejects a join request

import { PrismaClient } from '@prisma/client'
import { publishEvent } from '@/lib/ably-server'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { adminId, userId, groupId, action } = await request.json()
    // action: 'approve' | 'reject'

    if (!adminId || !userId || !groupId || !action) {
      return Response.json({ error: 'adminId, userId, groupId, action are required' }, { status: 400 })
    }

    // Verify admin is actually an admin of this group
    const adminMember = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: adminId, groupId } },
    })
    if (!adminMember || adminMember.role !== 'admin') {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Find the pending request
    const joinRequest = await prisma.groupJoinRequest.findUnique({
      where: { userId_groupId: { userId, groupId } },
    })
    if (!joinRequest) {
      return Response.json({ error: 'Join request not found' }, { status: 404 })
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    })

    if (action === 'approve') {
      // Add user as member
      await prisma.groupMember.create({
        data: { userId, groupId, role: 'member' },
      })

      // Delete the request
      await prisma.groupJoinRequest.delete({
        where: { userId_groupId: { userId, groupId } },
      })

      // Notify the approved user
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: 'group_approved',
          title: '✅ Request Approved',
          body: `You've been approved to join "${group?.name}"!`,
          link: `/home`,
          read: false,
        },
      })
      await publishEvent(`user-${userId}`, 'new-notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        link: notification.link,
        read: false,
        createdAt: notification.createdAt.toISOString(),
        meta: { groupId, approved: true },
      }).catch(() => {})

      console.log(`✅ User ${userId} approved for group ${groupId}`)
      return Response.json({ success: true, action: 'approved' })

    } else if (action === 'reject') {
      // Delete the request
      await prisma.groupJoinRequest.delete({
        where: { userId_groupId: { userId, groupId } },
      })

      // Notify the rejected user
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: 'group_rejected',
          title: '❌ Request Declined',
          body: `Your request to join "${group?.name}" was not approved.`,
          link: `/home`,
          read: false,
        },
      })
      await publishEvent(`user-${userId}`, 'new-notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        link: notification.link,
        read: false,
        createdAt: notification.createdAt.toISOString(),
        meta: { groupId, approved: false },
      }).catch(() => {})

      console.log(`❌ User ${userId} rejected from group ${groupId}`)
      return Response.json({ success: true, action: 'rejected' })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('❌ Approve group error:', error)
    return Response.json({ error: 'Failed to process request', details: String(error) }, { status: 500 })
  }
}