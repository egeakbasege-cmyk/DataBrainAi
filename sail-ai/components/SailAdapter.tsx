'use client'

/**
 * SAIL AI v2.1 — Dynamic Response Adapter (DRA)
 *
 * Renders streaming markdown text from the SAIL intent mode into
 * intent-appropriate UI segments:
 *   - creative  → serif prose, accent headings, visual first-moves list
 *   - technical → monospace code blocks, numbered steps, dark code theme
 *   - analytic  → data tables, benchmark bar charts (Recharts), metric callouts
 *
 * Designed to receive streamed text incrementally via the `text` prop.
 * Re-parses on every update — cheap since segments are plain string splits.
 */

import { useMemo } from 'react'
import type { SailIntent } from '@/lib/intent'
import { MRR_TIERS }       from '@/lib/intent'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

// ── Palette ───────────────────────────────────────────────────────────────────

const GOLD   = '#C9A96E'
const INK    = '#0C0C0E'
const MUTED  = '#71717A'
const LIGHT  = '#F4F4F5'

const INTENT_ACCENT: Record<SailIntent, string> = {
  scenario:  '#00C9B1',   // teal — simulation/predictive
  creative:  '#7C3AED',   // violet
  technical: '#0369A1',   // ocean blue
  analytic:  GOLD,        // gold
}

// ── Segment types ─────────────────────────────────────────────────────────────

type Segment =
  | { type: 'heading';    level: 2 | 3; text: string }
  | { type: 'paragraph';  text: string }
  | { type: 'bullet';     items: string[] }
  | { type: 'numbered';   items: string[] }
  | { type: 'code';       lang: string; code: string }
  | { type: 'table';      headers: string[]; rows: string[][] }
  | { type: 'mrr-chart' }
  | { type: 'blank' }

// ── Markdown → Segment parser ─────────────────────────────────────────────────

function parseMarkdown(text: string): Segment[] {
  const segments: Segment[] = []
  const lines = text.split('\n')

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || 'text'
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      segments.push({ type: 'code', lang, code: codeLines.join('\n') })
      continue
    }

    // Table (GitHub-flavoured)
    if (line.startsWith('|') && lines[i + 1]?.match(/^\|[-: |]+\|/)) {
      const headers = line.split('|').filter(Boolean).map(h => h.trim())
      i += 2 // skip separator row
      const rows: string[][] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i].split('|').filter(Boolean).map(c => c.trim()))
        i++
      }
      segments.push({ type: 'table', headers, rows })
      continue
    }

    // H2
    if (line.startsWith('## ')) {
      segments.push({ type: 'heading', level: 2, text: line.slice(3).trim() })
      i++
      continue
    }

    // H3
    if (line.startsWith('### ')) {
      segments.push({ type: 'heading', level: 3, text: line.slice(4).trim() })
      i++
      continue
    }

    // Bullet list — collect consecutive bullet lines
    if (line.match(/^[-*•]\s/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*•]\s/)) {
        items.push(lines[i].replace(/^[-*•]\s/, ''))
        i++
      }
      segments.push({ type: 'bullet', items })
      continue
    }

    // Numbered list
    if (line.match(/^\d+\.\s/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        items.push(lines[i].replace(/^\d+\.\s/, ''))
        i++
      }
      segments.push({ type: 'numbered', items })
      continue
    }

    // Blank line
    if (!line.trim()) {
      segments.push({ type: 'blank' })
      i++
      continue
    }

    // Paragraph
    segments.push({ type: 'paragraph', text: line.trim() })
    i++
  }

  return segments
}

// ── Inline markdown → spans (bold, italic, code) ──────────────────────────────

function InlineText({ text, color = INK }: { text: string; color?: string }) {
  // Split on **bold**, *italic*, `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ fontWeight: 700, color }}>{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={i} style={{ fontStyle: 'italic', color }}>{part.slice(1, -1)}</em>
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} style={{
              fontFamily:      'Menlo, Monaco, Consolas, monospace',
              fontSize:        '0.8em',
              background:      'rgba(0,0,0,0.06)',
              padding:         '0.1em 0.35em',
              borderRadius:    '3px',
              color:           '#1a1a2e',
            }}>
              {part.slice(1, -1)}
            </code>
          )
        }
        return <span key={i} style={{ color }}>{part}</span>
      })}
    </>
  )
}

// ── Segment renderers ─────────────────────────────────────────────────────────

function HeadingSegment({ seg, accent }: { seg: Extract<Segment, { type: 'heading' }>; accent: string }) {
  const isH2 = seg.level === 2
  return (
    <div style={{ marginTop: isH2 ? '1.75rem' : '1.25rem', marginBottom: '0.5rem' }}>
      <span style={{
        fontFamily:    'Inter, sans-serif',
        fontSize:      isH2 ? '0.7rem' : '0.65rem',
        fontWeight:    700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color:         accent,
        display:       'flex',
        alignItems:    'center',
        gap:           '0.4rem',
      }}>
        {isH2 && <span style={{ fontSize: '0.5rem' }}>◆</span>}
        {seg.text}
      </span>
    </div>
  )
}

