'use client'

/**
 * Mobile JWT Auth Hook
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
 *   3. Backend returns { token: string, expiresAt: number, user: {...} }
 *   4. Token is persisted via usePreferences (Capacitor Preferences on native,
 *      localStorage fallback on web)
 *   5. Every subsequent API call adds Authorization: Bearer <token>
 *   6. Token expiry is checked at hook init — auto-logout on expiry
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

// ── Backend URL ───────────────────────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_RAILWAY_URL ?? ''

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

  // ── Restore session on mount ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      try {
        const [token, expiresAtStr, email, userId] = await Promise.all([
          pref.get(PREF_KEYS.AUTH_TOKEN),
          pref.get(PREF_KEYS.AUTH_EXPIRES_AT),
          pref.get(PREF_KEYS.USER_EMAIL),
          pref.get(PREF_KEYS.USER_ID),
        ])

        if (!token || !expiresAtStr) {
          if (!cancelled) setState(s => ({ ...s, isLoading: false }))
          return
        }

        // Expiry check — auto-logout if token is expired
        const expiresAt = parseInt(expiresAtStr, 10)
        if (Date.now() > expiresAt) {
          await clearStoredSession(pref)
          if (!cancelled) setState(s => ({ ...s, isLoading: false }))
          return
        }

        const user: MobileUser = { id: userId ?? '', email: email ?? '' }

        if (!cancelled) {
          setState({
            user,
            token,
            isAuthenticated: true,
            isLoading:       false,
            error:           null,
          })
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
        const msg  = body.message ?? `Login failed: ${res.status}`
        setState(s => ({ ...s, isLoading: false, error: msg }))
        return false
      }

      const data = await res.json() as AuthResponse

      // Persist to Capacitor Preferences / localStorage
      await Promise.all([
        pref.set(PREF_KEYS.AUTH_TOKEN,      data.token),
        pref.set(PREF_KEYS.AUTH_EXPIRES_AT, String(data.expiresAt)),
        pref.set(PREF_KEYS.USER_EMAIL,      data.user.email),
        pref.set(PREF_KEYS.USER_ID,         data.user.id),
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
      headers.set('Content-Type', 'application/json')
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

async function clearStoredSession(pref: ReturnType<typeof usePreferences>) {
  await Promise.all([
    pref.remove(PREF_KEYS.AUTH_TOKEN),
    pref.remove(PREF_KEYS.AUTH_EXPIRES_AT),
    pref.remove(PREF_KEYS.USER_EMAIL),
    pref.remove(PREF_KEYS.USER_ID),
  ])
}

export default useMobileAuth
