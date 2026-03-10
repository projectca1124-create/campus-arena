'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trophy, Zap, Bot, Users } from 'lucide-react'

interface User { id: string; firstName: string; lastName: string; profileImage?: string }
interface LeaderEntry {
  userId: string; firstName: string; lastName: string
  profileImage?: string; major?: string; academicStanding?: string
  weeklyScore: number; gamesPlayed: number
}
interface MyStats { totalScore: number; gamesPlayed: number; wins: number }

function Avatar({ src, firstName, lastName, size = 36, color }: {
  src?: string | null; firstName?: string; lastName?: string; size?: number; color?: string
}) {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`
  if (src) return <img src={src} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: color ? `2px solid ${color}40` : undefined }} />
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color ? `${color}18` : 'linear-gradient(135deg,#6366f1,#7c3aed)',
      border: `2px solid ${color ? color + '40' : '#c7d2fe'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: color || '#6366f1', fontWeight: 800, fontSize: size * 0.35,
      fontFamily: "'Outfit',sans-serif",
    }}>{initials}</div>
  )
}

const MEDAL_COLORS = ['#f59e0b', '#94a3b8', '#cd7c3f']
const GRID_SIZES = [
  { size: 6,  label: '6×6',   tag: 'Quick',    color: '#10b981', glow: 'rgba(16,185,129,0.15)',
    hint: '36 boxes total — first to 19 wins. Perfect when tight on time. Ends before you blink.' },
  { size: 9,  label: '9×9',   tag: 'Classic',  color: '#6366f1', glow: 'rgba(99,102,241,0.15)',
    hint: '81 boxes, real strategy kicks in. Chains, traps, sacrifice plays — this is the real game.' },
  { size: 12, label: '12×12', tag: 'Marathon', color: '#f59e0b', glow: 'rgba(245,158,11,0.15)',
    hint: '144 boxes of pure calculation. Mid-game collapses happen fast. Only for the patient and ruthless.' },
]

