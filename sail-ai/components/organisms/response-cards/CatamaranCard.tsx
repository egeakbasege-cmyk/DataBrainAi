'use client'

/**
 * components/organisms/response-cards/CatamaranCard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Catamaran mode — dual-track strategic comparison card.
 */

import React              from 'react'
import { AssistantCard }  from '@/components/molecules/AssistantCard'
import { GoldDivider }    from '@/components/atoms/GoldDivider'

interface Track {
  label:  string
  pros:   string[]
  cons:   string[]
  verdict?:string
}

interface CatamaranPayload {
  question?: string
  trackA?:   Track
  trackB?:   Track
  synthesis?: string
  rawText?:  string
}

interface CatamaranCardProps {
  payload:    CatamaranPayload
  className?: string
}

function TrackColumn({ track, accent }: { track: Track; accent: string }) {
  return (
    <div className="flex-1 min-w-0">
      <h4
        className="text-xs font-semibold uppercase tracking-wider mb-3 pb-2 border-b"
        style={{ color: accent, borderColor: `${accent}25` }}
      >
        {track.label}
      </h4>

      {track.pros.length > 0 && (
        <div className="mb-3">
          <p className="text-[9px] font-mono tracking-widest text-[var(--text-muted)] uppercase mb-1.5">Pros</p>
          <ul className="space-y-1">
            {track.pros.map((p, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]">
                <span className="text-green-400 flex-shrink-0">+</span>{p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {track.cons.length > 0 && (
        <div className="mb-3">
          <p className="text-[9px] font-mono tracking-widest text-[var(--text-muted)] uppercase mb-1.5">Cons</p>
          <ul className="space-y-1">
            {track.cons.map((c, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]">
                <span className="text-red-400 flex-shrink-0">−</span>{c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {track.verdict && (
        <div
          className="rounded-lg border px-2.5 py-1.5 text-xs italic"
          style={{ borderColor: `${accent}25`, color: accent }}
        >
          {track.verdict}
        </div>
      )}
    </div>
  )
}

export function CatamaranCard({ payload, className }: CatamaranCardProps) {
  if (payload.rawText && !payload.trackA) {
    return (
      <AssistantCard mode="catamaran" title="Dual-Track Analysis" className={className}>
        <p className="text-sm leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">
          {payload.rawText}
        </p>
      </AssistantCard>
    )
  }

  return (
    <AssistantCard
      mode="catamaran"
      title="Dual-Track Comparison"
      subtitle={payload.question}
      className={className}
    >
      <div className="flex gap-5">
        {payload.trackA && <TrackColumn track={payload.trackA} accent="#D97706" />}
        <div className="w-px bg-white/6 flex-shrink-0" />
        {payload.trackB && <TrackColumn track={payload.trackB} accent="#2563EB" />}
      </div>

      {payload.synthesis && (
        <>
          <GoldDivider glow={false} className="my-4 opacity-40" />
          <div>
            <p className="text-[9px] font-mono tracking-widest text-[var(--text-muted)] uppercase mb-2">Synthesis</p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{payload.synthesis}</p>
          </div>
        </>
      )}
    </AssistantCard>
  )
}
