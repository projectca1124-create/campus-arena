// app/api/campus-talks/[id]/route.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET — fetch a single campus talk by ID (used by notification click routing)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const talk = await prisma.campusTalk.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, profileImage: true },
        },
        responses: {
          select: { id: true },
        },
      },
    })
    if (!talk) return Response.json({ error: 'Not found' }, { status: 404 })

    return Response.json({
      talk: {
        ...talk,
        responseCount: talk.responses.length,
      },
    })
  } catch (error) {
    console.error('GET campus-talk by id error:', error)
    return Response.json({ error: 'Failed to fetch talk' }, { status: 500 })
  }
}

// DELETE — author deletes their question
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId } = await request.json()
    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 })

    const talk = await prisma.campusTalk.findUnique({ where: { id } })
    if (!talk) return Response.json({ error: 'Not found' }, { status: 404 })
    if (talk.userId !== userId) return Response.json({ error: 'Unauthorized' }, { status: 403 })

    await prisma.campusTalk.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: 'Failed to delete', details: String(error) }, { status: 500 })
  }
}

// PUT — author edits their question
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId, title, content, category } = await request.json()
    if (!userId || !title) return Response.json({ error: 'userId and title required' }, { status: 400 })

    const talk = await prisma.campusTalk.findUnique({ where: { id } })
    if (!talk) return Response.json({ error: 'Not found' }, { status: 404 })
    if (talk.userId !== userId) return Response.json({ error: 'Unauthorized' }, { status: 403 })

    const updated = await prisma.campusTalk.update({
      where: { id },
      data: { title, content, category },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
      },
    })
    return Response.json({ talk: updated })
  } catch (error) {
    return Response.json({ error: 'Failed to update', details: String(error) }, { status: 500 })
  }
}