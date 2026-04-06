'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export type AppMode = 'analyst' | 'strategist' | 'cleaner'

interface AppModeContextValue {
  mode:    AppMode
  setMode: (m: AppMode) => void
}

const AppModeContext = createContext<AppModeContextValue>({
  mode:    'strategist',
  setMode: () => {},
})

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>('strategist')
  return (
    <AppModeContext.Provider value={{ mode, setMode }}>
      {children}
    </AppModeContext.Provider>
  )
}

export function useAppMode() {
  return useContext(AppModeContext)
}

export const MODE_META: Record<AppMode, { label: string; hint: string; systemPrompt: string }> = {
  analyst: {
    label:        'Analyst',
    hint:         'Deep-dive numbers & diagnostics',
    systemPrompt: 'You are a rigorous business analyst. Focus on quantitative diagnosis, benchmarks, and data-driven root causes. Surface concrete numbers and patterns before making recommendations.',
  },
  strategist: {
    label:        'Strategist',
    hint:         'Actionable growth playbook',
    systemPrompt: 'You are a sharp business strategist. Convert diagnosis into a prioritised, time-bound action plan. Each action must have a measurable metric impact and a clear owner.',
  },
  cleaner: {
    label:        'Cleaner',
    hint:         'Cut waste & fix leaks fast',
    systemPrompt: 'You are a ruthless operational fixer. Identify every source of waste, friction, and unnecessary spend. Rank fixes by ROI. Be blunt — no fluff.',
  },
}
