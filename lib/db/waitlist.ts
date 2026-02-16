import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

export async function saveWaitlistUser({
  name,
  email,
}: {
  name: string
  email: string
}) {
  try {
    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    const existing = await prisma.waitlist.findUnique({
      where: { email: trimmedEmail }
    })

    if (existing) {
      console.log('⚠️ Email already exists:', trimmedEmail)
      throw new Error('This email is already on the waitlist')
    }

    const user = await prisma.waitlist.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
      }
    })

    console.log('✅ User saved to database:', {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    })

    return user
  } catch (error) {
    console.error('❌ Database error:', error)
    throw error
  }
}

export async function getWaitlistStats() {
  try {
    const total = await prisma.waitlist.count()
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayCount = await prisma.waitlist.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    })

    const stats = {
      total,
      today: todayCount,
      timestamp: new Date()
    }

    console.log('📊 Waitlist stats:', stats)

    return stats
  } catch (error) {
    console.error('❌ Stats error:', error)
    throw error
  }
}

export async function getAllWaitlistUsers() {
  try {
    const users = await prisma.waitlist.findMany({
      orderBy: { createdAt: 'desc' }
    })

    console.log(`✅ Retrieved ${users.length} users from waitlist`)

    return users
  } catch (error) {
    console.error('❌ Error fetching users:', error)
    throw error
  }
}