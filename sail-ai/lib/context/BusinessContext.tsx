'use client'

import { createContext, useContext, useEffect, useReducer, useCallback, useRef } from 'react'
import type { DiagnosticInput } from '@/lib/diagnostic'

/* ── Types ──────────────────────────────────────────── */
export interface BusinessMetric {
  label:   string
  value:   string
  addedAt: string
}

export interface BusinessSession {
  id:        string
  prompt:    string
  summary:   string
  createdAt: string
}

export interface BusinessProfile {
  sector:          string
  metrics:         BusinessMetric[]
  sessions:        BusinessSession[]
  diagnostic:      DiagnosticInput | null
  diagnosticPrompt: string | null
}

const EMPTY_PROFILE: BusinessProfile = {
  sector:          '',
  metrics:         [],
  sessions:        [],
  diagnostic:      null,
  diagnosticPrompt: null,
}

/* ── Actions ────────────────────────────────────────── */
type Action =
  | { type: 'SET_SECTOR';      sector:  string }
  | { type: 'ADD_METRIC';      label:   string; value: string }
  | { type: 'REMOVE_METRIC';   label:   string }
  | { type: 'ADD_SESSION';     prompt:  string; summary: string }
  | { type: 'SET_DIAGNOSTIC';  data: DiagnosticInput; prompt: string }
  | { type: 'CLEAR' }
  | { type: 'HYDRATE';         profile: BusinessProfile }
  | { type: 'HYDRATE_SESSIONS'; sessions: BusinessSession[] }

function reducer(state: BusinessProfile, action: Action): BusinessProfile {
  switch (action.type) {
    case 'SET_SECTOR':
      return { ...state, sector: action.sector }

    case 'ADD_METRIC': {
      // Replace existing metric with same label, or append
      const existing = state.metrics.findIndex(m => m.label === action.label)
      const metric: BusinessMetric = { label: action.label, value: action.value, addedAt: new Date().toISOString() }
      const metrics = existing >= 0
        ? state.metrics.map((m, i) => i === existing ? metric : m)
        : [...state.metrics.slice(-9), metric]  // keep last 10
      return { ...state, metrics }
    }

    case 'REMOVE_METRIC':
      return { ...state, metrics: state.metrics.filter(m => m.label !== action.label) }

    case 'ADD_SESSION': {
      const session: BusinessSession = {
        id:        crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        prompt:    action.prompt,
        summary:   action.summary,
        createdAt: new Date().toISOString(),
      }
      return {
        ...state,
        sessions: [...state.sessions.slice(-19), session], // keep last 20
      }
    }

    case 'SET_DIAGNOSTIC':
      return { ...state, diagnostic: action.data, diagnosticPrompt: action.prompt }

    case 'CLEAR':
      return EMPTY_PROFILE

    case 'HYDRATE':
      return action.profile

    case 'HYDRATE_SESSIONS': {
      // Merge DB sessions with local ones, deduplicate by id, keep most recent 20
      const merged = [...action.sessions, ...state.sessions]
      const seen   = new Set<string>()
      const unique = merged.filter(s => {
        if (seen.has(s.id)) return false
        seen.add(s.id)
        return true
      })
      return { ...state, sessions: unique.slice(0, 20) }
    }

    default:
      return state
  }
}

/* ── Context ────────────────────────────────────────── */
interface BusinessContextValue {
  profile:         BusinessProfile
  setSector:       (sector: string) => void
  addMetric:       (label: string, value: string) => void
  removeMetric:    (label: string) => void
  addSession:      (prompt: string, summary: string) => void
  setDiagnostic:   (data: DiagnosticInput, prompt: string) => void
  clearProfile:    () => void
  /** Returns a compact memory string to prepend to AI prompts */
  buildContext:    () => string
}

const BusinessContext = createContext<BusinessContextValue | null>(null)

