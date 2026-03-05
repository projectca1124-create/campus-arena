// app/api/groups/route.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 })
    }

    const groupMembers = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true, email: true, firstName: true, lastName: true,
                    university: true, major: true, degree: true,
                    semester: true, year: true, profileImage: true,
                  },
                },
              },
            },
            messages: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, profileImage: true },
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 50,
            },
          },
        },
      },
    })

    const groups = groupMembers.map((gm) => ({
      id: gm.group.id,
      name: gm.group.name,
      description: gm.group.description,
      icon: gm.group.icon,
      type: gm.group.type,
      isDefault: gm.group.isDefault,
      visibility: gm.group.visibility,   // ✅ was missing
      inviteCode: gm.group.inviteCode,   // ✅ was missing
      university: gm.group.university,
      degree: gm.group.degree,
      major: gm.group.major,
      members: gm.group.members,
      messages: gm.group.messages,
    }))

    return Response.json({ success: true, groups })
  } catch (error) {
    console.error('❌ Get groups error:', error)
    return Response.json({ error: 'Failed to fetch groups', details: String(error) }, { status: 500 })
  }
}