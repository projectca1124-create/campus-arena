'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Copy, Check, Clock, RefreshCw, ArrowLeft, Users, Zap } from 'lucide-react'

interface User { id: string; firstName: string; lastName: string; profileImage?: string; university?: string }
interface Player { userId: string; firstName: string; lastName: string; profileImage?: string; color: string; score: number; isBot?: boolean }
type LineKey = string
type Board = Record<string, string | null>

const PLAYER_COLORS = ['#6366f1', '#f59e0b', '#10b981']
const BOT_THINK_MS = 900

function makeLineKey(type: 'h' | 'v', row: number, col: number): LineKey { return `${type}-${row}-${col}` }
function makeBoxKey(row: number, col: number): string { return `b-${row}-${col}` }

function getBoxesCompletedBy(lines: Set<LineKey>, lineKey: LineKey, gridN: number): [number, number][] {
  const [type, r, c] = lineKey.split('-')
  const row = parseInt(r), col = parseInt(c)
  const completed: [number, number][] = []
  const boxComplete = (br: number, bc: number): boolean => {
    if (br < 0 || bc < 0 || br >= gridN || bc >= gridN) return false
    return lines.has(makeLineKey('h', br, bc)) && lines.has(makeLineKey('h', br + 1, bc)) && lines.has(makeLineKey('v', br, bc)) && lines.has(makeLineKey('v', br, bc + 1))
  }
  if (type === 'h') {
    if (boxComplete(row - 1, col)) completed.push([row - 1, col])
    if (boxComplete(row, col)) completed.push([row, col])
  } else {
    if (boxComplete(row, col - 1)) completed.push([row, col - 1])
    if (boxComplete(row, col)) completed.push([row, col])
  }
  return completed
}

function botMove(lines: Set<LineKey>, gridN: number): LineKey | null {
  const allLines: LineKey[] = []
  for (let r = 0; r <= gridN; r++)
    for (let c = 0; c < gridN; c++)
      if (!lines.has(makeLineKey('h', r, c))) allLines.push(makeLineKey('h', r, c))
  for (let r = 0; r < gridN; r++)
    for (let c = 0; c <= gridN; c++)
      if (!lines.has(makeLineKey('v', r, c))) allLines.push(makeLineKey('v', r, c))
  if (allLines.length === 0) return null
  for (const lk of allLines) {
    const t = new Set(lines); t.add(lk)
    if (getBoxesCompletedBy(t, lk, gridN).length > 0) return lk
  }
  const safe = allLines.filter(lk => {
    const t = new Set(lines); t.add(lk)
    let danger = 0
    for (let r = 0; r < gridN; r++)
      for (let c = 0; c < gridN; c++) {
        const sides = [t.has(makeLineKey('h', r, c)), t.has(makeLineKey('h', r + 1, c)), t.has(makeLineKey('v', r, c)), t.has(makeLineKey('v', r, c + 1))].filter(Boolean).length
        if (sides === 3) danger++
      }
    return danger === 0
  })
  const pool = safe.length > 0 ? safe : allLines
  return pool[Math.floor(Math.random() * pool.length)]
}

