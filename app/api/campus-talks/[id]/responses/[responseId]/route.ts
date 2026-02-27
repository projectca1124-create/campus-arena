// Create this file at: app/api/campus-talks/[id]/responses/[responseId]/route.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// DELETE - delete a response (owner only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; responseId: string }> }
) {
  try {
    const { id, responseId } = await params
    const { userId } = await request.json()

    if (!responseId || !userId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const response = await prisma.campusTalkResponse.findUnique({ where: { id: responseId } })
    if (!response) return Response.json({ error: 'Not found' }, { status: 404 })
    if (response.userId !== userId) return Response.json({ error: 'Unauthorized' }, { status: 403 })

    await prisma.campusTalkResponse.delete({ where: { id: responseId } })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Delete response error:', error)
    return Response.json({ error: 'Failed to delete' }, { status: 500 })
  }
}

// PUT - edit a response (owner only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; responseId: string }> }
) {
  try {
    const { id, responseId } = await params
    const { userId, content } = await request.json()

    if (!responseId || !userId || !content?.trim()) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const response = await prisma.campusTalkResponse.findUnique({ where: { id: responseId } })
    if (!response) return Response.json({ error: 'Not found' }, { status: 404 })
    if (response.userId !== userId) return Response.json({ error: 'Unauthorized' }, { status: 403 })

    const updated = await prisma.campusTalkResponse.update({
      where: { id: responseId },
      data: { content: content.trim() },
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true,
            profileImage: true, major: true, year: true, academicStanding: true,
          },
        },
      },
    })

    return Response.json({ response: updated })
  } catch (error) {
    console.error('Edit response error:', error)
    return Response.json({ error: 'Failed to update' }, { status: 500 })
  }
}