// lib/notifications.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function createNotification({
  userId,
  type,
  title,
  body,
  link,
}: {
  userId: string
  type: string
  title: string
  body: string
  link?: string
}) {
  try {
    await prisma.notification.create({
      data: { userId, type, title, body, link },
    })
  } catch (error) {
    console.error('Failed to create notification:', error)
  }
}

// Notify all group members (except sender) about a new message
export async function notifyGroupMessage(groupId: string, senderId: string, senderName: string, groupName: string) {
  try {
    const members = await prisma.groupMember.findMany({
      where: { groupId, userId: { not: senderId } },
      select: { userId: true },
    })
    const promises = members.map((m) =>
      createNotification({
        userId: m.userId,
        type: 'group_message',
        title: groupName,
        body: `${senderName} sent a message in ${groupName}`,
        link: `/home?group=${groupId}`,
      })
    )
    await Promise.all(promises)
  } catch (error) {
    console.error('Failed to notify group message:', error)
  }
}

// Notify DM receiver
export async function notifyDM(receiverId: string, senderName: string) {
  try {
    await createNotification({
      userId: receiverId,
      type: 'dm_received',
      title: 'New Direct Message',
      body: `${senderName} sent you a message`,
      link: '/home?tab=dms',
    })
  } catch (error) {
    console.error('Failed to notify DM:', error)
  }
}

// Notify question author when someone responds
export async function notifyTalkResponse(campusTalkId: string, responderId: string, responderName: string) {
  try {
    const talk = await prisma.campusTalk.findUnique({
      where: { id: campusTalkId },
      select: { userId: true, title: true },
    })
    if (!talk || talk.userId === responderId) return
    await createNotification({
      userId: talk.userId,
      type: 'talk_response',
      title: 'New Response',
      body: `${responderName} replied to your question "${talk.title.substring(0, 40)}${talk.title.length > 40 ? '...' : ''}"`,
      link: `/home/campus-talks?talk=${campusTalkId}`,
    })
  } catch (error) {
    console.error('Failed to notify talk response:', error)
  }
}