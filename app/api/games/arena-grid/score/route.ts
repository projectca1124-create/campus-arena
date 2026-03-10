// app/api/games/arena-grid/score/route.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { userId, score, won, gridSize, mode, opponentCount } = await request.json()

    if (!userId || score === undefined || won === undefined || !gridSize || !mode) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, onboardingComplete: true },
    })
    if (!user || !user.onboardingComplete) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const gameScore = await (prisma as any).gameScore.create({
      data: {
        userId,
        game: 'arena-grid',
        score,
        won,
        gridSize,
        mode,
        opponentCount: opponentCount || 1,
      },
    })

    return Response.json({ success: true, gameScore })
  } catch (error) {
    console.error('Score save error:', error)
    return Response.json({ error: 'Failed to save score' }, { status: 500 })
  }
}