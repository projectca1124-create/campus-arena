// app/api/campus-talks/[id]/responses/route.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - list responses for a campus talk
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const responses = await prisma.campusTalkResponse.findMany({
      where: { campusTalkId: id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            major: true,
            year: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Also get the original question
    const talk = await prisma.campusTalk.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    })

    return Response.json({
      success: true,
      talk,
      responses,
    })
  } catch (error) {
    console.error('❌ Responses GET error:', error)
    return Response.json(
      { error: 'Failed to fetch responses', details: String(error) },
      { status: 500 }
    )
  }
}

// POST - add a response
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { content, userId } = await request.json()

    if (!content || !userId) {
      return Response.json(
        { error: 'content and userId are required' },
        { status: 400 }
      )
    }

    const response = await prisma.campusTalkResponse.create({
      data: {
        content: content.trim(),
        campusTalkId: id,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            major: true,
            year: true,
          },
        },
      },
    })

    return Response.json({ success: true, response })
  } catch (error) {
    console.error('❌ Response POST error:', error)
    return Response.json(
      { error: 'Failed to post response', details: String(error) },
      { status: 500 }
    )
  }
}