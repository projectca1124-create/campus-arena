// app/api/classmates/route.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const search = searchParams.get('search') || ''
    const majorFilter = searchParams.get('major') || ''
    const yearFilter = searchParams.get('year') || ''

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 })
    }

    // Get current user's university
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { university: true },
    })

    if (!currentUser) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    // Build filter
    const where: any = {
      id: { not: userId },
      university: currentUser.university,
      onboardingComplete: true,        // ✅ exclude ghost accounts
      firstName: { not: null },        // ✅ exclude NULL names
      lastName: { not: null },         // ✅ exclude NULL names
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { major: { contains: search, mode: 'insensitive' } },
        { funFact: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (majorFilter) {
      where.major = { contains: majorFilter, mode: 'insensitive' }
    }

    if (yearFilter) {
      where.year = yearFilter
    }

    const students = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        major: true,
        semester: true,
        year: true,
        funFact: true,
        profileImage: true,
        university: true,
      },
      orderBy: { firstName: 'asc' },
    })

    // Get distinct majors and years for filter dropdowns — same onboarding filter applied
    const allStudents = await prisma.user.findMany({
      where: {
        university: currentUser.university,
        id: { not: userId },
        onboardingComplete: true,      // ✅ filter dropdowns also exclude ghost accounts
        firstName: { not: null },
        lastName: { not: null },
      },
      select: { major: true, year: true },
    })

    const majors = [...new Set(allStudents.map(s => s.major).filter(Boolean))] as string[]
    const years = [...new Set(allStudents.map(s => s.year).filter(Boolean))].sort() as string[]

    return Response.json({
      success: true,
      students,
      filters: { majors, years },
    })
  } catch (error) {
    console.error('❌ Classmates error:', error)
    return Response.json(
      { error: 'Failed to fetch classmates', details: String(error) },
      { status: 500 }
    )
  }
}