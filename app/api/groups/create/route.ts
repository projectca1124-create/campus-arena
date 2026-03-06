import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex')
}

export async function POST(request: Request) {
  try {
    // ✅ FIX: Added `icon` — was missing so group picture was silently dropped on creation
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
        // ✅ FIX: Save icon if provided during creation
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
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                university: true,
                profileImage: true,
                major: true,
                semester: true,
                year: true,
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