const STORAGE_KEY   = 'sail_business_profile'
const DB_SYNC_DELAY = 2_000   // ms — debounce DB writes so rapid metric updates don't spam the API

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [profile, dispatch] = useReducer(reducer, EMPTY_PROFILE)
  const dbSyncTimer         = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isHydrated          = useRef(false)

  // ── 1. Hydrate: localStorage → DB merge on mount ────────────────────────────
  useEffect(() => {
    // Step A: hydrate from localStorage immediately (zero latency)
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) dispatch({ type: 'HYDRATE', profile: JSON.parse(raw) })
    } catch { /* ignore parse errors */ }

    // Step B: fetch DB profile — DB wins on sector + metrics + diagnostic
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then((data: { profile?: { sector?: string; metrics?: unknown; diagnostic?: unknown } | null } | null) => {
        const dbProfile = data?.profile
        if (!dbProfile) return
        // Merge: DB sector/metrics/diagnostic are authoritative
        if (dbProfile.sector) {
          dispatch({ type: 'SET_SECTOR', sector: dbProfile.sector as string })
        }
        if (Array.isArray(dbProfile.metrics) && dbProfile.metrics.length > 0) {
          // Rebuild metrics from DB — they are the source of truth
          const freshProfile: BusinessProfile = {
            ...EMPTY_PROFILE,
            sector:  dbProfile.sector  as string ?? '',
            metrics: dbProfile.metrics as BusinessMetric[],
          }
          dispatch({ type: 'HYDRATE', profile: freshProfile })
        }
        if (dbProfile.diagnostic) {
          dispatch({
            type:   'SET_DIAGNOSTIC',
            data:   dbProfile.diagnostic as DiagnosticInput,
            prompt: '',
          })
        }
      })
      .catch(() => undefined)
      .finally(() => { isHydrated.current = true })

    // Step C: merge DB sessions (analysis history)
    fetch('/api/sessions')
      .then(r => r.json())
      .then(({ sessions }) => {
        if (Array.isArray(sessions) && sessions.length > 0) {
          dispatch({ type: 'HYDRATE_SESSIONS', sessions })
        }
      })
      .catch(() => undefined)
  }, [])

  // ── 2. Persist to localStorage on every change ───────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    } catch { /* ignore quota errors */ }
  }, [profile])

  // ── 3. Debounced DB sync — only fires when sector/metrics/diagnostic change ──
  useEffect(() => {
    // Don't sync on the initial hydration pass
    if (!isHydrated.current) return
    if (!profile.sector && profile.metrics.length === 0 && !profile.diagnostic) return

    if (dbSyncTimer.current) clearTimeout(dbSyncTimer.current)
    dbSyncTimer.current = setTimeout(() => {
      fetch('/api/profile', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          sector:     profile.sector,
          metrics:    profile.metrics,
          diagnostic: profile.diagnostic,
        }),
      }).catch(() => undefined)
    }, DB_SYNC_DELAY)

    return () => {
      if (dbSyncTimer.current) clearTimeout(dbSyncTimer.current)
    }
  }, [profile.sector, profile.metrics, profile.diagnostic])

  const setSector      = useCallback((sector: string) => dispatch({ type: 'SET_SECTOR', sector }), [])
  const addMetric      = useCallback((label: string, value: string) => dispatch({ type: 'ADD_METRIC', label, value }), [])
  const removeMetric   = useCallback((label: string) => dispatch({ type: 'REMOVE_METRIC', label }), [])
  const addSession     = useCallback((prompt: string, summary: string) => dispatch({ type: 'ADD_SESSION', prompt, summary }), [])
  const setDiagnostic  = useCallback((data: DiagnosticInput, prompt: string) => dispatch({ type: 'SET_DIAGNOSTIC', data, prompt }), [])
  const clearProfile   = useCallback(() => dispatch({ type: 'CLEAR' }), [])

  /** Builds a context block injected before each AI prompt */
  const buildContext = useCallback((): string => {
    const parts: string[] = []

    // Diagnostic profile takes precedence — full system prompt
    if (profile.diagnosticPrompt) {
      parts.push(profile.diagnosticPrompt)
    } else if (profile.sector) {
      parts.push(`Business sector: ${profile.sector}`)
    }

    // Guard: never leak empty or legacy tombstone rows into the AI prompt.
    const liveMetrics = profile.metrics.filter(
      m => m.value && m.value !== '\x00DELETE',
    )
    if (liveMetrics.length > 0) {
      const metricLines = liveMetrics
        .slice(-5)
        .map(m => `  • ${m.label}: ${m.value}`)
        .join('\n')
      parts.push(`Known metrics (from previous sessions):\n${metricLines}`)
    }

    if (profile.sessions.length > 0) {
      const recent = profile.sessions
        .slice(-3)
        .map(s => `  • ${s.summary}`)
        .join('\n')
      parts.push(`Recent strategy sessions:\n${recent}`)
    }

    if (parts.length === 0) return ''

    return `${parts.join('\n\n')}\n\n`
  }, [profile])

  return (
    <BusinessContext.Provider value={{ profile, setSector, addMetric, removeMetric, addSession, setDiagnostic, clearProfile, buildContext }}>
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusinessContext(): BusinessContextValue {
  const ctx = useContext(BusinessContext)
  if (!ctx) throw new Error('useBusinessContext must be used inside <BusinessProvider>')
  return ctx
}
