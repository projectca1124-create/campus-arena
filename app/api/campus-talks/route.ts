// app/api/campus-talks/route.ts
import { PrismaClient } from '@prisma/client'
import { createNotification } from '@/lib/notifications'

const prisma = new PrismaClient()

// GET - list campus talks
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const tab = searchParams.get('tab') || 'all'

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { university: true },
    })

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    const where: any = {
      university: user.university,
      user: { onboardingComplete: true },  // ✅ hide talks from ghost/incomplete accounts
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (category) where.category = category
    if (tab === 'my') where.userId = userId

    const talks = await prisma.campusTalk.findMany({
      where,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, profileImage: true },
        },
        responses: {
          select: { id: true, userId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    let filteredTalks = talks
    if (tab === 'all') {
      filteredTalks = talks.filter(t => t.responses.length > 0)
    } else if (tab === 'unanswered') {
      filteredTalks = talks.filter(t => t.responses.length === 0)
    } else if (tab === 'answered') {
      filteredTalks = talks.filter(t => t.responses.some((r: any) => r.userId === userId))
    }

    const result = filteredTalks.map(t => ({
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

    const allTalks = await prisma.campusTalk.findMany({
      where: { university: user.university },
      select: { category: true },
    })
    const categories = [...new Set(allTalks.map(t => t.category).filter(Boolean))]

    const unansweredCount = await prisma.campusTalk.count({
      where: {
        university: user.university,
        responses: { none: {} },
      },
    })

    return Response.json({ success: true, talks: result, categories, unansweredCount })
  } catch (error) {
    console.error('❌ Campus Talks GET error:', error)
    return Response.json({ error: 'Failed to fetch campus talks', details: String(error) }, { status: 500 })
  }
}

// POST - create a new question + notify all university members
export async function POST(request: Request) {
  try {
    const { title, content, category, userId } = await request.json()

    if (!title || !userId) {
      return Response.json({ error: 'title and userId are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { university: true, firstName: true, lastName: true, onboardingComplete: true },
    })

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    // ✅ Block ghost accounts (signed up but never completed onboarding)
    if (!user.onboardingComplete) {
      return Response.json({ error: 'Complete your profile before posting' }, { status: 403 })
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
          select: { id: true, firstName: true, lastName: true, profileImage: true },
        },
      },
    })

    // ── Notify all other students at the same university ──
    // Fire-and-forget so it doesn't block the response
    const posterName = `${user.firstName} ${user.lastName}`
    const shortTitle = title.trim().substring(0, 60) + (title.trim().length > 60 ? '…' : '')
    const notifLink = `/home/campus-talks?thread=${talk.id}`

    prisma.user.findMany({
      where: {
        university: user.university,
        id: { not: userId },           // don't notify the poster
        onboardingComplete: true,
      },
      select: { id: true },
    }).then(members => {
      return Promise.all(
        members.map(m =>
          createNotification({
            userId: m.id,
            type: 'campus_talk',
            title: `🎓 New question by ${posterName}`,
            body: shortTitle,
            link: notifLink,
          })
        )
      )
    }).catch(err => console.error('campus_talk notify error:', err))

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
    return Response.json({ error: 'Failed to create question', details: String(error) }, { status: 500 })
  }
}