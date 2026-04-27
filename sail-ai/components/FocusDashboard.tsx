'use client'

/**
 * Data Brain™ Focus Dashboard
 * 
 * Real-time strategy feedback and agent orchestration UI.
 * Displays cognitive load, focus scores, and active simulations.
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAetherisStore } from '@/lib/aetherisStore'
import { useSimulation, type SimulationResult, type ModeComparison } from '@/lib/data-brain/simulation'
import { useEventStream } from '@/lib/data-brain/event-stream'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { AgentMode } from '@/types/chat'

interface FocusDashboardProps {
  className?: string
  onModeSelect?: (mode: AgentMode) => void
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CognitiveLoadMeter({ value }: { value: number }) {
  const { t } = useLanguage()
  
  const getColor = () => {
    if (value < 40) return 'var(--ae-velocity-pos, #4ADE80)'
    if (value < 70) return 'var(--ae-gold, #C9A96E)'
    return 'var(--ae-velocity-neg, #F87171)'
  }

  const getLabel = () => {
    if (value < 40) return t('databrain.cognitiveLoad.optimal')
    if (value < 70) return t('databrain.cognitiveLoad.elevated')
    return t('databrain.cognitiveLoad.high')
  }

  const getVerbosityLabel = () => {
    if (value >= 70) return t('databrain.cognitiveLoad.minimal')
    if (value >= 40) return t('databrain.cognitiveLoad.balanced')
    return t('databrain.cognitiveLoad.standard')
  }

  return (
    <div className="ae-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="ae-label">{t('databrain.cognitiveLoad.label')}</span>
        <span className="text-xs font-medium" style={{ color: getColor() }}>
          {getLabel()}
        </span>
      </div>
      <div className="ae-density-bar">
        <motion.div
          className="ae-density-bar__fill"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: getColor() }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-[var(--ae-text-muted)]">{value}/100</span>
        <span className="text-xs text-[var(--ae-text-muted)]">
          {getVerbosityLabel()}
        </span>
      </div>
    </div>
  )
}

function FocusScoreCard({ 
  dimension, 
  score, 
  trend, 
  delta 
}: { 
  dimension: string
  score: number
  trend: 'up' | 'down' | 'stable'
  delta: number
}) {
  const trendEmoji = { up: '↗', down: '↘', stable: '→' }
  const trendColor = { 
    up: 'var(--ae-velocity-pos)', 
    down: 'var(--ae-velocity-neg)', 
    stable: 'var(--ae-text-muted)' 
  }

  return (
    <div className="ae-card p-3 flex items-center justify-between">
      <div>
        <span className="text-xs text-[var(--ae-text-dim)] block">{dimension}</span>
        <span className="text-lg font-semibold text-[var(--ae-text)]">{score}</span>
      </div>
      <div className="text-right">
        <span 
          className="text-sm font-medium"
          style={{ color: trendColor[trend] }}
        >
          {trendEmoji[trend]} {Math.abs(delta)}
        </span>
      </div>
    </div>
  )
}

function SimulationPreview({ 
  result, 
  isSelected, 
  onClick 
}: { 
  result: SimulationResult
  isSelected?: boolean
  onClick?: () => void
}) {
  return (
    <motion.div
      className={`ae-matrix-card ${isSelected ? 'ae-matrix-card--selected' : ''}`}
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="ae-label-gold">{result.mode}</span>
        <span className="text-xs text-[var(--ae-text-muted)]">
          {result.estimatedTime}s
        </span>
      </div>
      
      <p className="text-sm text-[var(--ae-text-dim)] mb-3 line-clamp-2">
        {result.sampleInsight}
      </p>
      
      <div className="flex items-center gap-2">
        <div className="flex-1 ae-density-bar">
          <div 
            className="ae-density-bar__fill"
            style={{ width: `${result.confidence * 100}%` }}
          />
        </div>
        <span className="text-xs text-[var(--ae-text-muted)]">
          {Math.round(result.confidence * 100)}%
        </span>
      </div>
    </motion.div>
  )
}

function ModeComparisonView({ 
  comparison, 
  onSelectMode 
}: { 
  comparison: ModeComparison
  onSelectMode?: (mode: AgentMode) => void
}) {
  const [selectedMode, setSelectedMode] = useState<AgentMode | null>(null)
  const { t } = useLanguage()

  return (
    <div className="space-y-4">
      <div className="ae-card-gold p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="ae-label-gold">{t('databrain.simulation.recommendation')}</span>
        </div>
        <p className="text-sm text-[var(--ae-text)]">{comparison.recommendation.reasoning}</p>
        
        {comparison.recommendation.secondary && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-[var(--ae-text-muted)]">{t('databrain.simulation.secondary')}:</span>
            <span className="ae-mode-badge ae-mode-badge--active">
              {comparison.recommendation.secondary}
            </span>
          </div>
        )}
      </div>

      {comparison.combinedStrategy && (
        <div className="ae-card p-3">
          <span className="ae-label mb-2 block">{t('databrain.simulation.combinedStrategy')}</span>
          <p className="text-sm text-[var(--ae-text-dim)]">{comparison.combinedStrategy}</p>
        </div>
      )}

      <div className="grid gap-2">
        {comparison.results.map((result) => (
          <SimulationPreview
            key={result.mode}
            result={result}
            isSelected={selectedMode === result.mode}
            onClick={() => {
              setSelectedMode(result.mode)
              onSelectMode?.(result.mode)
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function FocusDashboard({ className = '', onModeSelect }: FocusDashboardProps) {
  const store = useAetherisStore()
  const simulation = useSimulation()
  const eventStream = useEventStream()
  const { t } = useLanguage()
  
  const [activeComparison, setActiveComparison] = useState<ModeComparison | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)

  // Track dashboard mount
  useEffect(() => {
    eventStream.track('focus_dashboard_opened', {})
  }, [])

  const runQuickSimulation = async (modes: AgentMode[]) => {
    setIsSimulating(true)
    eventStream.track('simulation_started', { modes })

    const startTime = Date.now()
    
    try {
      const result = await simulation.simulateModes(modes, {
        context: store.baselineMetrics 
          ? JSON.stringify(store.baselineMetrics)
          : '',
        query: 'Current strategic position analysis',
      })

      const duration = Date.now() - startTime
      eventStream.track('simulation_completed', { 
        modes, 
        duration,
        success: true 
      })

      setActiveComparison(result)
    } catch (error) {
      eventStream.track('simulation_failed', { 
        modes, 
        error: String(error) 
      })
    } finally {
      setIsSimulating(false)
    }
  }

  // Get top strategic vectors
  const topVectors = store.activeStrategicVectors
    .slice(0, 3)
    .sort((a, b) => 
      Math.abs(b.targetVelocity - b.currentVelocity) - 
      Math.abs(a.targetVelocity - a.currentVelocity)
    )

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--ae-text)]">
          {t('databrain.focusDashboard.title')}
        </h3>
        <button
          onClick={() => runQuickSimulation(['analysis', 'execution'])}
          disabled={isSimulating}
          className="ae-mode-badge hover:bg-[var(--ae-gold-wash)] transition-colors"
        >
          {isSimulating ? t('databrain.simulation.running') : t('databrain.simulation.run')}
        </button>
      </div>

      <div className="ae-gold-bar" />

      {/* Cognitive Load */}
      <CognitiveLoadMeter value={store.cognitiveLoadIndex} />

      {/* Active Alerts */}
      <AnimatePresence>
        {store.predictiveDriftAlerts.filter(a => !a.isResolved).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="ae-card border-red-500/30 bg-red-500/5 p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="ae-drift-badge">
                <span className="ae-drift-badge__pulse" />
                {t('databrain.alert.title')}
              </div>
              <span className="text-xs text-[var(--ae-text-muted)]">
                {store.predictiveDriftAlerts.filter(a => !a.isResolved).length} {t('databrain.alert.active')}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Strategic Vectors */}
      {topVectors.length > 0 && (
        <div className="space-y-2">
          <span className="ae-label">{t('databrain.strategicVectors.title')}</span>
          <div className="grid gap-2">
            {topVectors.map((vector) => (
              <FocusScoreCard
                key={vector.dimension}
                dimension={vector.dimension}
                score={Math.round(vector.currentVelocity)}
                trend={vector.currentVelocity >= vector.targetVelocity ? 'up' : 'down'}
                delta={Math.round(vector.targetVelocity - vector.currentVelocity)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Simulation Results */}
      <AnimatePresence mode="wait">
        {activeComparison && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="ae-chrome-bar my-4" />
            <ModeComparisonView
              comparison={activeComparison}
              onSelectMode={onModeSelect}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verbosity Indicator */}
      <div className="ae-card p-3 mt-4">
        <div className="flex items-center justify-between">
          <span className="ae-label">{t('databrain.responseStyle.label')}</span>
          <span className="text-xs text-[var(--ae-text-dim)]">
            {store.verbosityTier()}
          </span>
        </div>
      </div>
    </div>
  )
}

export default FocusDashboard
