// Save as: app/api/users/[id]/route.ts (replace existing)
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return Response.json({ error: 'User ID is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        university: true,
        major: true,
        degree: true,
        semester: true,
        year: true,
        profileImage: true,
        hometown: true,
        bio: true,
        minor: true,
        academicStanding: true,
        interests: true,
        funFact: true,
        _count: {
          select: {
            campusTalks: true,
            campusTalkResponses: true,
          },
        },
      },
    })

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    const { _count, ...userData } = user

    return Response.json({
      success: true,
      user: userData,
      stats: {
        questionsAsked: _count.campusTalks,
        answersGiven: _count.campusTalkResponses,
      },
    })
  } catch (error) {
    console.error('Fetch user error:', error)
    return Response.json(
      { error: 'Failed to fetch user', details: String(error) },
      { status: 500 }
    )
  }
}