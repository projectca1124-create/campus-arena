// app/api/groups/requests/route.ts
// GET pending join requests for groups where the caller is admin

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId')
    const groupId = searchParams.get('groupId')

    if (!adminId) {
      return Response.json({ error: 'adminId is required' }, { status: 400 })
    }

    // Get all groups this user admins
    const adminGroups = await prisma.groupMember.findMany({
      where: { userId: adminId, role: 'admin', ...(groupId ? { groupId } : {}) },
      select: { groupId: true },
    })
    const adminGroupIds = adminGroups.map(g => g.groupId)

    // Get all pending requests for those groups
    const requests = await prisma.groupJoinRequest.findMany({
      where: { groupId: { in: adminGroupIds }, status: 'pending' },
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true,
            profileImage: true, major: true, year: true, university: true,
          },
        },
        group: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return Response.json({ success: true, requests })
  } catch (error) {
    console.error('❌ Get requests error:', error)
    return Response.json({ error: 'Failed to fetch requests', details: String(error) }, { status: 500 })
  }
}