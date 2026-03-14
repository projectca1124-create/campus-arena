// app/api/groups/join/route.ts
import { PrismaClient } from '@prisma/client'
import { publishEvent } from '@/lib/socket-server'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { userId, inviteCode } = await request.json()
    if (!userId || !inviteCode) {
      return Response.json({ error: 'userId and inviteCode are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

    // Find group by invite code
    const group = await prisma.group.findUnique({
      where: { inviteCode: inviteCode.trim().toLowerCase() },
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

    if (!group) {
      return Response.json({ error: 'Invalid invite code. Group not found.' }, { status: 404 })
    }

    // Check if already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: group.id } },
    })
    if (existingMember) {
      return Response.json({ success: true, group, alreadyMember: true })
    }

    // ── PRIVATE GROUP → pending approval flow ──────────────────────
    if (group.visibility === 'private') {
      // Check if already has a pending request
      const existingRequest = await prisma.groupJoinRequest.findUnique({
        where: { userId_groupId: { userId, groupId: group.id } },
      })
      if (existingRequest) {
        return Response.json({
          success: true,
          pending: true,
          alreadyMember: false,
          message: 'You already have a pending request for this group.',
        })
      }

      // Create join request
      await prisma.groupJoinRequest.create({
        data: { userId, groupId: group.id, status: 'pending' },
      })

      // Find group admins and notify each one
      const admins = group.members.filter(m => m.role === 'admin')
      const requesterName = `${user.firstName} ${user.lastName}`

      await Promise.all(admins.map(async (admin) => {
        // DB notification
        const notification = await prisma.notification.create({
          data: {
            userId: admin.userId,
            type: 'group_join_request',
            title: '👥 Join Request',
            body: `${requesterName} wants to join "${group.name}"`,
            link: `/home?groupId=${group.id}&approveUser=${userId}`,
            read: false,
          },
        })
        // Real-time push to admin
        await publishEvent(`user-${admin.userId}`, 'new-notification', {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          link: notification.link,
          read: false,
          createdAt: notification.createdAt.toISOString(),
          meta: { groupId: group.id, requesterId: userId, requesterName },
        }).catch(() => {})
      }))

      console.log(`⏳ Join request created: user ${userId} → group ${group.id}`)
      return Response.json({
        success: true,
        pending: true,
        alreadyMember: false,
        groupName: group.name,
        message: `Your request to join "${group.name}" has been sent. You'll be notified when an admin approves it.`,
      })
    }

    // ── PUBLIC GROUP → instant join ─────────────────────────────────
    await prisma.groupMember.create({
      data: { userId, groupId: group.id, role: 'member' },
    })

    // Post "xyz joined the group" system message
    const joinMsg = await prisma.message.create({
      data: {
        content: `${user.firstName} ${user.lastName} joined the group`,
        groupId: group.id,
        userId,
        fileUrl: null, fileName: null, fileType: null, imageUrl: null,
      },
      select: {
        id: true, content: true, groupId: true, userId: true, createdAt: true,
        fileUrl: true, fileName: true, fileType: true, imageUrl: true, replyToId: true,
        replyTo: { select: { id: true, content: true, imageUrl: true, user: { select: { id: true, firstName: true, lastName: true } } } },
        user: { select: { id: true, firstName: true, lastName: true, email: true, profileImage: true } },
        reactions: { select: { id: true, emoji: true, messageId: true, userId: true, user: { select: { id: true, firstName: true, lastName: true } } } },
      },
    })
    await publishEvent(`group-${group.id}`, 'new-message', {
      message: { ...joinMsg, isSystemMessage: true },
    }).catch(() => {})

    const updatedGroup = await prisma.group.findUnique({
      where: { id: group.id },
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

    console.log(`✅ User ${userId} joined public group ${group.id}`)
    return Response.json({ success: true, group: updatedGroup, alreadyMember: false })

  } catch (error) {
    console.error('❌ Join group error:', error)
    return Response.json({ error: 'Failed to join group', details: String(error) }, { status: 500 })
  }
}