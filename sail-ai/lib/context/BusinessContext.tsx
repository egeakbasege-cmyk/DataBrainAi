'use client'

import { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
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
  addSession:      (prompt: string, summary: string) => void
  setDiagnostic:   (data: DiagnosticInput, prompt: string) => void
  clearProfile:    () => void
  /** Returns a compact memory string to prepend to AI prompts */
  buildContext:    () => string
}

const BusinessContext = createContext<BusinessContextValue | null>(null)

const STORAGE_KEY = 'sail_business_profile'

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [profile, dispatch] = useReducer(reducer, EMPTY_PROFILE)

  // Hydrate from localStorage first, then merge DB sessions
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) dispatch({ type: 'HYDRATE', profile: JSON.parse(raw) })
    } catch {
      // Ignore parse errors
    }

    // Fetch persisted sessions from DB (Pro users)
    fetch('/api/sessions')
      .then(r => r.json())
      .then(({ sessions }) => {
        if (Array.isArray(sessions) && sessions.length > 0) {
          dispatch({ type: 'HYDRATE_SESSIONS', sessions })
        }
      })
      .catch(() => undefined)
  }, [])

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    } catch {
      // Ignore quota errors
    }
  }, [profile])

  const setSector      = useCallback((sector: string) => dispatch({ type: 'SET_SECTOR', sector }), [])
  const addMetric      = useCallback((label: string, value: string) => dispatch({ type: 'ADD_METRIC', label, value }), [])
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

    if (profile.metrics.length > 0) {
      const metricLines = profile.metrics
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
    <BusinessContext.Provider value={{ profile, setSector, addMetric, addSession, setDiagnostic, clearProfile, buildContext }}>
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusinessContext(): BusinessContextValue {
  const ctx = useContext(BusinessContext)
  if (!ctx) throw new Error('useBusinessContext must be used inside <BusinessProvider>')
  return ctx
}
