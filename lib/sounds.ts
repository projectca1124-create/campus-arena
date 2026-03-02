// Save as: lib/sounds.ts
// Minimal sound effects using Web Audio API — zero external dependencies

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

// ─── iMessage-style Send Sound ──────────────────────────────────
// Short, crisp "swoosh" — ascending tone that fades quickly
export function playSendSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Main tone — quick ascending sweep
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08)
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.12)
    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.15)

    // Soft overtone for richness
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1600, now)
    osc2.frequency.exponentialRampToValueAtTime(2200, now + 0.1)
    gain2.gain.setValueAtTime(0.04, now)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now)
    osc2.stop(now + 0.12)
  } catch { /* silent fail if audio unavailable */ }
}

// ─── Receive / Notification Sound ───────────────────────────────
// Gentle two-tone "ding" — like a soft water drop
export function playReceiveSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // First note — soft bell
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now) // A5
    gain.gain.setValueAtTime(0.1, now)
    gain.gain.exponentialRampToValueAtTime(0.02, now + 0.15)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.3)

    // Second note — slightly higher, delayed
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1175, now + 0.1) // D6
    gain2.gain.setValueAtTime(0, now)
    gain2.gain.setValueAtTime(0.08, now + 0.1)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.1)
    osc2.stop(now + 0.35)
  } catch { /* silent fail */ }
}

// ─── Initialize audio on first user interaction ─────────────────
// Call this once on first click/tap to unlock audio context
let initialized = false
export function initSounds() {
  if (initialized) return
  initialized = true
  try {
    const ctx = getAudioContext()
    // Create a silent buffer to unlock audio
    const buffer = ctx.createBuffer(1, 1, 22050)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
  } catch { /* silent */ }
}