'use client'

/**
 * AgentStatusBar
 *
 * Elegant, non-intrusive top-right status strip. Shows:
 *  - Active AgentMode (badge — not a dropdown)
 *  - Cognitive Load Index (10-pip bar)
 *  - Active drift alert count (pulsing dot when > 0)
 *  - Dominant strategic vector dimension (text label)
 *
 * Clicking the mode badge cycles through modes in order.
 * Everything else is read-only status display.
 *
 * Typography: Inter 10px / 0.16em tracking — Swiss instrument precision.
 * No rounded corners. No shadows on the bar itself.
 */

import { useCallback }      from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useAetherisStore,
  selectAgentMode,
  selectCognitiveLoad,
  selectActiveAlerts,
  selectVectors,
} from '@/lib/aetherisStore'
import type { AgentMode } from '@/types/architecture'
import { useLanguage }     from '@/lib/i18n/LanguageContext'
import type { TranslationKey } from '@/lib/i18n/translations'

const AGENT_MODES: AgentMode[] = ['Auto', 'Strategy', 'Analysis', 'Execution', 'Review']
const TOTAL_PIPS = 10

function getCLIPClass(pipIndex: number, loadIndex: number): string {
  const activePips = Math.round((loadIndex / 100) * TOTAL_PIPS)
  if (pipIndex >= activePips) return 'ae-cog-load__pip'
  if (loadIndex < 40) return 'ae-cog-load__pip ae-cog-load__pip--active-low'
  if (loadIndex < 70) return 'ae-cog-load__pip ae-cog-load__pip--active-mid'
  return 'ae-cog-load__pip ae-cog-load__pip--active-high'
}

export function AgentStatusBar() {
  const agentMode   = useAetherisStore(selectAgentMode)
  const clIndex     = useAetherisStore(selectCognitiveLoad)
  const allAlerts   = useAetherisStore(selectActiveAlerts)
  const alerts      = allAlerts.filter((a) => !a.isResolved)
  const vectors     = useAetherisStore(selectVectors)
  const setMode     = useAetherisStore((s) => s.setAgentMode)
  const { t }       = useLanguage()

  const cycleMode = useCallback(() => {
    const idx  = AGENT_MODES.indexOf(agentMode)
    const next = AGENT_MODES[(idx + 1) % AGENT_MODES.length]
    setMode(next)
  }, [agentMode, setMode])

  const dominantVector = vectors.length
    ? vectors.reduce((best, v) =>
        Math.abs(v.targetVelocity - v.currentVelocity) >
        Math.abs(best.targetVelocity - best.currentVelocity) ? v : best
      )
    : null

  const hasAlerts = alerts.length > 0

  return (
    <div
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:            '16px',
        userSelect:     'none',
      }}
    >
      {/* Dominant vector dimension — only shown when vectors exist */}
      <AnimatePresence>
        {dominantVector && (
          <motion.span
            key={dominantVector.dimension}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.25 }}
            className="ae-label-chrome"
            style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {dominantVector.dimension}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Cognitive load pips */}
      <div className="ae-cog-load" title={`Cognitive load: ${clIndex}/100`}>
        <div className="ae-cog-load__track">
          {Array.from({ length: TOTAL_PIPS }).map((_, i) => (
            <div key={i} className={getCLIPClass(i, clIndex)} />
          ))}
        </div>
      </div>

      {/* Drift alert count — pulsing dot */}
      <AnimatePresence>
        {hasAlerts && (
          <motion.div
            key="drift"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1   }}
            exit={{    opacity: 0, scale: 0.6  }}
            transition={{ duration: 0.2 }}
            className="ae-drift-badge"
            style={{ gap: 4 }}
          >
            <div className="ae-drift-badge__pulse" />
            <span>{alerts.length}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent mode badge — click to cycle */}
      <button
        onClick={cycleMode}
        className={`ae-mode-badge ${agentMode !== 'Auto' ? 'ae-mode-badge--active' : ''}`}
        title={`Agent mode: ${agentMode} — click to cycle`}
        style={{ cursor: 'pointer', border: 'none' }}
      >
        <div className="ae-mode-badge__dot" />
        {t(`agent.mode.${agentMode}` as TranslationKey)}
      </button>
    </div>
  )
}
