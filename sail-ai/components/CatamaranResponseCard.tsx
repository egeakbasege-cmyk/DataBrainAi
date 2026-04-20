'use client'

import type { CatamaranResponse } from '@/types/chat'

interface CatamaranResponseCardProps {
  response: CatamaranResponse | null
  isStreaming?: boolean
}

export function CatamaranResponseCard({ response, isStreaming = false }: CatamaranResponseCardProps) {
  if (isStreaming || !response) {
    return (
      <div style={{
        background: '#FFFFFF',
        border: '1px solid rgba(212,175,55,0.2)',
        borderRadius: 14,
        padding: 24,
        textAlign: 'center',
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid rgba(212,175,55,0.2)',
          borderTop: '3px solid #D4AF37',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px',
        }} />
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: '#666' }}>
          Generating CATAMARAN analysis...
        </p>
      </div>
    )
  }

  const goldColor = '#D4AF37'
  
  // Safe access
  const title = response?.catamaranTitle || 'System Overhaul Plan'
  const summary = response?.executiveSummary || ''
  const marketGrowth = response?.marketGrowth || { trackTitle: '', actions: [], target: '' }
  const customerExperience = response?.customerExperience || { trackTitle: '', actions: [], target: '' }
  const unifiedStrategy = response?.unifiedStrategy || ''
  const thirtyDayTarget = response?.thirtyDayTarget || ''
  const greatestRisk = response?.greatestRisk || ''
  const confidenceIndex = response?.confidenceIndex ?? 0

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid rgba(212,175,55,0.2)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        height: 2,
        background: `linear-gradient(90deg, transparent, ${goldColor}, transparent)`,
      }} />
      
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(212,175,55,0.12)' }}>
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
        <h2 style={{
          fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontSize: '1.5rem',
          fontWeight: 600,
          color: '#1a1a1a',
          margin: '8px 0 0',
        }}>
          {title}
        </h2>
      </div>

      {/* Summary */}
      {summary && (
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: '#555', lineHeight: 1.6, margin: 0 }}>
            {summary}
          </p>
        </div>
      )}

      {/* Dual Tracks */}
      <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Market Growth */}
        <div style={{
          background: 'rgba(212,175,55,0.04)',
          border: `1px solid ${goldColor}30`,
          borderRadius: 10,
          padding: 16,
        }}>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: goldColor,
          }}>
            Market Growth
          </span>
          <h4 style={{
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontSize: '1.05rem',
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '6px 0 12px',
          }}>
            {marketGrowth.trackTitle || 'Market Track'}
          </h4>
          {(marketGrowth.actions || []).map((action, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.6)',
              border: `1px solid ${goldColor}15`,
              borderLeft: `3px solid ${goldColor}`,
              borderRadius: '0 6px 6px 0',
              padding: 10,
              marginBottom: 8,
            }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', fontWeight: 600, color: '#1a1a1a', margin: '0 0 4px' }}>
                {action?.action || 'Action'}
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#666', margin: 0 }}>
                {action?.impact || ''}
              </p>
            </div>
          ))}
          {marketGrowth.target && (
            <div style={{ marginTop: 12, padding: '8px 10px', background: `${goldColor}10`, borderRadius: 6 }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 600, color: goldColor }}>
                Target: {marketGrowth.target}
              </span>
            </div>
          )}
        </div>

        {/* Customer Experience */}
        <div style={{
          background: 'rgba(0,105,92,0.04)',
          border: '1px solid rgba(0,105,92,0.2)',
          borderRadius: 10,
          padding: 16,
        }}>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#00695C',
          }}>
            Customer Experience
          </span>
          <h4 style={{
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontSize: '1.05rem',
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '6px 0 12px',
          }}>
            {customerExperience.trackTitle || 'CX Track'}
          </h4>
          {(customerExperience.actions || []).map((action, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(0,105,92,0.15)',
              borderLeft: '3px solid #00695C',
              borderRadius: '0 6px 6px 0',
              padding: 10,
              marginBottom: 8,
            }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', fontWeight: 600, color: '#1a1a1a', margin: '0 0 4px' }}>
                {action?.action || 'Action'}
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#666', margin: 0 }}>
                {action?.impact || ''}
              </p>
            </div>
          ))}
          {customerExperience.target && (
            <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(0,105,92,0.1)', borderRadius: 6 }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 600, color: '#00695C' }}>
                Target: {customerExperience.target}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Unified Strategy */}
      {unifiedStrategy && (
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
              color: '#B8941F',
            }}>
              Unified Strategy
            </span>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#444', margin: '8px 0 0' }}>
              {unifiedStrategy}
            </p>
          </div>
        </div>
      )}

      {/* Bottom Info */}
      <div style={{ padding: '0 24px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12 }}>
        {thirtyDayTarget && (
          <div style={{ background: '#f8f8f8', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 6, padding: 12 }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>
              30-Day Target
            </span>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#333', margin: '6px 0 0' }}>
              {thirtyDayTarget}
            </p>
          </div>
        )}
        {greatestRisk && (
          <div style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.12)', borderRadius: 6, padding: 12 }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>
              Greatest Risk
            </span>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#444', margin: '6px 0 0' }}>
              {greatestRisk}
            </p>
          </div>
        )}
        <div style={{
          background: `linear-gradient(135deg, ${goldColor}15, ${goldColor}08)`,
          border: `1px solid ${goldColor}30`,
          borderRadius: 6,
          padding: 12,
          minWidth: 80,
          textAlign: 'center',
        }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.55rem', fontWeight: 700, color: '#B8941F', textTransform: 'uppercase' }}>
            Confidence
          </span>
          <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.4rem', fontWeight: 700, color: goldColor, margin: '4px 0 0' }}>
            {confidenceIndex}%
          </p>
        </div>
      </div>
    </div>
  )
}