function ParagraphSegment({ seg, intent }: { seg: Extract<Segment, { type: 'paragraph' }>; intent: SailIntent }) {
  return (
    <p style={{
      fontFamily:  intent === 'creative'
        ? 'Cormorant Garamond, Georgia, serif'
        : 'Inter, sans-serif',
      fontStyle:   intent === 'creative' ? 'italic' : 'normal',
      fontSize:    intent === 'creative' ? '1.05rem' : '0.9rem',
      lineHeight:  intent === 'creative' ? 1.65 : 1.6,
      color:       INK,
      margin:      '0.5rem 0',
    }}>
      <InlineText text={seg.text} />
    </p>
  )
}

function BulletSegment({ seg, accent }: { seg: Extract<Segment, { type: 'bullet' }>; accent: string }) {
  return (
    <ul style={{ margin: '0.5rem 0', paddingLeft: 0, listStyle: 'none' }}>
      {seg.items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', marginBottom: '0.375rem' }}>
          <span style={{ color: accent, fontSize: '0.5rem', marginTop: '0.45em', flexShrink: 0 }}>◆</span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', lineHeight: 1.5, color: INK }}>
            <InlineText text={item} />
          </span>
        </li>
      ))}
    </ul>
  )
}

function NumberedSegment({ seg, accent }: { seg: Extract<Segment, { type: 'numbered' }>; accent: string }) {
  return (
    <ol style={{ margin: '0.5rem 0', paddingLeft: 0, listStyle: 'none', counterReset: 'sail-counter' }}>
      {seg.items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <span style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:      '0.65rem',
            fontWeight:    700,
            color:         accent,
            background:    `${accent}18`,
            minWidth:      '1.5rem',
            height:        '1.5rem',
            borderRadius:  '2px',
            display:       'flex',
            alignItems:    'center',
            justifyContent:'center',
            flexShrink:    0,
            marginTop:     '0.1rem',
          }}>
            {i + 1}
          </span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', lineHeight: 1.55, color: INK }}>
            <InlineText text={item} />
          </span>
        </li>
      ))}
    </ol>
  )
}

function CodeSegment({ seg }: { seg: Extract<Segment, { type: 'code' }> }) {
  return (
    <div style={{
      margin:       '1rem 0',
      background:   '#0D1117',
      border:       '1px solid rgba(255,255,255,0.08)',
      borderRadius: '4px',
      overflow:     'hidden',
    }}>
      {seg.lang !== 'text' && (
        <div style={{
          padding:       '0.375rem 1rem',
          background:    'rgba(255,255,255,0.04)',
          borderBottom:  '1px solid rgba(255,255,255,0.06)',
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.65rem',
          fontWeight:    600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color:         'rgba(255,255,255,0.35)',
        }}>
          {seg.lang}
        </div>
      )}
      <pre style={{
        margin:     0,
        padding:    '1rem',
        overflowX:  'auto',
        fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
        fontSize:   '0.82rem',
        lineHeight: 1.65,
        color:      '#E6EDF3',
        whiteSpace: 'pre',
        WebkitOverflowScrolling: 'touch',
      }}>
        <code>{seg.code}</code>
      </pre>
    </div>
  )
}

