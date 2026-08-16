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

import { useMemo, useState, createContext, useContext } from 'react'
import type { SailIntent } from '@/lib/intent'
import { MRR_TIERS }       from '@/lib/intent'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

// ── Palette ───────────────────────────────────────────────────────────────────

const GOLD   = '#C9A96E'
const INK    = '#FFFFFF'
const MUTED  = 'rgba(255,255,255,0.55)'
const LIGHT  = 'rgba(255,255,255,0.08)'

// ── Sources context (passed from SailAdapter → InlineText for tooltips) ───────
interface ParsedSourceCtx { index: number; domain: string; snippet: string }
const SourcesCtx = createContext<ParsedSourceCtx[]>([])

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

// ── Citation tooltip badge ────────────────────────────────────────────────────

function CitationBadge({ num }: { num: number }) {
  const sources = useContext(SourcesCtx)
  const src     = sources.find(s => s.index === num)
  const [open, setOpen] = useState(false)

  return (
    <span
      style={{ position: 'relative', display: 'inline' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onTouchStart={() => setOpen(v => !v)}
    >
      <sup style={{
        fontFamily:    'var(--font-inter), sans-serif',
        fontSize:      '0.6em',
        fontWeight:    700,
        color:         GOLD,
        background:    'rgba(201,169,110,0.15)',
        border:        '1px solid rgba(201,169,110,0.35)',
        borderRadius:  '3px',
        padding:       '0 3px',
        marginLeft:    '1px',
        verticalAlign: 'super',
        lineHeight:    1,
        cursor:        src ? 'help' : 'default',
        userSelect:    'none',
      }}>
        {num}
      </sup>

      {open && src && (
        <span style={{
          position:    'absolute',
          bottom:      'calc(100% + 6px)',
          left:        '50%',
          transform:   'translateX(-50%)',
          zIndex:      999,
          width:       'max-content',
          maxWidth:    260,
          background:  'linear-gradient(135deg, rgba(20,24,40,0.98) 0%, rgba(8,9,13,0.98) 100%)',
          backdropFilter: 'blur(16px)',
          border:      '1px solid rgba(201,169,110,0.30)',
          borderRadius: 7,
          padding:     '7px 10px',
          boxShadow:   '0 8px 24px rgba(0,0,0,0.55)',
          pointerEvents: 'none',
        }}>
          {/* Arrow */}
          <span style={{
            position:    'absolute',
            top:         '100%',
            left:        '50%',
            transform:   'translateX(-50%)',
            width:       0,
            height:      0,
            borderLeft:  '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop:   '5px solid rgba(201,169,110,0.30)',
          }} />
          <span style={{
            display:    'block',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize:   '0.68rem',
            fontWeight: 600,
            color:      GOLD,
            marginBottom: '2px',
          }}>
            {src.domain}
          </span>
          {src.snippet && src.snippet !== src.domain && (
            <span style={{
              display:    'block',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize:   '0.63rem',
              color:      'rgba(255,255,255,0.65)',
              lineHeight: 1.45,
            }}>
              {src.snippet}
            </span>
          )}
        </span>
      )}
    </span>
  )
}

// ── Inline markdown → spans (bold, italic, code) ──────────────────────────────

function InlineText({ text, color = INK }: { text: string; color?: string }) {
  // Split on **bold**, *italic*, `code`, [n] citation refs, [text](url)
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[\d+\]|\[[^\]]+\]\([^)]+\))/g)

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
              fontFamily:   'Menlo, Monaco, Consolas, monospace',
              fontSize:     '0.8em',
              background:   'rgba(255,255,255,0.10)',
              padding:      '0.1em 0.35em',
              borderRadius: '3px',
              color:        '#E8C87A',
            }}>
              {part.slice(1, -1)}
            </code>
          )
        }
        // Citation marker: [1] [2] [3] → tooltip badge
        const citRef = part.match(/^\[(\d+)\]$/)
        if (citRef) {
          return <CitationBadge key={i} num={parseInt(citRef[1])} />
        }
        // Markdown link: [label](url)
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
        if (linkMatch) {
          return (
            <a
              key={i}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color,
                textDecoration:      'underline',
                textDecorationColor: `${color}55`,
                textUnderlineOffset: '2px',
              }}
            >
              {linkMatch[1]}
            </a>
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
        fontFamily:    'var(--font-inter), sans-serif',
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
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.875rem', lineHeight: 1.5, color: INK }}>
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
            fontFamily:    'var(--font-inter), sans-serif',
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
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.875rem', lineHeight: 1.55, color: INK }}>
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
          fontFamily:    'var(--font-inter), sans-serif',
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
        fontFamily:     'var(--font-inter), sans-serif',
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
            <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.04)' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding:      '0.5rem 0.875rem',
                  color:        INK,
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
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
          fontFamily:    'var(--font-inter), sans-serif',
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
            <XAxis dataKey="name" tick={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 12, background: 'rgba(12,14,20,0.95)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, color: '#FFFFFF' }}
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
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.68rem', color: MUTED }}>
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

// ── Source extraction ─────────────────────────────────────────────────────────
// Splits the AI response into clean body text + a structured sources list.
// The AI is instructed to append a `## Sources` block at the very end.
// Everything before that block is the main content; everything inside is parsed.

interface ParsedSource {
  index:   number
  domain:  string
  snippet: string
}

/** Strip all inline source noise from a body string */
function cleanBodyText(text: string): string {
  return text
    // ── Step 1: Markdown links [text](url) → keep label only (before URL strip) ──
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, '$1')

    // ── Step 2: Strip full "attribution phrase + URL + annotation" patterns ──────
    // "...according to https://example.com/page (no date available)."
    // "...as reported by https://... (no date available)."
    // These are the exact patterns seen in production — strip the whole tail
    .replace(/,?\s*(according to|as reported by|as stated by|as noted by|as suggested by|as recommended by|sourced from|cited in|per|via)\s+https?:\/\/[^\s,)>\]"']+(\s*\([^)]{0,120}\))?\.?/gi, '')

    // ── Step 3: Remaining bare URLs (any that weren't caught above) ─────────────
    .replace(/https?:\/\/[^\s,)>\]"']+/g, '')

    // ── Step 4: "(no date available)" / "(Date: ...)" / "(Reliability: ...)" ────
    .replace(/\s*\(no date available\)/gi, '')
    .replace(/\s*\(date\s*(?:unknown|unavailable|not available|n\/a)[^)]*\)/gi, '')
    .replace(/\s*\(Date:[^)]*\)/gi, '')
    .replace(/\s*\(Reliability:[^)]*\)/gi, '')
    .replace(/Reliability:\s*\d+%\.?/gi, '')

    // ── Step 5: Dangling attribution phrases left after URL removal ──────────────
    // "...savings, according to ." or "...savings, according to\n"
    .replace(/,?\s*(according to|as reported by|as stated by|as noted by|sourced from|cited in|per|via)\s*[.,]?\s*(?=[\n.)]|$)/gi, '')
    // "as X by" without URL — "as suggested by" etc. left hanging
    .replace(/,?\s+as (suggested|recommended|advised|noted|reported|stated|mentioned) by\s*[.,]?(?=\s|$)/gi, '')

    // ── Step 6: Parenthetical domain citations "(domain.com, date)" ─────────────
    .replace(/\s*\([a-zA-Z0-9._-]+\.[a-zA-Z]{2,}[^)]{0,80}\)/g, '')

    // ── Step 7: Reference markers ────────────────────────────────────────────────
    // NOTE: [1] [2] [3] citation numbers are KEPT — they render as gold superscripts
    // and match the numbered ## Sources block at the end of the response.
    .replace(/\[TRAINING EST[^\]]*\]/gi, '[est.]')
    .replace(/\[DATA UNAVAILABLE:[^\]]*\]/gi, '—')
    .replace(/\[STALE[^\]]*\]/gi, '')

    // ── Step 8: Whitespace / punctuation cleanup ─────────────────────────────────
    .replace(/ {2,}/g, ' ')
    .replace(/[,–—]\s*$/gm, '')
    .replace(/\.\s*\./g, '.')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Strip the ## Suggested Questions section from response text before display.
