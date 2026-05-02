'use client'

/**
 * Mobile JWT Auth Hook — v2
 *
 * Replaces NextAuth.js session management for the Capacitor static-export build.
 *
 * Why NextAuth cannot be used in mobile builds:
 *   NextAuth requires API routes (/api/auth/*) which are server-side only.
 *   Static export (output:'export') produces a file:// or capacitor:// bundle —
 *   there is no Node.js server to handle these routes.
 *
 * Architecture (Token-Based / Strategy A from MOBILE_BUILD_GUIDE.md):
 *   1. User submits email + password on the login screen
 *   2. App POSTs directly to the Railway backend (NEXT_PUBLIC_API_URL)
 *      → POST /api/auth/mobile/login
 *   3. Backend returns { token: string, expiresAt: number, user: MobileUser }
 *   4. Token is persisted via usePreferences (Capacitor Preferences on native,
 *      localStorage fallback on web)
 *   5. Every subsequent AI API call adds Authorization: Bearer <token>
 *   6. On mount: token expiry is checked — within 7 days of expiry triggers
 *      silent refresh via POST /api/auth/mobile/refresh
 *
 * Endpoints consumed (on Railway Express server):
 *   POST /api/auth/mobile/login   — email+password → JWT
 *   POST /api/auth/mobile/refresh — valid JWT → fresh JWT (extends 30 days)
 *   GET  /api/auth/mobile/me      — validate token, return user payload
 *
 * Usage:
 *   const { user, token, isAuthenticated, login, logout, isLoading } = useMobileAuth()
 */

import { useState, useEffect, useCallback } from 'react'
import { usePreferences, PREF_KEYS }         from '@/hooks/usePreferences'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MobileUser {
  id:        string
  email:     string
  name?:     string
  image?:    string
  plan?:     string
}

interface AuthState {
  user:            MobileUser | null
  token:           string | null
  isAuthenticated: boolean
  isLoading:       boolean
  error:           string | null
}

interface LoginCredentials {
  email:    string
  password: string
}

interface AuthResponse {
  token:     string
  expiresAt: number        // Unix timestamp (ms)
  user:      MobileUser
}

interface RefreshResponse {
  token:     string
  expiresAt: number
}

// ── Config ────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_RAILWAY_URL ?? ''

