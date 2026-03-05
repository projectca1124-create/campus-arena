// lib/notifications.ts
// Central helper: create a DB notification + push it via Ably instantly

import { PrismaClient } from '@prisma/client'
import { publishEvent } from '@/lib/ably-server'

const prisma = new PrismaClient()

interface CreateNotificationParams {
  userId: string
  type: 'dm' | 'message' | 'campus_talk' | 'group'
  title: string
  body: string
  link?: string
}

export async function createNotification(params: CreateNotificationParams) {
  const { userId, type, title, body, link } = params
  try {
    const notification = await prisma.notification.create({
      data: { userId, type, title, body, link: link || null, read: false },
    })
    // Push instantly to the user's personal Ably channel
    await publishEvent(`user-${userId}`, 'new-notification', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      read: false,
      createdAt: notification.createdAt.toISOString(),
    })
    return notification
  } catch (err) {
    console.error('createNotification error:', err)
  }
}

/** DM received */
export async function notifyDM(
  receiverId: string,
  senderName: string,
  preview: string,
  senderId: string,
) {
  await createNotification({
    userId: receiverId,
    type: 'dm',
    title: `💬 ${senderName}`,
    body: preview,
    link: `/home?openDM=${senderId}&dmName=${encodeURIComponent(senderName)}`,
  })
}

/** Group message sent — notifies all other members */
export async function notifyGroupMessage(
  memberIds: string[],
  senderName: string,
  groupName: string,
  groupId: string,
  preview: string,
) {
  await Promise.all(
    memberIds.map(uid =>
      createNotification({
        userId: uid,
        type: 'message',
        title: `👥 ${groupName}`,
        body: `${senderName}: ${preview}`,
        link: `/home?groupId=${groupId}`,
      })
    )
  )
}

/** Someone responded to a campus talk question */
export async function notifyTalkResponse(
  talkId: string,
  responderId: string,
  responderName: string,
) {
  try {
    const talk = await prisma.campusTalk.findUnique({
      where: { id: talkId },
      select: { userId: true, title: true },
    })
    if (!talk || talk.userId === responderId) return

    await createNotification({
      userId: talk.userId,
      type: 'campus_talk',
      title: `🎓 New Response`,
      body: `${responderName} responded: "${talk.title.substring(0, 55)}${talk.title.length > 55 ? '…' : ''}"`,
      link: `/home/campus-talks?thread=${talkId}`,
    })
  } catch (err) {
    console.error('notifyTalkResponse error:', err)
  }
}