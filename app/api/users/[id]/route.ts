// app/api/users/[id]/route.ts

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
      },
    })

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    return Response.json({ success: true, user })
  } catch (error) {
    console.error('❌ Fetch user error:', error)
    return Response.json(
      { error: 'Failed to fetch user', details: String(error) },
      { status: 500 }
    )
  }
}