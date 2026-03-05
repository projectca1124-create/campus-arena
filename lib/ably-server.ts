// lib/ably-server.ts — Ably Server (replaces pusher-server.ts)
import Ably from 'ably'

let ablyServer: Ably.Rest | null = null

function getAblyServer(): Ably.Rest {
  if (!ablyServer) {
    ablyServer = new Ably.Rest({
      key: process.env.ABLY_API_KEY!,
    })
  }
  return ablyServer
}

export async function publishEvent(channel: string, event: string, data: any): Promise<void> {
  try {
    const ably = getAblyServer()
    await ably.channels.get(channel).publish(event, data)
  } catch (err) {
    console.error(`Ably publish error on ${channel}/${event}:`, err)
  }
}

export default getAblyServer