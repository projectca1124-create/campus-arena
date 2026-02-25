// app/api/profile/route.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - fetch user profile with activity stats
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        university: true,
        major: true,
        semester: true,
        year: true,
        funFact: true,
        profileImage: true,
        hometown: true,
        bio: true,
        minor: true,
      },
    })

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    // Get activity stats
    const questionsAsked = await prisma.campusTalk.count({
      where: { userId },
    })

    const answersGiven = await prisma.campusTalkResponse.count({
      where: { userId },
    })

    return Response.json({
      success: true,
      user,
      stats: {
        questionsAsked,
        answersGiven,
      },
    })
  } catch (error) {
    console.error('❌ Profile GET error:', error)
    return Response.json(
      { error: 'Failed to fetch profile', details: String(error) },
      { status: 500 }
    )
  }
}

// PUT - update user profile
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { userId, firstName, lastName, major, semester, year, funFact, profileImage, bio, hometown, minor, interests } = body

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 })
    }

    let updatedFunFact = funFact
    if (interests && Array.isArray(interests)) {
      updatedFunFact = interests.join(', ')
    }

    const updateData: any = {}
    if (firstName !== undefined) updateData.firstName = firstName.trim()
    if (lastName !== undefined) updateData.lastName = lastName.trim()
    if (major !== undefined) updateData.major = major.trim()
    if (semester !== undefined) updateData.semester = semester
    if (year !== undefined) updateData.year = year.trim()
    if (updatedFunFact !== undefined) updateData.funFact = updatedFunFact
    if (profileImage !== undefined) updateData.profileImage = profileImage
    if (bio !== undefined) updateData.bio = bio.trim()
    if (hometown !== undefined) updateData.hometown = hometown.trim()
    if (minor !== undefined) updateData.minor = minor.trim()

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        university: true,
        major: true,
        semester: true,
        year: true,
        funFact: true,
        profileImage: true,
        hometown: true,
        bio: true,
        minor: true,
      },
    })

    return Response.json({ success: true, user })
  } catch (error) {
    console.error('❌ Profile PUT error:', error)
    return Response.json(
      { error: 'Failed to update profile', details: String(error) },
      { status: 500 }
    )
  }
}