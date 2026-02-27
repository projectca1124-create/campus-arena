// app/api/campus-talks/route.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - list campus talks
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const tab = searchParams.get('tab') || 'all' // 'all' | 'unanswered' | 'my'

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 })
    }

    // Get user's university
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { university: true },
    })

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    // Build where clause
    const where: any = {
      university: user.university,
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (category) {
      where.category = category
    }

    if (tab === 'my') {
      where.userId = userId
    }

    const talks = await prisma.campusTalk.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
       responses: {
          select: { id: true, userId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Filter based on tab
   // Filter based on tab
    let filteredTalks = talks
    if (tab === 'all') {
      filteredTalks = talks.filter((t) => t.responses.length > 0)
    } else if (tab === 'unanswered') {
      filteredTalks = talks.filter((t) => t.responses.length === 0)
    } else if (tab === 'answered') {
      // Show only discussions where this user has given a response
      filteredTalks = talks.filter((t) => t.responses.some((r: any) => r.userId === userId))
    }
    // 'my' tab shows all of user's questions regardless of responses

    // Map to add response count
    const result = filteredTalks.map((t) => ({
      id: t.id,
      title: t.title,
      content: t.content,
      category: t.category,
      userId: t.userId,
      university: t.university,
      createdAt: t.createdAt.toISOString(),
      user: t.user,
      responseCount: t.responses.length,
    }))

    // Get available categories
    const allTalks = await prisma.campusTalk.findMany({
      where: { university: user.university },
      select: { category: true },
    })
    const categories = [...new Set(allTalks.map((t) => t.category).filter(Boolean))]

    return Response.json({
      success: true,
      talks: result,
      categories,
    })
  } catch (error) {
    console.error('❌ Campus Talks GET error:', error)
    return Response.json(
      { error: 'Failed to fetch campus talks', details: String(error) },
      { status: 500 }
    )
  }
}

// POST - create a new question
export async function POST(request: Request) {
  try {
    const { title, content, category, userId } = await request.json()

    if (!title || !userId) {
      return Response.json(
        { error: 'title and userId are required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { university: true },
    })

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    const talk = await prisma.campusTalk.create({
      data: {
        title: title.trim(),
        content: content?.trim() || null,
        category: category || 'General',
        userId,
        university: user.university,
      },
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
      talk: {
        ...talk,
        createdAt: talk.createdAt.toISOString(),
        responseCount: 0,
      },
    })
  } catch (error) {
    console.error('❌ Campus Talks POST error:', error)
    return Response.json(
      { error: 'Failed to create question', details: String(error) },
      { status: 500 }
    )
  }
}
// Add this DELETE handler 
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId } = await request.json()

    if (!id || !userId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify ownership
    const talk = await prisma.campusTalk.findUnique({ where: { id } })
    if (!talk) return Response.json({ error: 'Not found' }, { status: 404 })
    if (talk.userId !== userId) return Response.json({ error: 'Unauthorized' }, { status: 403 })

    // Delete all responses first, then the talk
    await prisma.campusTalkResponse.deleteMany({ where: { campusTalkId: id } })
    await prisma.campusTalk.delete({ where: { id } })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Delete talk error:', error)
    return Response.json({ error: 'Failed to delete' }, { status: 500 })
  }
}