// ChatThread extracts the questions separately for the chip buttons.
function stripSuggestedQuestions(raw: string): string {
  return raw.replace(/\n{0,2}\s*##\s*Suggested Questions[\s\S]*$/i, '').trimEnd()
}

// Exported so ChatThread can extract questions from raw message.payload.text
export function extractSuggestedQuestions(raw: string): string[] {
  const match = raw.match(/##\s*Suggested Questions\s*\n([\s\S]*?)(?:\n##\s|\s*$)/i)
  if (!match) return []
  return match[1]
    .split('\n')
    .map(l => l.replace(/^[-*•\d.]\s*/, '').trim())
    .filter(l => l.length > 8 && l.length < 160)
    .slice(0, 3)
}

function extractSourcesBlock(raw: string): { body: string; sources: ParsedSource[] } {
  // Lenient match — catches all formats the AI produces:
  // "## Sources"  "## Sources:"  "## Kaynaklar"  "**Sources**"  "Sources:"  etc.
  const sourcesHeadRegex = /(?:^|\n)\s*(?:#{1,3}\s*\*{0,2}|\*{2})?(Sources?|References?|Kaynaklar?|Referanslar?|Quellen|Fuentes|Kaynakça)\*{0,2}:?\s*\n/im
  const match = sourcesHeadRegex.exec(raw)

  if (!match) {
    return { body: cleanBodyText(raw), sources: [] }
  }

  const body  = cleanBodyText(raw.slice(0, match.index))
  const block = raw.slice(match.index + match[0].length).trim()

  const sources: ParsedSource[] = []
  // Match: "1. https://domain.com ... — description"  or  "1. domain.com — description"
  const lineRegex = /^(?:\d+[.)]\s*|[-*•]\s*)(.+)$/gm
  let lineMatch: RegExpExecArray | null

  while ((lineMatch = lineRegex.exec(block)) !== null) {
    const line = lineMatch[1].trim()
    if (!line) continue

    // Extract domain from URL or bare domain token
    const urlMatch    = line.match(/https?:\/\/(?:www\.)?([a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/)
    const domainMatch = !urlMatch && line.match(/^(?:www\.)?([a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/)
    const domain = urlMatch
      ? urlMatch[1]
      : domainMatch
        ? domainMatch[1]
        : line.split(/\s*[—–\-]\s*/)[0].trim()

    // Snippet: everything after the first " — " or " - " separator
    const sepIdx = line.search(/\s+[—–\-]\s+/)
    const snippet = sepIdx >= 0 ? line.slice(sepIdx).replace(/^\s*[—–\-]\s*/, '').trim() : ''

    sources.push({ index: sources.length + 1, domain, snippet })
  }

  return { body, sources }
}

// ── Sources footer component ──────────────────────────────────────────────────

function SourcesFooter({ sources, accent }: { sources: ParsedSource[]; accent: string }) {
  if (!sources.length) return null
  return (
    <div style={{
      marginTop:  '1.25rem',
      paddingTop: '0.75rem',
      borderTop:  `1px solid ${accent}20`,
    }}>
      <p style={{
        fontFamily:    'var(--font-inter), sans-serif',
        fontSize:      '0.58rem',
        fontWeight:    700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color:         accent,
        margin:        '0 0 0.5rem',
        opacity:        0.8,
      }}>
        Sources
      </p>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {sources.map(src => (
          <li key={src.index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
            <span style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize:   '0.6rem',
              fontWeight: 700,
              color:      accent,
              flexShrink: 0,
              minWidth:   '1.1rem',
              opacity:    0.75,
            }}>
              {src.index}.
            </span>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.68rem', lineHeight: 1.5, color: 'rgba(255,255,255,0.55)' }}>
              <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.80)' }}>{src.domain}</span>
              {src.snippet && src.snippet !== src.domain && (
                <span> — {src.snippet}</span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  text:      string
  intent:    SailIntent
  streaming: boolean
}

export function SailAdapter({ text, intent, streaming }: Props) {
  const accent = INTENT_ACCENT[intent]

  const { segments, sources } = useMemo(() => {
    // Strip ## Suggested Questions block before rendering — it is extracted
    // separately by ChatThread for the follow-up chips and must not appear in
    // the visible response body.
    const textWithoutFollowUps = stripSuggestedQuestions(text)
    const { body, sources } = extractSourcesBlock(textWithoutFollowUps)
    const parsed    = parseMarkdown(body)
    const hasMrrRef = /\bmrr\b/i.test(body)
    if (intent === 'analytic' && hasMrrRef) {
      const firstHeadIdx = parsed.findIndex(s => s.type === 'heading')
      const insertAt     = firstHeadIdx >= 0 ? firstHeadIdx + 1 : 0
      parsed.splice(insertAt, 0, { type: 'mrr-chart' })
    }
    return { segments: parsed, sources }
  }, [text, intent])

  if (!text && streaming) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '1rem 0' }}>
        <span style={{ color: accent, fontSize: '0.5rem', animation: 'sail-pulse 1.2s ease-in-out infinite' }}>◆</span>
        <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.78rem', color: MUTED }}>
          SAIL is composing your {INTENT_LABELS[intent].split(' · ')[0].toLowerCase()} analysis…
        </span>
        <style>{`@keyframes sail-pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }`}</style>
      </div>
    )
  }

  return (
    <SourcesCtx.Provider value={sources}>
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
            fontFamily:    'var(--font-inter), sans-serif',
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
              fontFamily:    'var(--font-inter), sans-serif',
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
            if (seg.type === 'blank')     return <div key={i} style={{ height: '0.5rem' }} />
            if (seg.type === 'heading')   return <HeadingSegment   key={i} seg={seg}  accent={accent} />
            if (seg.type === 'paragraph') return <ParagraphSegment key={i} seg={seg}  intent={intent} />
            if (seg.type === 'bullet')    return <BulletSegment    key={i} seg={seg}  accent={accent} />
            if (seg.type === 'numbered')  return <NumberedSegment  key={i} seg={seg}  accent={accent} />
            if (seg.type === 'code')      return <CodeSegment      key={i} seg={seg} />
            if (seg.type === 'table')     return <TableSegment     key={i} seg={seg}  accent={accent} />
            if (seg.type === 'mrr-chart') return <MrrChartSegment  key={i} />
            return null
          })}
        </div>

        {/* Sources footer — compact list, only when streaming done and sources exist */}
        {!streaming && <SourcesFooter sources={sources} accent={accent} />}

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
    </SourcesCtx.Provider>
  )
}
