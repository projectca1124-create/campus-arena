import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { userId, groupId } = await request.json()
    if (!userId) return Response.json({ error: 'userId is required' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

    // Toggle: if already pinned to this group, unpin; otherwise pin
    const newPinnedId = user.pinnedGroupId === groupId ? null : (groupId || null)

    await prisma.user.update({
      where: { id: userId },
      data: { pinnedGroupId: newPinnedId },
    })

    console.log(`📌 User ${userId} ${newPinnedId ? 'pinned' : 'unpinned'} group ${groupId}`)

    return Response.json({ success: true, pinnedGroupId: newPinnedId })
  } catch (error) {
    console.error('❌ Pin group error:', error)
    return Response.json({ error: 'Failed to pin group', details: String(error) }, { status: 500 })
  }
}