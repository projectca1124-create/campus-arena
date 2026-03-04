// app/api/profile/complete-onboarding/route.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const {
      userId, firstName, lastName, degree, customDegree, major, minor,
      year, semester, academicStanding, bio, interests,
    } = await request.json()

    // Validation
    if (!userId || !firstName || !lastName || !degree || !major || !year || !semester) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!interests || interests.length < 2) {
      return Response.json({ error: 'Please select at least 2 interests' }, { status: 400 })
    }

    const finalDegree = degree === 'Other' && customDegree ? customDegree : degree

    // Update user profile
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        degree: finalDegree,
        major,
        minor: minor || null,
        year,
        semester,
        academicStanding: academicStanding || null,
        bio: bio || null,
        interests: interests.join(','),
        funFact: interests.join(', '), // backward compat
        onboardingComplete: true,
      },
    })

    console.log(`✅ Profile completed for: ${user.email}`)

    // ─── AUTO-CREATE GROUPS ────────────────────────────────────

    const university = user.university || ''
    const uniShort = university.split('.')[0]?.toUpperCase() || 'UNI'

    // 1. University Arena group (e.g., "UTA Arena" or "ASU Arena")
    const uniGroupId = `${uniShort.toLowerCase()}-arena`
    let uniGroup = await prisma.group.findFirst({
      where: { identifier: uniGroupId },
    })

    if (!uniGroup) {
      uniGroup = await prisma.group.create({
        data: {
          name: `${uniShort} Arena`,
          description: `Welcome to the ${uniShort} campus community!`,
          identifier: uniGroupId,
          type: 'university',
          isDefault: true,
          university,
          icon: '🏫',
        },
      })
      console.log(`✨ Created university group: ${uniGroup.name}`)
    }

    // Add user to university group
    await prisma.groupMember.upsert({
      where: { userId_groupId: { userId, groupId: uniGroup.id } },
      update: {},
      create: { userId, groupId: uniGroup.id, role: 'member' },
    })

    // 2. Degree + Major + Semester + Year group
  

   // Smart abbreviation: 1 word = full, 2 words = initials, 3+ words = initials
    // 2. Major group — one group per major per university (no semester/year)
    const majorWords = major.trim().split(/\s+/)
    const majorShort = majorWords.length === 1
      ? majorWords[0]
      : majorWords.map((w: string) => w[0].toUpperCase()).join('')
    const groupName = majorShort
    const groupIdentifier = `major-${majorShort.toLowerCase()}-${university.toLowerCase().replace(/\s+/g, '-')}`

    let majorGroup = await prisma.group.findFirst({
      where: { identifier: groupIdentifier },
    })

    if (!majorGroup) {
      majorGroup = await prisma.group.create({
        data: {
          name: groupName,
          description: `All ${major} students`,
          identifier: groupIdentifier,
          type: 'major',
          isDefault: true,
          university,
          major,
          icon: '🎓',
        },
      })
    }

    // Add user to major group
    await prisma.groupMember.upsert({
      where: { userId_groupId: { userId, groupId: majorGroup.id } },
      update: {},
      create: { userId, groupId: majorGroup.id, role: 'member' },
    })

    console.log(`✅ User added to groups: ${uniGroup.name}, ${majorGroup.name}`)

    return Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        degree: user.degree,
        major: user.major,
        minor: user.minor,
        semester: user.semester,
        year: user.year,
        university: user.university,
        academicStanding: user.academicStanding,
        bio: user.bio,
        interests: user.interests,
        profileImage: user.profileImage,
        onboardingComplete: user.onboardingComplete,
      },
      groups: [
        { id: uniGroup.id, name: uniGroup.name },
        { id: majorGroup.id, name: majorGroup.name },
      ],
    })
  } catch (error) {
    console.error('❌ Onboarding error:', error)
    return Response.json(
      { error: 'Failed to complete onboarding', details: String(error) },
      { status: 500 }
    )
  }
}