function Avatar({ src, firstName, lastName, size = 32, color, ring = false }: {
  src?: string | null; firstName?: string; lastName?: string; size?: number; color?: string; ring?: boolean
}) {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`
  const borderStyle = ring ? `2.5px solid ${color || '#6366f1'}` : `1.5px solid ${color ? color + '30' : '#e2e8f0'}`
  if (src) return <img src={src} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: borderStyle, boxShadow: ring ? `0 0 0 3px ${color || '#6366f1'}20` : 'none' }} />
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color ? `${color}15` : '#eef2ff',
      border: borderStyle,
      boxShadow: ring ? `0 0 0 3px ${color || '#6366f1'}20` : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.36, color: color || '#6366f1',
      fontFamily: "'Outfit',sans-serif",
    }}>{initials}</div>
  )
}

export default function ArenaGridPlayPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const gridSize = parseInt(searchParams.get('gridSize') || '9')
  const mode = searchParams.get('mode') as 'bot' | 'friends' || 'bot'
  const gridN = Math.max(3, Math.min(12, gridSize))
  const joinCodeFromUrl = searchParams.get('join')

  const [user, setUser] = useState<User | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [lines, setLines] = useState<Set<LineKey>>(new Set())
  const [board, setBoard] = useState<Board>({})
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0)
  const [gamePhase, setGamePhase] = useState<'lobby' | 'playing' | 'finished'>('lobby')
  const [hoveredLine, setHoveredLine] = useState<LineKey | null>(null)
  const [animatingBoxes, setAnimatingBoxes] = useState<Set<string>>(new Set())
  const [lastBotLine, setLastBotLine] = useState<LineKey | null>(null)

  const [roomCode, setRoomCode] = useState('')
  const [roomInput, setRoomInput] = useState('')
  const [joinError, setJoinError] = useState('')
  const [lobbyPlayers, setLobbyPlayers] = useState<Player[]>([])
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [roomExpiresAt, setRoomExpiresAt] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(300)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scoreSavedRef = useRef(false)
  const botLineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lineOwnersRef = useRef<Map<LineKey, string>>(new Map())

  const ROOM_TTL_MS = 5 * 60 * 1000 // 5 minutes

  const saveRoomToStorage = (code: string, host: boolean, expiresAt: number) => {
    localStorage.setItem('arena_room', JSON.stringify({ code, host, expiresAt, gridSize }))
  }
  const clearRoomFromStorage = () => localStorage.removeItem('arena_room')

  useEffect(() => {
    try {
      const s = localStorage.getItem('user')
      if (!s) { router.push('/auth'); return }
      const u = JSON.parse(s); setUser(u)
      if (mode === 'bot') {
        initBotGame(u)
      } else if (joinCodeFromUrl) {
        // Came from a shared link — auto-fill and join
        setRoomInput(joinCodeFromUrl);
        (async () => {
          try {
            const res = await fetch('/api/games/arena-grid/room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join', userId: u.id, code: joinCodeFromUrl }) })
            const d = await res.json()
            if (d.success) {
              setRoomCode(d.room.code); setIsHost(false)
              setLobbyPlayers((d.room.players as any[]).map((p: any) => ({ ...p, score: 0 })))
              if (d.room.status === 'playing') startGame(d.room); else startPollingRoom(d.room.code)
            } else { setJoinError(d.error || 'Room not found or expired') }
          } catch { setJoinError('Network error. Please try again.') }
        })()
      } else {
        // Try to restore a room that was saved before navigating away
        const saved = localStorage.getItem('arena_room')
        if (saved) {
          try {
            const { code, host, expiresAt, gridSize: savedGrid } = JSON.parse(saved)
            if (expiresAt > Date.now() && savedGrid === gridSize) {
              setRoomCode(code); setIsHost(host)
              setRoomExpiresAt(expiresAt)
              setSecondsLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)))
              startPollingRoom(code)
            } else {
              clearRoomFromStorage()
            }
          } catch { clearRoomFromStorage() }
        }
      }
    } catch { router.push('/auth') }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [router, mode])

  // Countdown ticker whenever expiresAt is set
  useEffect(() => {
    if (!roomExpiresAt) return
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      const s = Math.max(0, Math.floor((roomExpiresAt - Date.now()) / 1000))
      setSecondsLeft(s)
      if (s === 0) {
        clearInterval(countdownRef.current!)
        if (pollRef.current) clearInterval(pollRef.current)
        clearRoomFromStorage()
        setRoomCode('')
        setLobbyPlayers([])
        setJoinError('Room expired. Please create a new room.')
      }
    }, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [roomExpiresAt])

  const initBotGame = (u: User) => {
    setPlayers([
      { userId: u.id, firstName: u.firstName, lastName: u.lastName, profileImage: u.profileImage, color: PLAYER_COLORS[0], score: 0 },
      { userId: 'bot', firstName: 'Bot', lastName: '', color: PLAYER_COLORS[1], score: 0, isBot: true },
    ])
    setLines(new Set()); setBoard({}); setCurrentPlayerIdx(0); setGamePhase('playing'); scoreSavedRef.current = false
  }

  const createRoom = async () => {
    if (!user) return; setIsCreatingRoom(true); setJoinError('')
    try {
      const res = await fetch('/api/games/arena-grid/room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', userId: user.id, gridSize }) })
      const d = await res.json()
      if (!d.success) { setJoinError(d.error || 'Failed to create room'); return }
      const expiresAt = Date.now() + ROOM_TTL_MS
      setRoomCode(d.room.code); setIsHost(true)
      setRoomExpiresAt(expiresAt)
      setSecondsLeft(300)
      setLobbyPlayers((d.room.players as any[]).map(p => ({ ...p, score: 0 })))
      saveRoomToStorage(d.room.code, true, expiresAt)
      startPollingRoom(d.room.code)
    } catch { setJoinError('Network error. Please try again.') }
    setIsCreatingRoom(false)
  }

  const joinRoom = async () => {
    if (!user || !roomInput.trim()) return; setJoinError('')
    try {
      const res = await fetch('/api/games/arena-grid/room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join', userId: user.id, code: roomInput.trim().toUpperCase() }) })
      const d = await res.json()
      if (!d.success) { setJoinError(d.error || 'Room not found'); return }
      setRoomCode(d.room.code); setIsHost(false)
      setLobbyPlayers((d.room.players as any[]).map(p => ({ ...p, score: 0 })))
      if (d.room.status === 'playing') startGame(d.room); else startPollingRoom(d.room.code)
    } catch { setJoinError('Network error. Please try again.') }
  }

  const startPollingRoom = (code: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/games/arena-grid/room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get', code }) })
        const d = await res.json()
        if (!d.success) return
        setLobbyPlayers((d.room.players as any[]).map(p => ({ ...p, score: 0 })))
        if (d.room.status === 'playing') { clearInterval(pollRef.current!); startGame(d.room) }
      } catch {}
    }, 2000)
  }

  const handleStartMultiplayer = async () => {
    if (!roomCode) return
    try { await fetch('/api/games/arena-grid/room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start', userId: user?.id, code: roomCode }) }) } catch {}
  }

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => { setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000) })
  }

  const getInviteLink = () => `${window.location.origin}/home/campus-games/arena-grid/play?mode=friends&gridSize=${gridN}&join=${roomCode}`

  const copyLink = () => {
    navigator.clipboard.writeText(getInviteLink()).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) })
  }

  const shareViaDM = () => {
    // Save room state so we can come back, then go to DM with pre-filled message
    if (roomExpiresAt) saveRoomToStorage(roomCode, isHost, roomExpiresAt)
    const msg = encodeURIComponent(`Join my Arena Grid room! Code: ${roomCode} — or use this link: ${getInviteLink()}`)
    router.push(`/home?compose=${msg}`)
  }

  const goToChat = () => {
    // Persist room so it's still there when they come back
    if (roomExpiresAt) saveRoomToStorage(roomCode, isHost, roomExpiresAt)
    router.push('/home')
  }

  const startGame = (room: any) => {
    clearRoomFromStorage()
    setPlayers((room.players as any[]).map((p: any, i: number) => ({ ...p, score: 0, color: PLAYER_COLORS[i] || PLAYER_COLORS[0] })))
    setLines(new Set()); setBoard({}); setCurrentPlayerIdx(0); setGamePhase('playing'); scoreSavedRef.current = false
  }

  const placeLine = useCallback((lk: LineKey, playerIdx: number, currentLines: Set<LineKey>, currentBoard: Board, currentPlayers: Player[], isBotPlacement = false) => {
    const newLines = new Set(currentLines); newLines.add(lk)
    // Track who placed this line
    lineOwnersRef.current.set(lk, currentPlayers[playerIdx].userId)
    const newBoard = { ...currentBoard }
    const completed = getBoxesCompletedBy(newLines, lk, gridN)
    let scored = 0
    if (completed.length > 0) {
      const newAnim = new Set<string>()
      completed.forEach(([r, c]) => {
        const bk = makeBoxKey(r, c)
        if (!newBoard[bk]) { newBoard[bk] = currentPlayers[playerIdx].userId; scored++; newAnim.add(bk) }
      })
      if (newAnim.size > 0) { setAnimatingBoxes(newAnim); setTimeout(() => setAnimatingBoxes(new Set()), 350) }
    }
    const updatedPlayers = currentPlayers.map((p, i) => i === playerIdx ? { ...p, score: p.score + scored } : p)
    const claimedBoxes = Object.keys(newBoard).length
    setLines(newLines); setBoard(newBoard); setPlayers(updatedPlayers)
    // Highlight the bot's line AFTER setLines so the line is definitely rendered
    if (isBotPlacement) {
      if (botLineTimerRef.current) clearTimeout(botLineTimerRef.current)
      setLastBotLine(lk)
      botLineTimerRef.current = setTimeout(() => setLastBotLine(null), 2000)
    }
    if (claimedBoxes >= gridN * gridN) { setGamePhase('finished'); saveScore(updatedPlayers); return }
    const nextIdx = scored > 0 ? playerIdx : (playerIdx + 1) % currentPlayers.length
    setCurrentPlayerIdx(nextIdx)
    if (mode === 'bot' && currentPlayers[nextIdx]?.isBot) {
      setTimeout(() => {
        const botLk = botMove(newLines, gridN)
        if (botLk) placeLine(botLk, nextIdx, newLines, newBoard, updatedPlayers, true)
      }, BOT_THINK_MS + Math.random() * 600)
    }
  }, [gridN, mode])

  const handleLineTap = useCallback((lk: LineKey) => {
    if (gamePhase !== 'playing' || lines.has(lk)) return
    if (lastBotLine) return  // block during bot blink
    const cp = players[currentPlayerIdx]
    if (!cp || cp.isBot) return
    placeLine(lk, currentPlayerIdx, lines, board, players)
  }, [gamePhase, lines, board, players, currentPlayerIdx, placeLine, lastBotLine])

  const saveScore = async (finalPlayers: Player[]) => {
    if (!user || scoreSavedRef.current) return; scoreSavedRef.current = true
    const me = finalPlayers.find(p => p.userId === user.id); if (!me) return
    const maxScore = Math.max(...finalPlayers.map(p => p.score))
    const won = me.score === maxScore && finalPlayers.filter(p => p.score === maxScore).length === 1
    try { await fetch('/api/games/arena-grid/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, score: me.score, won, gridSize: gridN, mode, opponentCount: finalPlayers.length - 1 }) }) } catch {}
  }

  const restartGame = () => { if (!user) return; if (mode === 'bot') initBotGame(user); else router.push('/home/campus-games/arena-grid') }

  if (!user) return null

  // ── LOBBY ──────────────────────────────────────────────────────────────────
  if (mode === 'friends' && gamePhase === 'lobby') {
    return (
      <div style={{ minHeight: '100%', background: '#f5f7ff', display: 'flex', flexDirection: 'column', padding: '24px 20px', boxSizing: 'border-box' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ maxWidth: 480, margin: '0 auto', width: '100%' }}>

          {/* Back + header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <button onClick={() => router.push('/home/campus-games/arena-grid')}
              style={{ width: 36, height: 36, borderRadius: 10, background: 'white', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <ArrowLeft size={16} color="#64748b" />
            </button>
            <div>
              <h1 style={{ color: '#0f172a', fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em', fontFamily: "'Outfit',sans-serif" }}>Multiplayer Room</h1>
              <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 1 }}>Grid: {gridN}×{gridN} · Max 3 players</p>
            </div>
          </div>

          {roomCode ? (
            <div>
              {/* Room code card */}
              <div style={{ background: 'white', border: '1.5px solid #e0e7ff', borderRadius: 16, padding: '20px', marginBottom: 12, boxShadow: '0 2px 12px rgba(99,102,241,.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Room Code — Share with friends</p>
                  {/* Countdown pill */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: secondsLeft < 60 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${secondsLeft < 60 ? '#fca5a5' : '#86efac'}`, borderRadius: 20, padding: '3px 10px' }}>
                    <Clock size={10} color={secondsLeft < 60 ? '#ef4444' : '#22c55e'} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: secondsLeft < 60 ? '#ef4444' : '#16a34a', fontFamily: 'monospace' }}>
                      {String(Math.floor(secondsLeft / 60)).padStart(2,'0')}:{String(secondsLeft % 60).padStart(2,'0')}
                    </span>
                  </div>
                </div>
                {/* Code row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <span style={{ color: '#6366f1', fontSize: 32, fontWeight: 900, letterSpacing: '0.12em', fontFamily: 'monospace', flex: 1 }}>{roomCode}</span>
                  <button onClick={copyCode} style={{ background: codeCopied ? '#10b981' : '#eef2ff', border: `1.5px solid ${codeCopied ? '#10b981' : '#c7d2fe'}`, borderRadius: 10, padding: '8px 14px', color: codeCopied ? 'white' : '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                    {codeCopied ? <Check size={13} /> : <Copy size={13} />}{codeCopied ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
                {/* Share actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={copyLink} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: linkCopied ? '#10b981' : '#f8fafc', border: `1.5px solid ${linkCopied ? '#10b981' : '#e2e8f0'}`, borderRadius: 10, padding: '9px 12px', color: linkCopied ? 'white' : '#374151', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.2s' }}>
                    {linkCopied ? <Check size={13} /> : <Copy size={13} />}{linkCopied ? 'Link Copied!' : 'Copy Invite Link'}
                  </button>
                  <button onClick={shareViaDM} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 10, padding: '9px 12px', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700, boxShadow: '0 3px 10px rgba(99,102,241,.3)' }}>
                    💬 Share via DM
                  </button>
                </div>
              </div>

              {/* Go to Chat hint */}
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>💡</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>Your room stays open for {String(Math.floor(secondsLeft / 60)).padStart(2,'0')}:{String(secondsLeft % 60).padStart(2,'0')} — safe to switch tabs!</span>
                </div>
                <button onClick={goToChat} style={{ background: '#f59e0b', border: 'none', borderRadius: 8, padding: '6px 12px', color: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>
                  Go to Chat →
                </button>
              </div>

              {/* Players */}
              <div style={{ marginBottom: 12 }}>
                <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Players ({lobbyPlayers.length}/3)</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {lobbyPlayers.map((p, i) => (
                    <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', border: '1.5px solid #e8eaf6', borderRadius: 12, padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLAYER_COLORS[i] || '#94a3b8', boxShadow: `0 0 8px ${PLAYER_COLORS[i] || '#94a3b8'}60`, flexShrink: 0 }} />
                      <Avatar src={p.profileImage} firstName={p.firstName} lastName={p.lastName} size={32} color={PLAYER_COLORS[i]} ring />
                      <div>
                        <p style={{ color: '#0f172a', fontSize: 13, fontWeight: 700 }}>
                          {p.firstName} {p.lastName}
                          {p.userId === user.id && <span style={{ color: '#6366f1', fontSize: 10, marginLeft: 6, fontWeight: 800 }}>you</span>}
                        </p>
                        <p style={{ color: '#10b981', fontSize: 10, fontWeight: 600 }}>Ready ✓</p>
                      </div>
                    </div>
                  ))}
                  {Array.from({ length: 3 - lobbyPlayers.length }).map((_, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fafafa', border: '1.5px dashed #e2e8f0', borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e2e8f0', flexShrink: 0 }} />
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', border: '1.5px dashed #e2e8f0' }} />
                      <p style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>Waiting for player…</p>
                    </div>
                  ))}
                </div>
              </div>

              {lobbyPlayers.length < 2 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 16px' }}>
                  <Clock size={14} color="#94a3b8" />
                  <p style={{ color: '#94a3b8', fontSize: 13 }}>Need at least 2 players to start</p>
                </div>
              ) : isHost ? (
                <button onClick={handleStartMultiplayer} style={{ width: '100%', background: 'linear-gradient(135deg,#6366f1,#7c3aed)', color: 'white', border: 'none', borderRadius: 13, height: 52, fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 24px rgba(99,102,241,.35)', fontFamily: "'Outfit',sans-serif" }}>
                  Start Game ({lobbyPlayers.length} players) ⚡
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px' }}>
                  <div style={{ width: 14, height: 14, border: '2px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
                  <p style={{ color: '#94a3b8', fontSize: 13 }}>Waiting for host to start…</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={createRoom} disabled={isCreatingRoom}
                style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', color: 'white', border: 'none', borderRadius: 14, height: 54, fontSize: 15, fontWeight: 800, cursor: isCreatingRoom ? 'not-allowed' : 'pointer', opacity: isCreatingRoom ? 0.7 : 1, boxShadow: '0 6px 24px rgba(99,102,241,.35)', fontFamily: "'Outfit',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {isCreatingRoom ? <><div style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} /> Creating…</> : '✨ Create Room — Be the Host'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>OR</span>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" value={roomInput} onChange={e => setRoomInput(e.target.value.toUpperCase())} placeholder="ENTER CODE" maxLength={6}
                  style={{ flex: 1, background: 'white', border: `1.5px solid ${joinError ? '#ef4444' : '#e2e8f0'}`, borderRadius: 12, padding: '0 16px', height: 54, color: '#0f172a', fontSize: 20, fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.12em', outline: 'none' }}
                  onKeyDown={e => e.key === 'Enter' && joinRoom()} />
                <button onClick={joinRoom} disabled={!roomInput.trim()}
                  style={{ background: roomInput.trim() ? 'linear-gradient(135deg,#f59e0b,#d97706)' : '#f1f5f9', border: `1.5px solid ${roomInput.trim() ? '#f59e0b' : '#e2e8f0'}`, borderRadius: 12, padding: '0 20px', height: 54, color: roomInput.trim() ? 'white' : '#94a3b8', fontSize: 14, fontWeight: 800, cursor: roomInput.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s', fontFamily: "'Outfit',sans-serif" }}>
                  Join
                </button>
              </div>
              {joinError && <p style={{ color: '#ef4444', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>{joinError}</p>}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── FINISHED ───────────────────────────────────────────────────────────────
  if (gamePhase === 'finished') {
    const maxScore = Math.max(...players.map(p => p.score))
    const winner = players.find(p => p.score === maxScore)
    const isWin = winner?.userId === user.id
    const isDraw = players.filter(p => p.score === maxScore).length > 1

    return (
      <div style={{ minHeight: '100%', background: '#f5f7ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', boxSizing: 'border-box' }}>
        <style>{`
          @keyframes confettiFall { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
        `}</style>

        {isWin && !isDraw && (
          <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {[...Array(40)].map((_, i) => (
              <div key={i} style={{ position: 'absolute', left: `${Math.random() * 100}%`, top: `-${Math.random() * 20}px`, width: Math.random() * 8 + 4, height: Math.random() * 8 + 4, borderRadius: Math.random() > 0.5 ? '50%' : 2, background: ['#6366f1','#f59e0b','#10b981','#ec4899','#34d399','#818cf8'][Math.floor(Math.random() * 6)], animation: `confettiFall ${1.5 + Math.random() * 1.5}s linear ${Math.random() * 0.8}s both` }} />
            ))}
          </div>
        )}

        <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>{isDraw ? '🤝' : isWin ? '🏆' : '🎮'}</div>
          <h2 style={{ color: '#0f172a', fontSize: 28, fontWeight: 900, marginBottom: 6, letterSpacing: '-0.02em', fontFamily: "'Outfit',sans-serif" }}>
            {isDraw ? "It's a Draw!" : isWin ? 'You Won!' : `${winner?.firstName} Wins!`}
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
            {isWin ? 'Your score was added to the leaderboard.' : 'Keep playing to climb the ranks!'}
          </p>

          {/* Scores */}
          <div style={{ background: 'white', border: '1.5px solid #e8eaf6', borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
            {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
              <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: p.userId === user.id ? '#eef2ff' : '#f8fafc', border: `1.5px solid ${p.userId === user.id ? '#c7d2fe' : '#f1f5f9'}` }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: i === 0 ? '#f59e0b' : '#94a3b8', width: 20, textAlign: 'center' }}>{i === 0 ? '👑' : `#${i + 1}`}</span>
                <Avatar src={p.profileImage} firstName={p.firstName} lastName={p.lastName} size={30} color={p.color} ring />
                <span style={{ color: '#374151', fontSize: 13, fontWeight: 600, flex: 1, textAlign: 'left' }}>{p.firstName} {p.isBot ? '(Bot)' : p.userId === user.id ? '(You)' : ''}</span>
                <span style={{ color: p.color, fontSize: 20, fontWeight: 900, fontFamily: "'Outfit',sans-serif" }}>{p.score}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={restartGame} style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', color: 'white', border: 'none', borderRadius: 13, height: 52, fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 24px rgba(99,102,241,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'Outfit',sans-serif" }}>
              <RefreshCw size={16} /> Play Again
            </button>
            <button onClick={() => router.push('/home/campus-games/arena-grid')} style={{ background: '#f1f5f9', color: '#374151', border: '1.5px solid #e2e8f0', borderRadius: 13, height: 48, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
              View Leaderboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── GAME BOARD ─────────────────────────────────────────────────────────────
  const currentPlayer = players[currentPlayerIdx]
  const isMyTurn = currentPlayer?.userId === user.id && !lastBotLine
  const myPlayer = players.find(p => p.userId === user.id)
  const totalCells = gridN * gridN
  const filledCells = Object.keys(board).length
  const progressPct = Math.round((filledCells / totalCells) * 100)

  // Bigger cells + bolder dots
  const cellSize = gridN <= 6 ? 76 : gridN <= 9 ? 58 : 42
  const dotR     = gridN <= 6 ? 5  : gridN <= 9 ? 4  : 3
  const lineThick= gridN <= 6 ? 6  : gridN <= 9 ? 5  : 4
  const hitTarget= gridN <= 9 ? 28 : 22

  const turnStatus = isMyTurn ? '⚡ Your turn' : currentPlayer?.isBot ? '🤖 Bot thinking…' : `${currentPlayer?.firstName}'s turn`
  const statusColor = isMyTurn ? '#6366f1' : '#f59e0b'

  const playerCard = (p: Player, i: number) => {
    const active = currentPlayerIdx === i
    const isLeading = p.score === Math.max(...players.map(x => x.score)) && p.score > 0
    const share = totalCells > 0 ? Math.round((p.score / totalCells) * 100) : 0
    return (
      <div key={p.userId} style={{
        width: 136, borderRadius: 16, padding: '14px 12px', flexShrink: 0,
        background: active ? `linear-gradient(160deg,${p.color}18,${p.color}06)` : 'white',
        border: `1.5px solid ${active ? p.color + '55' : '#e8eaf6'}`,
        boxShadow: active ? `0 6px 24px ${p.color}22` : '0 1px 4px rgba(0,0,0,.04)',
        position: 'relative', overflow: 'hidden',
        transition: 'all .3s cubic-bezier(.34,1.2,.64,1)',
      }}>
        {active && <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${p.color}12, transparent 70%)`, pointerEvents: 'none' }} />}
        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar src={p.profileImage} firstName={p.firstName} lastName={p.lastName} size={34} color={p.color} ring={active} />
            {active && <div style={{ position: 'absolute', bottom: -1, right: -1, width: 9, height: 9, borderRadius: '50%', background: '#22c55e', border: '2px solid white', animation: 'turnPulse 1.5s ease infinite' }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: active ? '#0f172a' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.isBot ? '🤖 Bot' : p.userId === user.id ? 'You' : p.firstName}
            </div>
            {p.isBot && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>AI</div>}
          </div>
        </div>
        {/* Score */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 6 }}>
          <span style={{ fontSize: 38, fontWeight: 900, color: active ? p.color : '#cbd5e1', letterSpacing: '-.05em', lineHeight: 1, transition: 'color .3s', fontFamily: "'Outfit',sans-serif" }}>{p.score}</span>
          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>pts</span>
          {share > 0 && <span style={{ marginLeft: 3, fontSize: 9, fontWeight: 700, color: active ? p.color + 'aa' : '#cbd5e1' }}>({share}%)</span>}
        </div>
        {/* Ownership bar */}
        <div style={{ height: 4, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', width: `${share}%`, background: p.color, borderRadius: 4, transition: 'width .7s ease' }} />
        </div>
        {isLeading && p.score > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: `${p.color}14`, border: `1px solid ${p.color}28`, borderRadius: 20, padding: '2px 8px' }}>
            <span style={{ fontSize: 8, fontWeight: 800, color: p.color, letterSpacing: '.06em' }}>LEADING</span>
          </div>
        )}
        {active && <div style={{ height: 2, background: `linear-gradient(90deg,${p.color},${p.color}00)`, borderRadius: 2, marginTop: 8 }} />}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100%', background: '#f5f7ff', display: 'flex', flexDirection: 'column', userSelect: 'none', boxSizing: 'border-box' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes turnPulse { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes botBlink { 0%,100%{opacity:1} 50%{opacity:.12} }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{ background: 'white', borderBottom: '1px solid #e8eaf6', padding: '10px 20px 12px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/home/campus-games/arena-grid')}
          style={{ width: 32, height: 32, borderRadius: 9, background: '#f8fafc', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
          onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}>
          <ArrowLeft size={14} color="#64748b" />
        </button>

        {/* Segmented progress bar */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ position: 'relative', height: 26, background: '#f1f5f9', borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: 'inset 0 1px 3px rgba(0,0,0,.07)' }}>
            {players.map((p, i) => {
              const seg = p.score
              const offsetPct = players.slice(0, i).reduce((a, pp) => a + (pp.score / totalCells) * 100, 0)
              const segPct = (seg / totalCells) * 100
              if (!seg) return null
              return (
                <div key={p.userId} style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: `${offsetPct}%`, width: `${segPct}%`,
                  background: p.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'width .7s cubic-bezier(.34,1,.64,1), left .7s cubic-bezier(.34,1,.64,1)',
                  overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.3)',
                }}>
                  {seg >= 1 && <span style={{ fontSize: 12, fontWeight: 900, color: '#0f172a', letterSpacing: '-.02em', whiteSpace: 'nowrap' }}>{seg}</span>}
                </div>
              )
            })}
            {totalCells - filledCells > 0 && (
              <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `${((totalCells - filledCells) / totalCells) * 100}%`, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap' }}>{totalCells - filledCells}</span>
              </div>
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,.18) 50%,transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 2.5s ease infinite', pointerEvents: 'none' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {players.map(p => (
              <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>{p.isBot ? 'Bot' : p.userId === user.id ? 'You' : p.firstName} · {p.score}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e2e8f0', flexShrink: 0 }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8' }}>{totalCells - filledCells} left</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main: [grid] [right column: status + cards] ── */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 116, flexShrink: 0 }}>

          {/* Grid SVG */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <svg width={gridN * cellSize + dotR * 2} height={gridN * cellSize + dotR * 2} style={{ display: 'block', touchAction: 'none' }}>

              {/* Boxes */}
              {Object.entries(board).map(([bk, ownerId]) => {
                const [, r, c] = bk.split('-').map(Number)
                const owner = players.find(p => p.userId === ownerId)
                if (!owner) return null
                const x = dotR + c * cellSize, y = dotR + r * cellSize
                const isAnim = animatingBoxes.has(bk)
                const label = owner.isBot ? 'BOT' : (owner.firstName?.slice(0, 3) || '').toUpperCase()
                return (
                  <g key={bk}>
                    <rect x={x + 1} y={y + 1} width={cellSize - 2} height={cellSize - 2} fill={`${owner.color}1e`} rx={4}
                      style={{ transform: isAnim ? 'scale(1.06)' : 'scale(1)', transformOrigin: `${x + cellSize / 2}px ${y + cellSize / 2}px`, transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)' }} />
                    <text x={x + cellSize / 2} y={y + cellSize / 2 + 4} textAnchor="middle" fontSize={cellSize * 0.24} fontWeight={900} fill={owner.color} fontFamily="'Outfit',sans-serif" opacity={0.9}>{label}</text>
                  </g>
                )
              })}

              {/* Horizontal lines */}
              {Array.from({ length: gridN + 1 }, (_, r) =>
                Array.from({ length: gridN }, (_, c) => {
                  const lk = makeLineKey('h', r, c)
                  const placed = lines.has(lk)
                  const hov = hoveredLine === lk
                  const isBotNew = lastBotLine === lk
                  const ownerColor = placed ? (players.find(p => p.userId === lineOwnersRef.current.get(lk))?.color ?? players[0]?.color ?? '#6366f1') : hov && isMyTurn ? `${myPlayer?.color ?? '#6366f1'}80` : '#c8ccd4'
                  const x1 = dotR + c * cellSize + dotR, x2 = dotR + (c + 1) * cellSize - dotR, y = dotR + r * cellSize
                  return (
                    <g key={lk} style={{ animation: isBotNew ? 'botBlink 2.0s ease-in-out 1' : 'none' }}>
                      <rect x={x1} y={y - hitTarget / 2} width={x2 - x1} height={hitTarget} fill="transparent"
                        style={{ cursor: !placed && isMyTurn ? 'pointer' : 'default' }}
                        onMouseEnter={() => !placed && isMyTurn && setHoveredLine(lk)}
                        onMouseLeave={() => setHoveredLine(null)}
                        onClick={() => handleLineTap(lk)} />
                      <line x1={x1} y1={y} x2={x2} y2={y}
                        stroke={ownerColor}
                        strokeWidth={placed ? lineThick : hov && isMyTurn ? lineThick - 1 : 2.5}
                        strokeLinecap="round"
                        style={{ pointerEvents: 'none', transition: 'stroke 0.12s, stroke-width 0.12s' }} />
                    </g>
                  )
                })
              )}

              {/* Vertical lines */}
              {Array.from({ length: gridN }, (_, r) =>
                Array.from({ length: gridN + 1 }, (_, c) => {
                  const lk = makeLineKey('v', r, c)
                  const placed = lines.has(lk)
                  const hov = hoveredLine === lk
                  const isBotNew = lastBotLine === lk
                  const ownerColor = placed ? (players.find(p => p.userId === lineOwnersRef.current.get(lk))?.color ?? players[0]?.color ?? '#6366f1') : hov && isMyTurn ? `${myPlayer?.color ?? '#6366f1'}80` : '#c8ccd4'
                  const x = dotR + c * cellSize, y1 = dotR + r * cellSize + dotR, y2 = dotR + (r + 1) * cellSize - dotR
                  return (
                    <g key={lk} style={{ animation: isBotNew ? 'botBlink 2.0s ease-in-out 1' : 'none' }}>
                      <rect x={x - hitTarget / 2} y={y1} width={hitTarget} height={y2 - y1} fill="transparent"
                        style={{ cursor: !placed && isMyTurn ? 'pointer' : 'default' }}
                        onMouseEnter={() => !placed && isMyTurn && setHoveredLine(lk)}
                        onMouseLeave={() => setHoveredLine(null)}
                        onClick={() => handleLineTap(lk)} />
                      <line x1={x} y1={y1} x2={x} y2={y2}
                        stroke={ownerColor}
                        strokeWidth={placed ? lineThick : hov && isMyTurn ? lineThick - 1 : 2.5}
                        strokeLinecap="round"
                        style={{ pointerEvents: 'none', transition: 'stroke 0.12s, stroke-width 0.12s' }} />
                    </g>
                  )
                })
              )}

              {/* Dots */}
              {Array.from({ length: gridN + 1 }, (_, r) =>
                Array.from({ length: gridN + 1 }, (_, c) => (
                  <circle key={`d-${r}-${c}`} cx={dotR + c * cellSize} cy={dotR + r * cellSize} r={dotR} fill="#4b5563" stroke="#f5f7ff" strokeWidth={1.5} />
                ))
              )}
            </svg>
          </div>

          {/* Right column: status pill + both player cards stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0, width: 200 }}>

            {/* Status pill */}
            <div style={{ background: '#f1f5f9', border: `1.5px solid #e2e8f0`, borderRadius: 14, padding: '8px 14px', textAlign: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap' }}>{turnStatus}</span>
            </div>

            {/* Player cards stacked */}
            {players.map((p, i) => {
              const active = currentPlayerIdx === i
              const isLeading = p.score === Math.max(...players.map(x => x.score)) && p.score > 0
              const share = totalCells > 0 ? Math.round((p.score / totalCells) * 100) : 0
              return (
                <div key={p.userId} style={{
                  borderRadius: 18, padding: '16px 14px',
                  background: active ? `linear-gradient(160deg,${p.color}18,${p.color}06)` : 'white',
                  border: `1.5px solid ${active ? p.color + '55' : '#e8eaf6'}`,
                  boxShadow: active ? `0 8px 28px ${p.color}28` : '0 1px 4px rgba(0,0,0,.04)',
                  position: 'relative', overflow: 'hidden',
                  transition: 'all .3s cubic-bezier(.34,1.2,.64,1)',
                }}>
                  {active && <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${p.color}12, transparent 70%)`, pointerEvents: 'none' }} />}
                  {/* Avatar + name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <Avatar src={p.profileImage} firstName={p.firstName} lastName={p.lastName} size={38} color={p.color} ring={active} />
                      {active && <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', background: '#22c55e', border: '2px solid white', animation: 'turnPulse 1.5s ease infinite' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: active ? '#0f172a' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.isBot ? '🤖 Bot' : p.userId === user.id ? 'You' : p.firstName}
                      </div>
                      {p.isBot && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>AI Opponent</div>}
                    </div>
                  </div>
                  {/* Score */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 7 }}>
                    <span style={{ fontSize: 42, fontWeight: 900, color: active ? p.color : '#cbd5e1', letterSpacing: '-.05em', lineHeight: 1, transition: 'color .3s', fontFamily: "'Outfit',sans-serif" }}>{p.score}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>pts</span>
                    {share > 0 && <span style={{ marginLeft: 3, fontSize: 10, fontWeight: 700, color: active ? p.color + 'aa' : '#cbd5e1' }}>({share}%)</span>}
                  </div>
                  {/* Ownership bar */}
                  <div style={{ height: 4, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 7 }}>
                    <div style={{ height: '100%', width: `${share}%`, background: p.color, borderRadius: 4, transition: 'width .7s ease' }} />
                  </div>
                  {isLeading && p.score > 0 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: `${p.color}14`, border: `1px solid ${p.color}28`, borderRadius: 20, padding: '3px 9px' }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: p.color, letterSpacing: '.06em' }}>LEADING</span>
                    </div>
                  )}
                  {active && <div style={{ height: 2, background: `linear-gradient(90deg,${p.color},${p.color}00)`, borderRadius: 2, marginTop: 8 }} />}
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </div>
  )
}
