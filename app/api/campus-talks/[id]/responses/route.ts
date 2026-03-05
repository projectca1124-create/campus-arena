// app/api/campus-talks/[id]/responses/route.ts
import { PrismaClient } from '@prisma/client'
import { notifyTalkResponse } from '@/lib/notifications'

const prisma = new PrismaClient()

// GET - list responses for a campus talk
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const responses = await prisma.campusTalkResponse.findMany({
      where: { campusTalkId: id },
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true,
            profileImage: true, major: true, year: true,
            academicStanding: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const talk = await prisma.campusTalk.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, profileImage: true },
        },
      },
    })

    return Response.json({ success: true, talk, responses })
  } catch (error) {
    console.error('Responses GET error:', error)
    return Response.json({ error: 'Failed to fetch responses' }, { status: 500 })
  }
}

// POST - add a response + notify question author instantly
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { content, userId } = await request.json()

    if (!content || !userId) {
      return Response.json({ error: 'content and userId are required' }, { status: 400 })
    }

    // Don't let someone respond to their own question and notify themselves
    const talk = await prisma.campusTalk.findUnique({
      where: { id },
      select: { userId: true, title: true },
    })
    if (!talk) return Response.json({ error: 'Talk not found' }, { status: 404 })

    const response = await prisma.campusTalkResponse.create({
      data: { content: content.trim(), campusTalkId: id, userId },
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true,
            profileImage: true, major: true, year: true,
            academicStanding: true,
          },
        },
      },
    })

    // Notify the question author — real-time via Ably + persisted in DB bell
    // Only notify if the responder is NOT the author
    if (talk.userId !== userId) {
      const responderName = `${response.user.firstName} ${response.user.lastName}`
      const preview = content.trim().substring(0, 80) + (content.trim().length > 80 ? '…' : '')
      notifyTalkResponse(id, userId, responderName).catch(err =>
        console.error('notifyTalkResponse error:', err)
      )
    }

    return Response.json({ success: true, response })
  } catch (error) {
    console.error('Response POST error:', error)
    return Response.json({ error: 'Failed to post response' }, { status: 500 })
  }
}

// DELETE - remove a response (author only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: talkId } = await params
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const responseId = pathParts[pathParts.length - 1]
    const { userId } = await request.json()

    const response = await prisma.campusTalkResponse.findUnique({ where: { id: responseId } })
    if (!response) return Response.json({ error: 'Not found' }, { status: 404 })
    if (response.userId !== userId) return Response.json({ error: 'Unauthorized' }, { status: 403 })

    await prisma.campusTalkResponse.delete({ where: { id: responseId } })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: 'Failed to delete response' }, { status: 500 })
  }
}

// PUT - edit a response (author only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: talkId } = await params
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const responseId = pathParts[pathParts.length - 1]
    const { userId, content } = await request.json()

    const response = await prisma.campusTalkResponse.findUnique({ where: { id: responseId } })
    if (!response) return Response.json({ error: 'Not found' }, { status: 404 })
    if (response.userId !== userId) return Response.json({ error: 'Unauthorized' }, { status: 403 })

    const updated = await prisma.campusTalkResponse.update({
      where: { id: responseId },
      data: { content: content.trim() },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, profileImage: true, major: true, year: true },
        },
      },
    })

    return Response.json({ success: true, response: updated })
  } catch (error) {
    return Response.json({ error: 'Failed to update response' }, { status: 500 })
  }
}