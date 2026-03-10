// app/api/games/arena-grid/leaderboard/route.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 })

    // Get current user's university for campus-scoped leaderboard
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { university: true },
    })
    if (!currentUser) return Response.json({ error: 'User not found' }, { status: 404 })

    // This week's start (Monday 00:00)
    const now = new Date()
    const dayOfWeek = now.getDay() // 0=Sun
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - daysToMonday)
    weekStart.setHours(0, 0, 0, 0)

    // Get all scores this week for users at same university
    const weeklyScores = await (prisma as any).gameScore.groupBy({
      by: ['userId'],
      where: {
        game: 'arena-grid',
        createdAt: { gte: weekStart },
        user: {
          university: currentUser.university,
          onboardingComplete: true,
        },
      },
      _sum: { score: true },
      _count: { id: true },
      orderBy: { _sum: { score: 'desc' } },
      take: 20,
    })

    // Fetch user details for each entry
    const userIds = weeklyScores.map((s: any) => s.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileImage: true,
        major: true,
        academicStanding: true,
      },
    })
    const userMap = Object.fromEntries(users.map(u => [u.id, u]))

    const leaderboard = weeklyScores
      .map((entry: any) => {
        const u = userMap[entry.userId]
        if (!u) return null
        return {
          userId: entry.userId,
          firstName: u.firstName,
          lastName: u.lastName,
          profileImage: u.profileImage,
          major: u.major,
          academicStanding: u.academicStanding,
          weeklyScore: entry._sum.score || 0,
          gamesPlayed: entry._count.id,
        }
      })
      .filter(Boolean)

    // Also get current user's all-time stats
    const myStats = await (prisma as any).gameScore.aggregate({
      where: { userId, game: 'arena-grid' },
      _sum: { score: true },
      _count: { id: true },
    })
    const myWins = await (prisma as any).gameScore.count({
      where: { userId, game: 'arena-grid', won: true },
    })

    return Response.json({
      leaderboard,
      myStats: {
        totalScore: myStats._sum.score || 0,
        gamesPlayed: myStats._count.id,
        wins: myWins,
      },
      weekStart: weekStart.toISOString(),
    })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return Response.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}