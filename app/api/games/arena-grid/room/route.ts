// app/api/games/arena-grid/room/route.ts
import { PrismaClient } from '@prisma/client'
import { publishEvent } from '@/lib/ably-server'

const prisma = new PrismaClient()

const PLAYER_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#e11d48']
const ROOM_TTL_MS = 5 * 60 * 1000 // 5 minutes

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function POST(request: Request) {
  try {
    const { action, userId, code, gridSize } = await request.json()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, profileImage: true, major: true },
    })
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

    // ── CREATE ────────────────────────────────────────────────────
    if (action === 'create') {
      const roomCode = generateCode()
      const expiresAt = new Date(Date.now() + ROOM_TTL_MS)

      const room = await (prisma as any).gameRoom.create({
        data: {
          code: roomCode,
          game: 'arena-grid',
          gridSize: gridSize || 9,
          hostId: userId,
          status: 'waiting',
          expiresAt,          // ← store expiry in DB
          players: [
            {
              userId,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImage: user.profileImage,
              major: user.major,
              color: PLAYER_COLORS[0],
              ready: true,
            },
          ],
        },
      })
      return Response.json({ success: true, room })
    }

    // ── JOIN ──────────────────────────────────────────────────────
    if (action === 'join') {
      if (!code) return Response.json({ error: 'Room code required' }, { status: 400 })

      const room = await (prisma as any).gameRoom.findUnique({ where: { code } })
      if (!room) return Response.json({ error: 'Room not found. Check your code and try again.' }, { status: 404 })

      // ── Expiry check ──────────────────────────────────────────
      if (room.expiresAt && new Date(room.expiresAt) < new Date()) {
        return Response.json({ error: 'Room has expired. Ask your friend to create a new one.', expired: true }, { status: 410 })
      }

      if (room.status === 'playing') return Response.json({ error: 'Game already started.' }, { status: 400 })
      if (room.status === 'finished') return Response.json({ error: 'This game has already finished.', expired: true }, { status: 410 })

      const players = room.players as any[]
      if (players.length >= 4) return Response.json({ error: 'Room is full.' }, { status: 400 })
      if (players.find((p: any) => p.userId === userId)) {
        return Response.json({ success: true, room }) // already in room
      }

      const newPlayer = {
        userId,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage,
        major: user.major,
        color: PLAYER_COLORS[players.length],
        ready: true,
      }
      const updatedPlayers = [...players, newPlayer]
      const updatedRoom = await (prisma as any).gameRoom.update({
        where: { code },
        data: { players: updatedPlayers },
      })

      await publishEvent(`game-room-${code}`, 'player-joined', {
        player: newPlayer,
        players: updatedPlayers,
        roomId: room.id,
      }).catch(() => {})

      return Response.json({ success: true, room: updatedRoom })
    }

    // ── START ─────────────────────────────────────────────────────
    if (action === 'start') {
      if (!code) return Response.json({ error: 'Room code required' }, { status: 400 })
      const room = await (prisma as any).gameRoom.findUnique({ where: { code } })
      if (!room) return Response.json({ error: 'Room not found' }, { status: 404 })
      if (room.hostId !== userId) return Response.json({ error: 'Only host can start' }, { status: 403 })
      if ((room.players as any[]).length < 2) return Response.json({ error: 'Need at least 2 players' }, { status: 400 })

      const updatedRoom = await (prisma as any).gameRoom.update({
        where: { code },
        data: { status: 'playing' },
      })

      await publishEvent(`game-room-${code}`, 'game-started', {
        room: updatedRoom,
        gridSize: room.gridSize,
        players: room.players,
      }).catch(() => {})

      return Response.json({ success: true, room: updatedRoom })
    }

    // ── GET ───────────────────────────────────────────────────────
    if (action === 'get') {
      const room = await (prisma as any).gameRoom.findUnique({ where: { code } })
      if (!room) return Response.json({ error: 'Room not found' }, { status: 404 })
      return Response.json({ success: true, room })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Room error:', error)
    return Response.json({ error: 'Failed', details: String(error) }, { status: 500 })
  }
}

// PATCH — submit a move / sync game state
export async function PATCH(request: Request) {
  try {
    const { code, userId, move, gameState, chat, reaction } = await request.json()
    if (!code || !userId) return Response.json({ error: 'Missing fields' }, { status: 400 })

    const room = await (prisma as any).gameRoom.findUnique({ where: { code } })
    if (!room) return Response.json({ error: 'Room not found' }, { status: 404 })

    const updateData: any = {}
    if (gameState !== undefined) updateData.gameState = gameState
    if (chat) {
      const existing = room.chat || []
      updateData.chat = [...existing, chat].slice(-50)
    }
    if (reaction) updateData.lastReaction = reaction

    if (Object.keys(updateData).length > 0) {
      await (prisma as any).gameRoom.update({ where: { code }, data: updateData })
    }

    if (move) {
      await publishEvent(`game-room-${code}`, 'move-made', { userId, move, gameState }).catch(() => {})
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Move error:', error)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}