export default function ArenaGridLandingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([])
  const [myStats, setMyStats] = useState<MyStats | null>(null)
  const [weekLabel, setWeekLabel] = useState('This week')
  const [loading, setLoading] = useState(true)
  const [selectedGrid, setSelectedGrid] = useState(9)
  const [hoveredGrid, setHoveredGrid] = useState<number | null>(null)
  const [showModes, setShowModes] = useState(false)

  useEffect(() => {
    try {
      const s = localStorage.getItem('user')
      if (!s) { router.push('/auth'); return }
      const u = JSON.parse(s); setUser(u)
      fetchLeaderboard(u.id)
    } catch { router.push('/auth') }
  }, [router])

  const fetchLeaderboard = async (uid: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/games/arena-grid/leaderboard?userId=${uid}`)
      if (res.ok) {
        const d = await res.json()
        setLeaderboard(d.leaderboard || [])
        setMyStats(d.myStats)
        if (d.weekStart) {
          const dt = new Date(d.weekStart)
          setWeekLabel(dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
        }
      }
    } catch {}
    setLoading(false)
  }

  const go = (mode: 'bot' | 'friends') =>
    router.push(`/home/campus-games/arena-grid/play?gridSize=${selectedGrid}&mode=${mode}`)

  if (!user) return null

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f7ff', overflow: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes szIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        .sz-btn { transition: all .2s cubic-bezier(.34,1.2,.64,1) !important; }
        .sz-btn:hover { transform: translateY(-2px) !important; }
        .mode-btn { transition: all .2s cubic-bezier(.34,1.2,.64,1) !important; }
        .mode-btn:hover { transform: translateY(-2px) !important; }
      `}</style>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ── Hero ── */}
        <div style={{
          background: 'white',
          borderBottom: '1px solid #e8eaf6',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Subtle dot pattern */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: .4 }}>
            <defs><pattern id="dp" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="0.8" fill="#6366f1" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#dp)" />
          </svg>
          {/* Glow orb */}
          <div style={{ position: 'absolute', top: -80, right: -60, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* Back */}
          <div style={{ position: 'relative', padding: '16px 20px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => router.push('/home/campus-games')}
              style={{ width: 34, height: 34, borderRadius: 10, background: '#f8fafc', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}>
              <ArrowLeft size={16} color="#64748b" />
            </button>
            <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>Campus Games</span>
          </div>

          {/* Hero content */}
          <div style={{ position: 'relative', padding: '20px 20px 24px' }}>
            {/* Mini grid preview */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'inline-grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                {['#6366f1','#6366f1','#f59e0b','#e8eaf6','#6366f1','#e8eaf6','#f59e0b','#e8eaf6','#e8eaf6','#e8eaf6','#e8eaf6','#e8eaf6'].map((bg, i) => (
                  <div key={i} style={{ width: 14, height: 14, borderRadius: 3, background: bg, border: '1px solid #e2e8f0' }} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ color: '#0f172a', fontWeight: 900, fontSize: 'clamp(26px,6vw,38px)', letterSpacing: '-0.03em', lineHeight: 1, margin: 0, fontFamily: "'Outfit',sans-serif" }}>Arena Grid</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 7, padding: '3px 8px' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ color: '#059669', fontSize: 9, fontWeight: 800, letterSpacing: '0.07em' }}>LIVE</span>
              </div>
            </div>
            <p style={{ color: '#6366f1', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Claim boxes. Dominate the grid.</p>
            <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.6, marginBottom: 18 }}>
              Draw lines, complete a box — it's yours + extra turn. Most boxes wins.
            </p>

            {/* How to play pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[['✏️','Draw a line'],['⬛','Box = extra turn'],['🏆','Most boxes wins']].map(([ic, lb]) => (
                <div key={lb} style={{ flex: 1, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 14, marginBottom: 3 }}>{ic}</div>
                  <div style={{ color: '#64748b', fontSize: 9, fontWeight: 700, lineHeight: 1.3 }}>{lb}</div>
                </div>
              ))}
            </div>

            {/* Play button */}
            <button
              onClick={() => setShowModes(m => !m)}
              style={{
                width: '100%', height: 50,
                background: showModes ? '#f1f5f9' : 'linear-gradient(135deg,#6366f1,#7c3aed)',
                color: showModes ? '#374151' : 'white',
                border: showModes ? '1.5px solid #e2e8f0' : 'none',
                borderRadius: 13, fontSize: 15, fontWeight: 800,
                cursor: 'pointer', fontFamily: "'Outfit',sans-serif",
                boxShadow: showModes ? 'none' : '0 6px 24px rgba(99,102,241,.38)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all .2s',
              }}
            >
              {showModes ? '✕ Close' : <><Zap size={16} /> Play Now</>}
            </button>
          </div>
        </div>

        {/* ── Mode selector ── */}
        {showModes && (
          <div style={{ background: 'white', borderBottom: '1px solid #e8eaf6', padding: '20px', animation: 'slideDown 0.22s ease-out' }}>

            {/* Grid size */}
            <p style={{ color: '#94a3b8', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Grid Size</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {GRID_SIZES.map((g, i) => {
                const active = selectedGrid === g.size
                const isHov = hoveredGrid === g.size
                return (
                  <button key={g.size}
                    onClick={() => setSelectedGrid(g.size)}
                    onMouseEnter={() => setHoveredGrid(g.size)}
                    onMouseLeave={() => setHoveredGrid(null)}
                    className="sz-btn"
                    style={{
                      background: active ? `linear-gradient(135deg,${g.color}12,${g.color}06)` : '#f8fafc',
                      border: `1.5px solid ${active ? g.color + '55' : isHov ? g.color + '25' : '#e2e8f0'}`,
                      borderRadius: 12, padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                      boxShadow: active ? `0 4px 16px ${g.glow}` : isHov ? `0 2px 10px ${g.glow}` : 'none',
                      animation: `szIn .25s ease ${i * .05}s both`,
                      transition: 'all .2s cubic-bezier(.34,1.2,.64,1)',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: (active || isHov) ? 6 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <p style={{ color: active ? '#0f172a' : '#374151', fontSize: 14, fontWeight: 800, fontFamily: "'Outfit',sans-serif" }}>{g.label}</p>
                        <span style={{ fontSize: 9, fontWeight: 800, color: active ? g.color : '#94a3b8', background: active ? `${g.color}15` : '#f1f5f9', border: `1px solid ${active ? g.color + '30' : '#e2e8f0'}`, padding: '2px 7px', borderRadius: 20, transition: 'all .18s' }}>{g.tag}</span>
                      </div>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${active ? g.color : '#d1d5db'}`, background: active ? g.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s' }}>
                        {active && <span style={{ fontSize: 9, color: 'white', fontWeight: 900 }}>✓</span>}
                      </div>
                    </div>
                    <p style={{
                      fontSize: 11, color: active ? '#475569' : '#94a3b8', lineHeight: 1.5, fontWeight: 500,
                      maxHeight: (active || isHov) ? 40 : 0, overflow: 'hidden',
                      opacity: (active || isHov) ? 1 : 0, transition: 'max-height .25s ease, opacity .2s ease',
                    }}>{g.hint}</p>
                  </button>
                )
              })}
            </div>

            {/* Mode */}
            <p style={{ color: '#94a3b8', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Mode</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { mode: 'bot' as const,     Icon: Bot,   title: 'vs Bot',     sub: '1v1 · Instant start\nScores the leaderboard', col: '#6366f1' },
                { mode: 'friends' as const, Icon: Users, title: 'vs Friends', sub: '2–3 players · Invite link\nStarts when all join',  col: '#f59e0b' },
              ].map(m => (
                <button key={m.mode} onClick={() => go(m.mode)} className="mode-btn"
                  style={{
                    background: `${m.col}08`, border: `1.5px solid ${m.col}30`,
                    borderRadius: 14, padding: '16px 14px', cursor: 'pointer', textAlign: 'left',
                    boxShadow: `0 2px 8px ${m.col}10`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = m.col + '70'; e.currentTarget.style.background = `${m.col}12` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = m.col + '30'; e.currentTarget.style.background = `${m.col}08` }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${m.col}15`, border: `1.5px solid ${m.col}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <m.Icon size={18} color={m.col} />
                  </div>
                  <p style={{ color: '#0f172a', fontSize: 14, fontWeight: 800, marginBottom: 4, fontFamily: "'Outfit',sans-serif" }}>{m.title}</p>
                  <p style={{ color: '#64748b', fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{m.sub}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Leaderboard ── */}
        <div style={{ padding: '20px 16px 40px' }}>

          {/* My stats */}
          {myStats && myStats.gamesPlayed > 0 && (
            <div style={{
              background: 'white', borderRadius: 16, border: '1.5px solid #e8eaf6',
              marginBottom: 18, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
              boxShadow: '0 2px 8px rgba(0,0,0,.04)',
            }}>
              {([['#6366f1', myStats.totalScore, 'TOTAL PTS'],['#10b981', myStats.wins, 'WINS'],['#f59e0b', myStats.gamesPlayed, 'PLAYED']] as [string,number,string][]).map(([col, val, lbl], i) => (
                <div key={lbl} style={{ textAlign: 'center', padding: '14px 8px', borderRight: i < 2 ? '1px solid #f1f5f9' : 'none' }}>
                  <p style={{ color: col, fontSize: 22, fontWeight: 900, lineHeight: 1, fontFamily: "'Outfit',sans-serif" }}>{val}</p>
                  <p style={{ color: '#94a3b8', fontSize: 8, fontWeight: 700, letterSpacing: '0.07em', marginTop: 3 }}>{lbl}</p>
                </div>
              ))}
            </div>
          )}

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Trophy size={16} color="#f59e0b" />
              <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit',sans-serif" }}>Campus Leaderboard</span>
            </div>
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Week of {weekLabel}</span>
          </div>

          {/* Column labels */}
          {leaderboard.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '28px 34px 1fr 52px', gap: 6, padding: '6px 10px', borderBottom: '1px solid #f1f5f9', marginBottom: 8 }}>
              {['#', '', 'Player', 'Score'].map((h, i) => (
                <span key={i} style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.06em', textAlign: i === 3 ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>
          )}

          {/* Entries */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div style={{ width: 26, height: 26, border: '3px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
            </div>
          ) : leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', background: 'white', borderRadius: 16, border: '1.5px solid #e8eaf6' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
              <p style={{ color: '#374151', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>No scores yet this week</p>
              <p style={{ color: '#94a3b8', fontSize: 12 }}>Be the first to play and claim #1!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {leaderboard.map((entry, idx) => {
                const isMe = entry.userId === user.id
                const mc = idx < 3 ? MEDAL_COLORS[idx] : null
                return (
                  <div key={entry.userId} style={{
                    display: 'grid', gridTemplateColumns: '28px 34px 1fr 52px',
                    gap: 6, alignItems: 'start',
                    background: isMe ? 'linear-gradient(135deg,#eef2ff,#f5f3ff)' : 'white',
                    border: `1.5px solid ${isMe ? '#c7d2fe' : '#f1f5f9'}`,
                    borderRadius: 12, padding: '10px 10px',
                    boxShadow: isMe ? '0 2px 12px rgba(99,102,241,.1)' : '0 1px 3px rgba(0,0,0,.03)',
                    transition: 'all 0.15s',
                  }}>
                    {/* Rank */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 4 }}>
                      {mc ? (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${mc}18`, border: `1.5px solid ${mc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: mc }}>
                          {idx === 0 ? '👑' : idx + 1}
                        </div>
                      ) : <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>#{idx + 1}</span>}
                    </div>
                    {/* Avatar */}
                    <Avatar src={entry.profileImage} firstName={entry.firstName} lastName={entry.lastName} size={32} color={isMe ? '#6366f1' : undefined} />
                    {/* Name */}
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* Row 1: name + YOU badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.firstName} {entry.lastName}</span>
                        {isMe && <span style={{ fontSize: 8, fontWeight: 800, color: '#6366f1', background: '#e0e7ff', padding: '1px 5px', borderRadius: 5, flexShrink: 0 }}>YOU</span>}
                      </div>
                      {/* Row 2: major · standing — always below name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden' }}>
                        <span style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.major || 'Student'}
                        </span>
                        {entry.major && entry.academicStanding && (
                          <span style={{ fontSize: 10, color: '#d1d5db', flexShrink: 0 }}>·</span>
                        )}
                        {entry.academicStanding && (
                          <span style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {entry.academicStanding}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Score */}
                    <div style={{ textAlign: 'right', paddingTop: 2 }}>
                      <p style={{ fontSize: 16, fontWeight: 900, color: idx === 0 ? '#f59e0b' : '#6366f1', lineHeight: 1, fontFamily: "'Outfit',sans-serif" }}>{entry.weeklyScore}</p>
                      <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{entry.gamesPlayed}g</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}