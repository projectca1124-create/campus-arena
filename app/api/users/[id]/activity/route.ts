// Save as: app/api/users/[id]/activity/route.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) return Response.json({ error: 'User ID required' }, { status: 400 })

    // Fetch questions asked by user
    const questions = await prisma.campusTalk.findMany({
      where: { userId: id },
      select: {
        id: true,
        title: true,
        category: true,
        createdAt: true,
        _count: { select: { responses: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Fetch responses given by user
    const responses = await prisma.campusTalkResponse.findMany({
      where: { userId: id },
      select: {
        id: true,
        content: true,
        createdAt: true,
        campusTalk: {
          select: { id: true, title: true, category: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return Response.json({
      questions: questions.map(q => ({
        id: q.id,
        title: q.title,
        category: q.category,
        createdAt: q.createdAt,
        responseCount: q._count.responses,
      })),
      responses: responses.map(r => ({
        id: r.id,
        content: r.content,
        createdAt: r.createdAt,
        questionId: r.campusTalk.id,
        questionTitle: r.campusTalk.title,
        category: r.campusTalk.category,
      })),
    })
  } catch (error) {
    console.error('User activity error:', error)
    return Response.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}