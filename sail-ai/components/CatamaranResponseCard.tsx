'use client'

/**
 * CatamaranResponseCard
 *
 * Dual-track strategic overhaul visualization.
 * Displays Market Growth and Customer Experience tracks side by side
 * with unified strategy, 30-day target, and risk assessment.
 */

import { motion } from 'framer-motion'
import type { CatamaranResponse } from '@/types/chat'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface CatamaranResponseCardProps {
  response: CatamaranResponse | null
  isStreaming?: boolean
}

// ── Skeleton block ─────────────────────────────────────────────────────────────
function SkeletonLine({ width = '100%', height = 14, mb = 8 }: { width?: string; height?: number; mb?: number }) {
  return (
    <motion.div
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        width,
        height,
        background: 'rgba(212,175,55,0.15)',
        marginBottom: mb,
        borderRadius: 2,
      }}
    />
  )
}

function StreamingSkeleton() {
  return (
    <div style={{ padding: '24px' }}>
      <SkeletonLine width="60%" height={22} mb={16} />
      <SkeletonLine width="100%" height={14} mb={12} />
      <SkeletonLine width="90%" height={14} mb={24} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[0, 1].map(i => (
          <div key={i} style={{ border: '1px solid rgba(212,175,55,0.15)', padding: 16, borderRadius: 8 }}>
            <SkeletonLine width="70%" height={14} mb={12} />
            <SkeletonLine width="100%" height={10} mb={8} />
            <SkeletonLine width="100%" height={10} mb={8} />
            <SkeletonLine width="80%" height={10} mb={0} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Track Card Component ───────────────────────────────────────────────────────
interface TrackCardProps {
  title: string
  track: CatamaranResponse['marketGrowth']
  accentColor: string
  delay?: number
}

function TrackCard({ title, track, accentColor, delay = 0 }: TrackCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      style={{
        background: 'rgba(212,175,55,0.04)',
        border: `1px solid ${accentColor}30`,
        borderRadius: 10,
        padding: 16,
      }}
    >
      {/* Track Header */}
      <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${accentColor}20` }}>
        <span style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: accentColor,
        }}>
          {title}
        </span>
        <h4 style={{
          fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontSize: '1.05rem',
          fontWeight: 600,
          color: '#1a1a1a',
          margin: '6px 0 0',
          lineHeight: 1.3,
        }}>
          {track.trackTitle}
        </h4>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {track.actions.map((action, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.6)',
            border: `1px solid ${accentColor}15`,
            borderLeft: `3px solid ${accentColor}`,
            borderRadius: '0 6px 6px 0',
            padding: 10,
          }}>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#1a1a1a',
              margin: '0 0 4px',
              lineHeight: 1.4,
            }}>
              {action.action}
            </p>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.7rem',
              color: '#666',
              margin: '0 0 3px',
              lineHeight: 1.4,
            }}>
              {action.impact}
            </p>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.65rem',
              color: accentColor,
              margin: 0,
              fontWeight: 500,
            }}>
              {action.owner}
            </p>
          </div>
        ))}
      </div>

      {/* Target */}
      <div style={{
        marginTop: 12,
        padding: '8px 10px',
        background: `${accentColor}10`,
        borderRadius: 6,
      }}>
        <span style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.6rem',
          fontWeight: 600,
          color: accentColor,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          30-Day Target
        </span>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.75rem',
          color: '#444',
          margin: '4px 0 0',
          lineHeight: 1.4,
        }}>
          {track.target}
        </p>
      </div>
    </motion.div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function CatamaranResponseCard({
  response,
  isStreaming = false,
}: CatamaranResponseCardProps) {
  const { t } = useLanguage()
  const goldColor = '#D4AF37'
  const goldDark = '#B8941F'

  if (isStreaming || !response) {
    return (
      <div style={{
        background: '#FFFFFF',
        border: '1px solid rgba(212,175,55,0.2)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 2px 20px rgba(212,175,55,0.08)',
      }}>
        {/* Gold header line */}
        <div style={{
          height: 2,
          background: `linear-gradient(90deg, ${goldColor}00, ${goldColor}, ${goldColor}00)`,
        }} />
        <StreamingSkeleton />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(212,175,55,0.2)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 2px 20px rgba(212,175,55,0.08)',
      }}
    >
      {/* Gold header line */}
      <div style={{
        height: 2,
        background: `linear-gradient(90deg, ${goldColor}00, ${goldColor}, ${goldColor}00)`,
      }} />

      {/* Header */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(212,175,55,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: goldColor,
            padding: '3px 8px',
            background: 'rgba(212,175,55,0.1)',
            borderRadius: 4,
          }}>
            CATAMARAN
          </span>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.6rem',
            fontWeight: 600,
            color: '#999',
          }}>
            Dual-Track System Overhaul
          </span>
        </div>
        <h2 style={{
          fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontSize: '1.5rem',
          fontWeight: 600,
          color: '#1a1a1a',
          margin: 0,
          lineHeight: 1.3,
        }}>
          {response.catamaranTitle}
        </h2>
      </div>

      {/* Executive Summary */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.85rem',
          color: '#555',
          lineHeight: 1.6,
          margin: 0,
        }}>
          {response.executiveSummary}
        </p>
      </div>

      {/* Dual Tracks */}
      <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <TrackCard
          title="Market Growth"
          track={response.marketGrowth}
          accentColor={goldColor}
          delay={0.1}
        />
        <TrackCard
          title="Customer Experience"
          track={response.customerExperience}
          accentColor="#00695C"
          delay={0.2}
        />
      </div>

      {/* Unified Strategy */}
      <div style={{ padding: '0 24px 16px' }}>
        <div style={{
          background: 'rgba(212,175,55,0.06)',
          border: '1px solid rgba(212,175,55,0.15)',
          borderRadius: 8,
          padding: 14,
        }}>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: goldDark,
          }}>
            Unified Strategy
          </span>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.8rem',
            color: '#444',
            margin: '8px 0 0',
            lineHeight: 1.5,
          }}>
            {response.unifiedStrategy}
          </p>
        </div>
      </div>

      {/* Bottom Row: 30-Day Target, Risk, Confidence */}
      <div style={{
        padding: '0 24px 20px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr auto',
        gap: 12,
      }}>
        {/* 30-Day Target */}
        <div style={{
          background: '#f8f8f8',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 6,
          padding: 12,
        }}>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.58rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#888',
          }}>
            30-Day Target
          </span>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.75rem',
            color: '#333',
            margin: '6px 0 0',
            lineHeight: 1.4,
          }}>
            {response.thirtyDayTarget}
          </p>
        </div>

        {/* Greatest Risk */}
        <div style={{
          background: 'rgba(220,38,38,0.04)',
          border: '1px solid rgba(220,38,38,0.12)',
          borderRadius: 6,
          padding: 12,
        }}>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.58rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#dc2626',
          }}>
            Greatest Risk
          </span>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.75rem',
            color: '#444',
            margin: '6px 0 0',
            lineHeight: 1.4,
          }}>
            {response.greatestRisk}
          </p>
        </div>

        {/* Confidence Index */}
        <div style={{
          background: `linear-gradient(135deg, ${goldColor}15, ${goldColor}08)`,
          border: `1px solid ${goldColor}30`,
          borderRadius: 6,
          padding: 12,
          minWidth: 80,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.55rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: goldDark,
          }}>
            Confidence
          </span>
          <span style={{
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontSize: '1.4rem',
            fontWeight: 700,
            color: goldColor,
          }}>
            {response.confidenceIndex}%
          </span>
        </div>
      </div>
    </motion.div>
  )
}
