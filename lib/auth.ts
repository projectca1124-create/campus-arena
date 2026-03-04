// lib/auth.ts — JWT Authentication Utilities
// Handles token creation, verification, and cookie management

import { cookies } from 'next/headers'
import crypto from 'crypto'

// ─── Types ───────────────────────────────────────────────────────
export interface TokenPayload {
  userId: string
  email: string
  iat: number   // issued at
  exp: number   // expires at
}

export interface AuthUser {
  userId: string
  email: string
}

// ─── Config ──────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || ''
const TOKEN_EXPIRY_HOURS = 72 // 3 days
const COOKIE_NAME = 'ca_session'

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production')
}

// Use a fallback for development only
const SECRET = JWT_SECRET || 'dev-secret-change-in-production-immediately'

// ─── Base64URL Helpers ───────────────────────────────────────────
function base64urlEncode(data: string): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64urlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return Buffer.from(str, 'base64').toString('utf-8')
}

// ─── JWT Implementation (No external dependency) ─────────────────
// Uses HMAC-SHA256 for signing — simple, secure, zero dependencies

function createJWT(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  const now = Math.floor(Date.now() / 1000)
  const fullPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRY_HOURS * 3600,
  }

  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64urlEncode(JSON.stringify(fullPayload))
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return `${header}.${body}.${signature}`
}

function verifyJWT(token: string): TokenPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [header, body, signature] = parts

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', SECRET)
      .update(`${header}.${body}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    // Timing-safe comparison to prevent timing attacks
    if (signature.length !== expectedSig.length) return null
    const sigBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSig)
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null

    // Decode and check expiry
    const payload: TokenPayload = JSON.parse(base64urlDecode(body))

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null // Token expired
    }

    return payload
  } catch {
    return null
  }
}

// ─── Cookie Management ───────────────────────────────────────────

export function setAuthCookie(userId: string, email: string): string {
  const token = createJWT({ userId, email })
  return token
}

export function createAuthCookieHeader(token: string): string {
  const maxAge = TOKEN_EXPIRY_HOURS * 3600
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  const sameSite = process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax'
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=${sameSite}${secure}`
}

export function createLogoutCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
}

// ─── Auth Verification (for API routes) ──────────────────────────

/**
 * getAuthUser() — Call this at the top of every protected API route.
 * 
 * Returns the authenticated user's ID and email, or null if not authenticated.
 * 
 * Usage:
 *   const auth = await getAuthUser()
 *   if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })
 *   // Use auth.userId instead of body.userId
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(COOKIE_NAME)
    
    if (!sessionCookie?.value) return null

    const payload = verifyJWT(sessionCookie.value)
    if (!payload) return null

    return {
      userId: payload.userId,
      email: payload.email,
    }
  } catch {
    return null
  }
}

/**
 * getAuthUserFromHeader() — For routes that receive the token in Authorization header.
 * Useful for client-side fetch calls during transition period.
 */
export function getAuthUserFromHeader(request: Request): AuthUser | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const payload = verifyJWT(token)
  if (!payload) return null

  return {
    userId: payload.userId,
    email: payload.email,
  }
}

/**
 * requireAuth() — Convenience wrapper that returns Response if unauthorized.
 * 
 * Usage:
 *   const auth = await requireAuth()
 *   if (auth instanceof Response) return auth  // 401 response
 *   // auth is AuthUser
 */
export async function requireAuth(): Promise<AuthUser | Response> {
  const auth = await getAuthUser()
  if (!auth) {
    return Response.json(
      { error: 'Unauthorized — please log in' },
      { status: 401 }
    )
  }
  return auth
}