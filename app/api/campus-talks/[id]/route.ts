// IMPORTANT: Add these DELETE and PUT handlers to your existing app/api/campus-talks/[id]/route.ts
// If the file only has GET, add these exports alongside it.

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// DELETE - delete a question (owner only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId } = await request.json()

    if (!id || !userId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const talk = await prisma.campusTalk.findUnique({ where: { id } })
    if (!talk) return Response.json({ error: 'Not found' }, { status: 404 })
    if (talk.userId !== userId) return Response.json({ error: 'Unauthorized' }, { status: 403 })

    // Delete all responses first, then the talk
    await prisma.campusTalkResponse.deleteMany({ where: { campusTalkId: id } })
    await prisma.campusTalk.delete({ where: { id } })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Delete talk error:', error)
    return Response.json({ error: 'Failed to delete' }, { status: 500 })
  }
}

// PUT - edit a question (owner only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId, title, content, category } = await request.json()

    if (!id || !userId || !title?.trim()) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const talk = await prisma.campusTalk.findUnique({ where: { id } })
    if (!talk) return Response.json({ error: 'Not found' }, { status: 404 })
    if (talk.userId !== userId) return Response.json({ error: 'Unauthorized' }, { status: 403 })

    const updated = await prisma.campusTalk.update({
      where: { id },
      data: {
        title: title.trim(),
        content: content?.trim() || null,
        category: category || talk.category,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
        _count: { select: { responses: true } },
      },
    })

    return Response.json({
      talk: {
        ...updated,
        responseCount: updated._count.responses,
      },
    })
  } catch (error) {
    console.error('Edit talk error:', error)
    return Response.json({ error: 'Failed to update' }, { status: 500 })
  }
}