// lib/notifications.ts
// Central hub: DB notification + Ably real-time ping + Web Push (OS-level, works when browser closed)

import { PrismaClient } from '@prisma/client'
import { publishEvent } from '@/lib/ably-server'
import { sendPushToUser } from '@/lib/web-push'

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
    // 1. Persist to DB (shows in bell icon)
    const notification = await prisma.notification.create({
      data: { userId, type, title, body, link: link || null, read: false },
    })

    // 2. Real-time Ably push (instant if browser tab is open)
    await publishEvent(`user-${userId}`, 'new-notification', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      read: false,
      createdAt: notification.createdAt.toISOString(),
    })

    // 3. Web Push — OS-level notification (works when browser closed/backgrounded)
    sendPushToUser(userId, {
      title,
      body,
      url: link || '/home',
      tag: type,
    }).catch(() => {})

    return notification
  } catch (err) {
    console.error('createNotification error:', err)
  }
}

export async function notifyDM(
  receiverId: string,
  senderName: string,
  preview: string,
  senderId: string,
) {
  await createNotification({
    userId: receiverId,
    type: 'dm',
    title: `\u{1F4AC} ${senderName}`,
    body: preview,
    link: `/home?openDM=${senderId}&dmName=${encodeURIComponent(senderName)}&tab=dms`,
  })
}

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
        title: `\u{1F465} ${groupName}`,
        body: `${senderName}: ${preview}`,
        link: `/home?groupId=${groupId}`,
      })
    )
  )
}

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
      title: `\u{1F393} New Response`,
      body: `${responderName} responded to: "${talk.title.substring(0, 55)}${talk.title.length > 55 ? '\u2026' : ''}"`,
      link: `/home/campus-talks?thread=${talkId}`,
    })
  } catch (err) {
    console.error('notifyTalkResponse error:', err)
  }
}