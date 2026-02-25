// app/api/notifications/route.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - fetch notifications for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 })
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false },
    })

    return Response.json({ success: true, notifications, unreadCount })
  } catch (error) {
    console.error('❌ Notifications GET error:', error)
    return Response.json(
      { error: 'Failed to fetch notifications', details: String(error) },
      { status: 500 }
    )
  }
}

// PUT - mark notifications as read
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { userId, notificationId } = body

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 })
    }

    if (notificationId) {
      // Mark single notification as read
      await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      })
    } else {
      // Mark all as read
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('❌ Notifications PUT error:', error)
    return Response.json(
      { error: 'Failed to update notifications', details: String(error) },
      { status: 500 }
    )
  }
}