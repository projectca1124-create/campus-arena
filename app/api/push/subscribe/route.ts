// app/api/push/subscribe/route.ts
// Saves a user's push subscription to the DB so we can notify them from the server

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST — save or update a push subscription for a user
export async function POST(request: Request) {
  try {
    const { userId, subscription } = await request.json()

    if (!userId || !subscription?.endpoint) {
      return Response.json({ error: 'userId and subscription required' }, { status: 400 })
    }

    // Upsert — if this device already has a subscription, update it
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId,
        p256dh: subscription.keys?.p256dh || '',
        auth: subscription.keys?.auth || '',
        updatedAt: new Date(),
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh || '',
        auth: subscription.keys?.auth || '',
      },
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('[Push subscribe] Error:', error)
    return Response.json({ error: 'Failed to save subscription' }, { status: 500 })
  }
}

// DELETE — remove subscription when user explicitly disables notifications
export async function DELETE(request: Request) {
  try {
    const { endpoint } = await request.json()
    if (!endpoint) return Response.json({ error: 'endpoint required' }, { status: 400 })

    await prisma.pushSubscription.deleteMany({ where: { endpoint } })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}