// app/api/groups/route.ts
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex')
}

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
      visibility: gm.group.visibility,
      inviteCode: gm.group.inviteCode,
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

export async function POST(request: Request) {
  try {
    // ✅ FIX: Extract `icon` from the request body.
    // Previously `icon` was ignored here, so group pictures uploaded during
    // creation were silently dropped. The avatar PATCH endpoint worked fine
    // because it explicitly handled `icon` — the create endpoint just never did.
    const { name, description, userId, visibility, icon } = await request.json()

    if (!name || !userId) {
      return Response.json({ error: 'name and userId are required' }, { status: 400 })
    }

    console.log('🆕 Creating group:', name, 'by user:', userId, 'visibility:', visibility || 'public', '| has icon:', !!icon)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    const groupVisibility = visibility === 'private' ? 'private' : 'public'

    // Generate a unique invite code for all groups
    let inviteCode = generateInviteCode()
    let attempts = 0
    while (attempts < 5) {
      const existing = await prisma.group.findUnique({ where: { inviteCode } })
      if (!existing) break
      inviteCode = generateInviteCode()
      attempts++
    }

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        // ✅ FIX: Save the icon if one was provided during creation
        icon: icon || null,
        type: 'custom',
        isDefault: false,
        visibility: groupVisibility,
        inviteCode,
        university: user.university || null,
        members: {
          create: {
            userId: userId,
            role: 'admin',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true, email: true, firstName: true, lastName: true,
                university: true, profileImage: true, major: true,
                semester: true, year: true,
              },
            },
          },
        },
        messages: true,
      },
    })

    console.log('✅ Group created:', group.id, group.name, '| visibility:', groupVisibility, '| invite:', inviteCode, '| icon saved:', !!group.icon)

    return Response.json({ success: true, group })
  } catch (error) {
    console.error('❌ Create group error:', error)
    return Response.json({ error: 'Failed to create group', details: String(error) }, { status: 500 })
  }
}