// app/api/auth/me/route.ts — Returns current authenticated user
// Client calls this on page load to verify session

import { PrismaClient } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const auth = await getAuthUser()

    if (!auth) {
      return Response.json({ user: null }, { status: 401 })
    }

    // Fetch fresh user data from DB
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        university: true,
        major: true,
        degree: true,
        semester: true,
        year: true,
        funFact: true,
        profileImage: true,
        hometown: true,
        bio: true,
        minor: true,
        academicStanding: true,
        interests: true,
        pinnedGroupId: true,
        onboardingComplete: true,
      },
    })

    if (!user) {
      return Response.json({ user: null }, { status: 401 })
    }

    return Response.json({ user })
  } catch (error) {
    console.error('Auth check error:', error)
    return Response.json({ user: null }, { status: 500 })
  }
}