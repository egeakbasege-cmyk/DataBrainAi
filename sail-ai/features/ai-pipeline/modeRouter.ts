/**
 * features/ai-pipeline/modeRouter.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for mode → API + display metadata mapping.
 * No more scattered MODE_COLOR / labels across 6 different files.
 */

import type { AnalysisMode, ModeDescriptor, ModeResponseFormat } from './types'

export const MODE_REGISTRY: Record<AnalysisMode, ModeDescriptor> = {
  upwind: {
    id: 'upwind', label: 'Upwind', tagline: 'Executive strategy, delivered BLUF.',
    icon: '◎', color: '#2563EB', format: 'json', endpoint: '/api/chat',
  },
  downwind: {
    id: 'downwind', label: 'Downwind', tagline: 'Momentum coaching. Guided cadence.',
    icon: '◉', color: '#059669', format: 'stream', endpoint: '/api/chat',
  },
  sail: {
    id: 'sail', label: 'SAIL', tagline: 'Adaptive intelligence. Live streaming.',
    icon: '◈', color: '#7C3AED', format: 'stream', endpoint: '/api/chat',
  },
  trim: {
    id: 'trim', label: 'TRIM', tagline: 'Milestone roadmap. 30 · 60 · 90 day.',
    icon: '▤', color: '#B45309', format: 'json', endpoint: '/api/chat',
  },
  catamaran: {
    id: 'catamaran', label: 'Catamaran', tagline: 'Dual-track strategic comparison.',
    icon: '⊕', color: '#D97706', format: 'json', endpoint: '/api/chat',
  },
  operator: {
    id: 'operator', label: 'Operator', tagline: 'Universal deep intelligence.',
    icon: '◆', color: '#DC2626', format: 'stream', endpoint: '/api/chat',
  },
  synergy: {
    id: 'synergy', label: 'Synergy', tagline: 'War-room multi-mode fusion.',
    icon: '◬', color: '#C9A96E', format: 'stream', endpoint: '/api/chat',
  },
  scenario: {
    id: 'scenario', label: 'Scenario', tagline: 'Predictive simulation engine.',
    icon: '◐', color: '#0891B2', format: 'stream', endpoint: '/api/chat',
  },
}

export const ALL_MODES   = Object.values(MODE_REGISTRY)
export const PRIMARY_MODES: AnalysisMode[] = ['upwind', 'sail', 'trim']
export const EXTENDED_MODES: AnalysisMode[] = ['catamaran', 'operator', 'synergy', 'scenario', 'downwind']

export function getMode(id: AnalysisMode): ModeDescriptor {
  return MODE_REGISTRY[id]
}

export function getModeColor(id: AnalysisMode): string {
  return MODE_REGISTRY[id]?.color ?? '#14B8A6'
}

export function getModeFormat(id: AnalysisMode): ModeResponseFormat {
  return MODE_REGISTRY[id]?.format ?? 'stream'
}

export function isStreamMode(id: AnalysisMode): boolean {
  return getModeFormat(id) === 'stream'
}
