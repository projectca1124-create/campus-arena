// app/api/groups/[id]/avatar/route.ts
// PATCH — upload/update group avatar image (admin only, non-default groups)

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Allow larger body for compressed group avatar images
export const config = {
  api: { bodyParser: { sizeLimit: '2mb' } },
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params
    const { userId, icon } = await request.json()

    if (!userId || !icon) {
      return Response.json({ error: 'userId and icon are required' }, { status: 400 })
    }

    // Verify caller is an admin of this group
    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    })
    if (!member || member.role !== 'admin') {
      return Response.json({ error: 'Only group admins can update the group photo' }, { status: 403 })
    }

    // Prevent updating default (university/major) groups
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { isDefault: true, name: true },
    })
    if (!group) {
      return Response.json({ error: 'Group not found' }, { status: 404 })
    }
    if (group.isDefault) {
      return Response.json({ error: 'Cannot change avatar of default groups' }, { status: 403 })
    }

    const updated = await prisma.group.update({
      where: { id: groupId },
      data: { icon },
      select: { id: true, name: true, icon: true },
    })

    return Response.json({ success: true, group: updated })
  } catch (error) {
    console.error('❌ Group avatar PATCH error:', error)
    return Response.json(
      { error: 'Failed to update group avatar', details: String(error) },
      { status: 500 }
    )
  }
}