// Refresh the token when it has less than 7 days remaining
const REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMobileAuth() {
  const pref = usePreferences()

  const [state, setState] = useState<AuthState>({
    user:            null,
    token:           null,
    isAuthenticated: false,
    isLoading:       true,
    error:           null,
  })

  // ── Restore / refresh session on mount ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      try {
        const [token, expiresAtStr, email, userId, name, image, plan] = await Promise.all([
          pref.get(PREF_KEYS.AUTH_TOKEN),
          pref.get(PREF_KEYS.AUTH_EXPIRES_AT),
          pref.get(PREF_KEYS.USER_EMAIL),
          pref.get(PREF_KEYS.USER_ID),
          pref.get(PREF_KEYS.USER_NAME),
          pref.get(PREF_KEYS.USER_IMAGE),
          pref.get(PREF_KEYS.USER_PLAN),
        ])

        if (!token || !expiresAtStr) {
          if (!cancelled) setState(s => ({ ...s, isLoading: false }))
          return
        }

        const expiresAt = parseInt(expiresAtStr, 10)
        const now       = Date.now()

        // ── Hard expiry: auto-logout ─────────────────────────────────────────
        if (now > expiresAt) {
          await clearStoredSession(pref)
          if (!cancelled) setState(s => ({ ...s, isLoading: false }))
          return
        }

        // ── Soft expiry: silent refresh if within REFRESH_THRESHOLD_MS ───────
        if (expiresAt - now < REFRESH_THRESHOLD_MS) {
          const refreshed = await silentRefresh(token)
          if (refreshed && !cancelled) {
            await Promise.all([
              pref.set(PREF_KEYS.AUTH_TOKEN,      refreshed.token),
              pref.set(PREF_KEYS.AUTH_EXPIRES_AT, String(refreshed.expiresAt)),
            ])
            const user: MobileUser = {
              id:    userId ?? '',
              email: email  ?? '',
              name:  name   ?? undefined,
              image: image  ?? undefined,
              plan:  plan   ?? undefined,
            }
            setState({ user, token: refreshed.token, isAuthenticated: true, isLoading: false, error: null })
            return
          }
          // Refresh failed but token is still valid — continue with old token
        }

        const user: MobileUser = {
          id:    userId ?? '',
          email: email  ?? '',
          name:  name   ?? undefined,
          image: image  ?? undefined,
          plan:  plan   ?? undefined,
        }

        if (!cancelled) {
          setState({ user, token, isAuthenticated: true, isLoading: false, error: null })
        }
      } catch {
        if (!cancelled) setState(s => ({ ...s, isLoading: false }))
      }
    }

    void restoreSession()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    setState(s => ({ ...s, isLoading: true, error: null }))

    try {
      const res = await fetch(`${API_URL}/api/auth/mobile/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(credentials),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string }
        const msg  = body.message ?? `Login failed (${res.status})`
        setState(s => ({ ...s, isLoading: false, error: msg }))
        return false
      }

      const data = await res.json() as AuthResponse

      // Persist all user fields to Capacitor Preferences / localStorage
      await Promise.all([
        pref.set(PREF_KEYS.AUTH_TOKEN,      data.token),
        pref.set(PREF_KEYS.AUTH_EXPIRES_AT, String(data.expiresAt)),
        pref.set(PREF_KEYS.USER_EMAIL,      data.user.email),
        pref.set(PREF_KEYS.USER_ID,         data.user.id),
        data.user.name  ? pref.set(PREF_KEYS.USER_NAME,  data.user.name)  : Promise.resolve(),
        data.user.image ? pref.set(PREF_KEYS.USER_IMAGE, data.user.image) : Promise.resolve(),
        data.user.plan  ? pref.set(PREF_KEYS.USER_PLAN,  data.user.plan)  : Promise.resolve(),
      ])

      setState({
        user:            data.user,
        token:           data.token,
        isAuthenticated: true,
        isLoading:       false,
        error:           null,
      })
      return true

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error. Check connection.'
      setState(s => ({ ...s, isLoading: false, error: msg }))
      return false
    }
  }, [pref])

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async (): Promise<void> => {
    await clearStoredSession(pref)
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false, error: null })
  }, [pref])

  // ── Authenticated fetch helper ─────────────────────────────────────────────
  // Convenience: wraps fetch() with the stored Bearer token.
  const authFetch = useCallback(
    (url: string, init?: RequestInit): Promise<Response> => {
      const headers = new Headers(init?.headers)
      if (state.token) headers.set('Authorization', `Bearer ${state.token}`)
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
      return fetch(url, { ...init, headers })
    },
    [state.token],
  )

  return {
    user:            state.user,
    token:           state.token,
    isAuthenticated: state.isAuthenticated,
    isLoading:       state.isLoading,
    error:           state.error,
    login,
    logout,
    authFetch,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function silentRefresh(currentToken: string): Promise<RefreshResponse | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/mobile/refresh`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${currentToken}` },
    })
    if (!res.ok) return null
    return await res.json() as RefreshResponse
  } catch {
    return null
  }
}

async function clearStoredSession(pref: ReturnType<typeof usePreferences>) {
  await Promise.all([
    pref.remove(PREF_KEYS.AUTH_TOKEN),
    pref.remove(PREF_KEYS.AUTH_EXPIRES_AT),
    pref.remove(PREF_KEYS.USER_EMAIL),
    pref.remove(PREF_KEYS.USER_ID),
    pref.remove(PREF_KEYS.USER_NAME),
    pref.remove(PREF_KEYS.USER_IMAGE),
    pref.remove(PREF_KEYS.USER_PLAN),
  ])
}

export default useMobileAuth