function TableSegment({ seg, accent }: { seg: Extract<Segment, { type: 'table' }>; accent: string }) {
  return (
    <div style={{ margin: '1rem 0', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{
        width:          '100%',
        borderCollapse: 'collapse',
        fontFamily:     'Inter, sans-serif',
        fontSize:       '0.82rem',
        lineHeight:     1.5,
      }}>
        <thead>
          <tr>
            {seg.headers.map((h, i) => (
              <th key={i} style={{
                padding:       '0.5rem 0.875rem',
                textAlign:     'left',
                fontWeight:    700,
                fontSize:      '0.65rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color:         accent,
                borderBottom:  `2px solid ${accent}`,
                whiteSpace:    'nowrap',
                background:    `${accent}0a`,
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {seg.rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.025)' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding:      '0.5rem 0.875rem',
                  color:        INK,
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                }}>
                  <InlineText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MrrChartSegment() {
  const data = MRR_TIERS.map(t => ({
    name:   t.tier,
    growth: t.medianGrowth,
    churn:  t.medianChurn,
  }))

  return (
    <div style={{ margin: '1.25rem 0' }}>
      <div style={{ marginBottom: '0.5rem' }}>
        <span style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.65rem',
          fontWeight:    700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color:         GOLD,
        }}>
          MRR Tier Benchmarks · Growth vs Churn (%)
        </span>
      </div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontFamily: 'Inter', fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontFamily: 'Inter', fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ fontFamily: 'Inter', fontSize: 12, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 4 }}
              formatter={(val: number, name: string) => [`${val}%`, name === 'growth' ? 'Growth' : 'Churn']}
            />
            <Bar dataKey="growth" name="growth" radius={[2, 2, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={GOLD} fillOpacity={0.8} />
              ))}
            </Bar>
            <Bar dataKey="churn" name="churn" radius={[2, 2, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill="#EF4444" fillOpacity={0.55} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.375rem' }}>
        {[{ color: GOLD, label: 'Median Growth %/mo' }, { color: '#EF4444', label: 'Median Churn %/mo' }].map(({ color, label }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'Inter', fontSize: '0.68rem', color: MUTED }}>
            <span style={{ width: 10, height: 10, background: color, borderRadius: 2, opacity: 0.8, flexShrink: 0 }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Intent badge ──────────────────────────────────────────────────────────────

const INTENT_LABELS: Record<SailIntent, string> = {
  scenario:  'Scenario · Simulation',
  creative:  'Creative · Visionary',
  technical: 'Technical · Systems',
  analytic:  'Analytic · Data',
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  text:      string
  intent:    SailIntent
  streaming: boolean
}

export function SailAdapter({ text, intent, streaming }: Props) {
  const accent = INTENT_ACCENT[intent]

  const segments = useMemo(() => {
    // Inject MRR chart for analytic intent when text contains MRR keyword
    const parsed = parseMarkdown(text)
    const hasMrrRef = /\bmrr\b/i.test(text)
    if (intent === 'analytic' && hasMrrRef) {
      // Insert chart after first heading or at top
      const firstHeadIdx = parsed.findIndex(s => s.type === 'heading')
      const insertAt = firstHeadIdx >= 0 ? firstHeadIdx + 1 : 0
      parsed.splice(insertAt, 0, { type: 'mrr-chart' })
    }
    return parsed
  }, [text, intent])

  if (!text && streaming) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '1rem 0' }}>
        <span style={{ color: accent, fontSize: '0.5rem', animation: 'sail-pulse 1.2s ease-in-out infinite' }}>◆</span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: MUTED }}>
          SAIL is composing your {INTENT_LABELS[intent].split(' · ')[0].toLowerCase()} analysis…
        </span>
        <style>{`@keyframes sail-pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }`}</style>
      </div>
    )
  }

  return (
    <div>
      {/* Intent badge */}
      <div style={{
        display:       'flex',
        alignItems:    'center',
        gap:           '0.5rem',
        marginBottom:  '1rem',
        paddingBottom: '0.625rem',
        borderBottom:  `1px solid ${accent}25`,
      }}>
        <span style={{ color: accent, fontSize: '0.45rem' }}>◆</span>
        <span style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.62rem',
          fontWeight:    700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color:         accent,
        }}>
          SAIL · {INTENT_LABELS[intent]}
        </span>
        {streaming && (
          <span style={{
            marginLeft:    'auto',
            fontFamily:    'Inter, sans-serif',
            fontSize:      '0.6rem',
            color:         MUTED,
            animation:     'sail-pulse 1.2s ease-in-out infinite',
          }}>
            streaming
          </span>
        )}
      </div>

      {/* Rendered segments */}
      <div>
        {segments.map((seg, i) => {
          if (seg.type === 'blank')    return <div key={i} style={{ height: '0.5rem' }} />
          if (seg.type === 'heading')  return <HeadingSegment   key={i} seg={seg}  accent={accent} />
          if (seg.type === 'paragraph') return <ParagraphSegment key={i} seg={seg} intent={intent} />
          if (seg.type === 'bullet')   return <BulletSegment    key={i} seg={seg}  accent={accent} />
          if (seg.type === 'numbered') return <NumberedSegment  key={i} seg={seg}  accent={accent} />
          if (seg.type === 'code')     return <CodeSegment      key={i} seg={seg} />
          if (seg.type === 'table')    return <TableSegment     key={i} seg={seg}  accent={accent} />
          if (seg.type === 'mrr-chart') return <MrrChartSegment key={i} />
          return null
        })}
      </div>

      {/* Streaming cursor */}
      {streaming && text && (
        <span style={{
          display:    'inline-block',
          width:      '2px',
          height:     '1em',
          background: accent,
          marginLeft: '2px',
          verticalAlign: 'middle',
          animation:  'sail-cursor 0.8s step-end infinite',
        }} />
      )}
      <style>{`
        @keyframes sail-cursor { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes sail-pulse  { 0%,100%{opacity:0.3} 50%{opacity:1} }
      `}</style>
    </div>
  )
}
