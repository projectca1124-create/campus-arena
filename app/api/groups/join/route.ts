import { PrismaClient } from '@prisma/client'

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

    // Add user to group
    await prisma.groupMember.create({
      data: { userId, groupId: group.id, role: 'member' },
    })

    // Refetch with updated members
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

    console.log(`✅ User ${userId} joined group ${group.id} via invite code`)

    return Response.json({ success: true, group: updatedGroup, alreadyMember: false })
  } catch (error) {
    console.error('❌ Join group error:', error)
    return Response.json({ error: 'Failed to join group', details: String(error) }, { status: 500 })
  }
}