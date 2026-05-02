/**
 * Mobile Auth Routes — POST /api/auth/mobile/login
 *                      POST /api/auth/mobile/refresh
 *
 * Why this exists:
 *   NextAuth.js requires server-side API routes (/api/auth/*) which are
 *   unavailable in a Capacitor static-export build (output:'export').
 *   This Express endpoint provides a stateless JWT flow that the
 *   `useMobileAuth` hook (mobile/auth/useMobileAuth.ts) calls directly.
 *
 * Token contract (matches AuthResponse in useMobileAuth.ts):
 *   { token: string, expiresAt: number (Unix ms), user: MobileUser }
 *
 * Security notes:
 *   - Passwords are verified with bcryptjs (same hashing used by the
 *     Next.js credential provider — CredentialsConfig in auth.ts).
 *   - JWT is signed with MOBILE_JWT_SECRET (separate from NextAuth secret).
 *   - Rate limiting is intentionally left to the Railway / Nginx layer
 *     (configure request limits there, not inside the app).
 *   - Users without a password column (OAuth-only accounts) cannot log in
 *     via this endpoint — they must use the web OAuth flow.
 */

import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt    from 'jsonwebtoken'
import { getPool }  from '../lib/db'

export const mobileAuthRouter = Router()

// ── Config ────────────────────────────────────────────────────────────────────

const JWT_SECRET = () => process.env.MOBILE_JWT_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''

// Token lifetime: 30 days (matches most mobile app conventions).
// The client stores expiresAt and auto-logouts on expiry.
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

// ── Helpers ───────────────────────────────────────────────────────────────────

interface DbUser {
  id:       string
  email:    string
  name:     string | null
  image:    string | null
  password: string | null
  is_pro:   boolean
}

async function findUserByEmail(email: string): Promise<DbUser | null> {
  const pool = getPool()
  if (!pool) return null

  const { rows } = await pool.query<DbUser>(
    `SELECT id, email, name, image, password, "isPro" AS is_pro
     FROM "User"
     WHERE email = $1
     LIMIT 1`,
    [email.toLowerCase().trim()],
  )
  return rows[0] ?? null
}

function signMobileJwt(user: DbUser): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + TOKEN_TTL_MS
  const secret    = JWT_SECRET()

  if (!secret) {
    throw new Error(
      'MOBILE_JWT_SECRET (or NEXTAUTH_SECRET) not configured. ' +
      'Set it in the Railway environment variables.',
    )
  }

  const token = jwt.sign(
    {
      sub:   user.id,
      email: user.email,
      isPro: user.is_pro,
      // Standard JWT claims
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt / 1000),
    },
    secret,
    { algorithm: 'HS256' },
  )

  return { token, expiresAt }
}

// ── POST /api/auth/mobile/login ───────────────────────────────────────────────

mobileAuthRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string }

  // ── Input validation ─────────────────────────────────────────────────────
  if (!email || typeof email !== 'string') {
    res.status(400).json({ message: 'Email is required.' })
    return
  }
  if (!password || typeof password !== 'string') {
    res.status(400).json({ message: 'Password is required.' })
    return
  }
  if (password.length > 256) {
    // Guard against bcrypt DoS (bcrypt is slow on very long strings)
    res.status(400).json({ message: 'Invalid credentials.' })
    return
  }

  // ── Database lookup ──────────────────────────────────────────────────────
  let user: DbUser | null
  try {
    user = await findUserByEmail(email)
  } catch (err) {
    console.error('[mobileAuth] DB lookup error:', err instanceof Error ? err.message : err)
    res.status(503).json({ message: 'Authentication service unavailable. Try again later.' })
    return
  }

  // ── Deliberate timing-safe failure path ──────────────────────────────────
  // Always attempt bcrypt compare even when user is not found to prevent
  // timing attacks that reveal whether an email is registered.
  const DUMMY_HASH = '$2b$12$invalidhashforuserthatdoesnotexist000000000000000000000'
  const storedHash = user?.password ?? DUMMY_HASH

  if (!user?.password) {
    // OAuth-only account — no password set. Still run bcrypt to normalise timing.
    await bcrypt.compare(password, DUMMY_HASH)
    res.status(401).json({ message: 'Invalid email or password.' })
    return
  }

  let passwordMatch: boolean
  try {
    passwordMatch = await bcrypt.compare(password, storedHash)
  } catch (err) {
    console.error('[mobileAuth] bcrypt error:', err instanceof Error ? err.message : err)
    res.status(500).json({ message: 'Authentication error. Please try again.' })
    return
  }

  if (!passwordMatch) {
    res.status(401).json({ message: 'Invalid email or password.' })
    return
  }

  // ── Issue JWT ────────────────────────────────────────────────────────────
  let token: string
  let expiresAt: number
  try {
    ;({ token, expiresAt } = signMobileJwt(user))
  } catch (err) {
    console.error('[mobileAuth] JWT signing error:', err instanceof Error ? err.message : err)
    res.status(500).json({ message: 'Could not issue token. Contact support.' })
    return
  }

  res.status(200).json({
    token,
    expiresAt,
    user: {
      id:    user.id,
      email: user.email,
      name:  user.name  ?? undefined,
      image: user.image ?? undefined,
      plan:  user.is_pro ? 'pro' : 'free',
    },
  })
})

// ── POST /api/auth/mobile/refresh ─────────────────────────────────────────────
// Accepts a valid (non-expired) JWT and returns a fresh one with a new expiry.
// Allows long-running sessions without requiring re-login.

mobileAuthRouter.post('/refresh', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] ?? ''
  const bearer     = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!bearer) {
    res.status(401).json({ message: 'No token provided.' })
    return
  }

  const secret = JWT_SECRET()
  if (!secret) {
    res.status(500).json({ message: 'Auth not configured.' })
    return
  }

  let payload: jwt.JwtPayload
  try {
    payload = jwt.verify(bearer, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload
  } catch {
    res.status(401).json({ message: 'Token invalid or expired.' })
    return
  }

  const expiresAt = Date.now() + TOKEN_TTL_MS
  const newToken  = jwt.sign(
    {
      sub:   payload.sub,
      email: payload.email,
      isPro: payload.isPro,
      iat:   Math.floor(Date.now() / 1000),
      exp:   Math.floor(expiresAt / 1000),
    },
    secret,
    { algorithm: 'HS256' },
  )

  res.status(200).json({ token: newToken, expiresAt })
})

// ── GET /api/auth/mobile/me ───────────────────────────────────────────────────
// Validates the current token and returns the user payload.
// Useful for the mobile app to verify session on launch without a full login.

mobileAuthRouter.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] ?? ''
  const bearer     = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!bearer) {
    res.status(401).json({ message: 'No token provided.' })
    return
  }

  const secret = JWT_SECRET()
  if (!secret) {
    res.status(500).json({ message: 'Auth not configured.' })
    return
  }

  try {
    const payload = jwt.verify(bearer, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload
    res.status(200).json({
      user: {
        id:    payload.sub,
        email: payload.email as string,
        plan:  payload.isPro ? 'pro' : 'free',
      },
      expiresAt: (payload.exp ?? 0) * 1000,
    })
  } catch {
    res.status(401).json({ message: 'Token invalid or expired.' })
  }
})
